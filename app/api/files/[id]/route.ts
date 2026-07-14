import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "generated-files";
const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes — enough for a download click, not a permalink

// GET /api/files/:id — returns a short-lived signed download URL.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: file, error } = await supabase
    .from("generated_files")
    .select("storage_path, filename")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !file) return new NextResponse("File not found or access denied", { status: 404 });

  const { data: signed, error: signErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(file.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: file.filename,
    });

  if (signErr || !signed) {
    return new NextResponse(`Failed to create download link: ${signErr?.message ?? "unknown error"}`, {
      status: 500,
    });
  }

  return NextResponse.json({ url: signed.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS });
}

// DELETE /api/files/:id — removes the file from Storage and its metadata row.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: file, error: fetchErr } = await supabase
    .from("generated_files")
    .select("storage_path")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr || !file) return new NextResponse("File not found or access denied", { status: 404 });

  // Storage removal first — RLS on generated_files (delete if creator or admin)
  // still protects the metadata row even if this partially fails.
  await supabase.storage.from(BUCKET).remove([file.storage_path]);

  const { error: deleteErr } = await supabase.from("generated_files").delete().eq("id", params.id);
  if (deleteErr) return new NextResponse(deleteErr.message, { status: 400 });

  return NextResponse.json({ ok: true });
}
