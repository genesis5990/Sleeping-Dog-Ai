import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/chat/threads — create a new chat thread in a workspace.
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { workspace_id, title, system_prompt } = (await req.json()) as {
    workspace_id?: string;
    title?: string;
    system_prompt?: string;
  };

  if (!workspace_id) {
    return new NextResponse("workspace_id required", { status: 400 });
  }

  const { data, error } = await supabase
    .from("chat_threads")
    .insert({
      workspace_id,
      created_by: user.id,
      title: title?.trim() || "New chat",
      system_prompt: system_prompt ?? null,
      model: process.env.RUNPOD_MODEL_NAME ?? null,
    })
    .select()
    .single();

  if (error) {
    return new NextResponse(error.message, { status: 400 });
  }

  return NextResponse.json(data);
}

// GET /api/chat/threads?workspace_id=...&archived=true|false — list threads.
// Defaults to non-archived threads if `archived` is omitted.
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const workspaceId = req.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) return new NextResponse("workspace_id required", { status: 400 });
  const archivedParam = req.nextUrl.searchParams.get("archived");

  let query = supabase
    .from("chat_threads")
    .select("id, workspace_id, created_by, title, model, system_prompt, archived_at, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false });

  if (archivedParam === "true") {
    query = query.not("archived_at", "is", null);
  } else if (archivedParam === "false" || archivedParam === null) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;
  if (error) return new NextResponse(error.message, { status: 400 });

  return NextResponse.json({ threads: data });
}
