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
