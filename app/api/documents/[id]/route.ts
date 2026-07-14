import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// DELETE /api/documents/:id — remove a document and its chunks (cascade).
// RLS ("documents: delete if uploader or admin") enforces who may do this.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { error } = await supabase.from("documents").delete().eq("id", params.id);
  if (error) return new NextResponse(error.message, { status: 400 });

  return NextResponse.json({ ok: true });
}
