import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamChatCompletion, type RunpodChatMessage } from "@/lib/runpod";
import type { ChatMessage } from "@/lib/supabase/types";
import { retrieveRelevantChunks, formatContextBlock } from "@/lib/rag/retrieve";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  thread_id: string;
  content: string;
  temperature?: number;
  max_tokens?: number;
}

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  if (!body.thread_id || typeof body.content !== "string" || body.content.trim().length === 0) {
    return new Response("Missing thread_id or content", { status: 400 });
  }

  // Load the thread — RLS already enforces workspace membership.
  const { data: thread, error: threadErr } = await supabase
    .from("chat_threads")
    .select("id, workspace_id, system_prompt, model, title")
    .eq("id", body.thread_id)
    .maybeSingle();

  if (threadErr || !thread) {
    return new Response("Thread not found", { status: 404 });
  }

  const workspaceId = thread.workspace_id as string;

  // Persist the user message.
  const { error: insertUserErr } = await supabase.from("chat_messages").insert({
    thread_id: thread.id,
    workspace_id: workspaceId,
    role: "user",
    content: body.content,
  });
  if (insertUserErr) {
    return new Response(`Failed to persist message: ${insertUserErr.message}`, {
      status: 500,
    });
  }

  // Build the conversation history for the model.
  const { data: history } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true });

  const messages: RunpodChatMessage[] = [];
  if (thread.system_prompt) {
    messages.push({ role: "system", content: thread.system_prompt as string });
  }

  // RAG: retrieve Case Files chunks relevant to the latest user message and
  // inject them as an extra system message. Failure here is non-fatal —
  // retrieveRelevantChunks swallows its own errors and returns [] so chat
  // keeps working even if the embedding endpoint is down.
  const retrievedChunks = await retrieveRelevantChunks(supabase, workspaceId, body.content);
  const contextBlock = formatContextBlock(retrievedChunks);
  if (contextBlock) {
    messages.push({ role: "system", content: contextBlock });
  }

  for (const m of (history as Pick<ChatMessage, "role" | "content">[]) ?? []) {
    if (m.role === "user" || m.role === "assistant" || m.role === "system" || m.role === "tool") {
      messages.push({ role: m.role, content: m.content });
    }
  }

  // Auto-title the thread from the first user message if still default.
  if (thread.title === "New chat") {
    const suggested = body.content.trim().slice(0, 60);
    await supabase
      .from("chat_threads")
      .update({ title: suggested.length > 0 ? suggested : "New chat" })
      .eq("id", thread.id);
  }

  let upstream: Response;
  try {
    upstream = await streamChatCompletion(
      { messages, temperature: body.temperature, max_tokens: body.max_tokens },
      req.signal,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "RunPod request failed";
    return new Response(msg, { status: 500 });
  }

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => upstream.statusText);
    return new Response(`Upstream ${upstream.status}: ${errText}`, {
      status: 502,
    });
  }

  const supabaseRef = supabase;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(sse("start", { thread_id: thread.id })));

      const reader = upstream.body!.getReader();
      let buffer = "";
      let fullText = "";
      let promptTokens: number | null = null;
      let completionTokens: number | null = null;
      let modelUsed: string | null = null;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // OpenAI-compatible SSE: lines start with "data: " and end with "\n\n".
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              modelUsed = modelUsed ?? json.model ?? null;
              const delta: string | undefined =
                json?.choices?.[0]?.delta?.content ??
                json?.choices?.[0]?.message?.content;
              if (delta) {
                fullText += delta;
                controller.enqueue(encoder.encode(sse("delta", { content: delta })));
              }
              if (json?.usage) {
                promptTokens = json.usage.prompt_tokens ?? promptTokens;
                completionTokens = json.usage.completion_tokens ?? completionTokens;
              }
            } catch {
              // Ignore malformed chunks.
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "stream error";
        controller.enqueue(encoder.encode(sse("error", { message: msg })));
      }

      // Persist assistant message.
      if (fullText.length > 0) {
        await supabaseRef.from("chat_messages").insert({
          thread_id: thread.id,
          workspace_id: workspaceId,
          role: "assistant",
          content: fullText,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          model: modelUsed ?? (thread.model as string | null),
        });
      }

      controller.enqueue(
        encoder.encode(
          sse("done", {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            model: modelUsed,
            sources: retrievedChunks.map((c) => ({
              filename: c.filename,
              similarity: c.similarity,
              document_id: c.documentId,
            })),
          }),
        ),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
