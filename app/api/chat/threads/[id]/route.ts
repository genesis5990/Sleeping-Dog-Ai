import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// PATCH /api/chat/threads/:id — archive or unarchive a thread.
// Body: { archived: boolean }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { archived } = (await req.json().catch(() => ({}))) as { archived?: boolean };
  if (typeof archived !== "boolean") {
    return new NextResponse("archived (boolean) is required", { status: 400 });
  }

  const { data, error } = await supabase
    .from("chat_threads")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", params.id)
    .select()
    .single();

  if (error) return new NextResponse(error.message, { status: 400 });
  return NextResponse.json(data);
}

// DELETE /api/chat/threads/:id — permanently delete a thread and its messages
// (chat_messages.thread_id has ON DELETE CASCADE). RLS ("chat_threads: delete
// if creator or admin") enforces who may do this.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { error } = await supabase.from("chat_threads").delete().eq("id", params.id);
  if (error) return new NextResponse(error.message, { status: 400 });

  return NextResponse.json({ ok: true });
}
