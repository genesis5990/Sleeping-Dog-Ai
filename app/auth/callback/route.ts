import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles both PKCE (?code=...) and implicit/error flows from Supabase Auth.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error_description");

  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", error);
    return NextResponse.redirect(url);
  }

  if (code) {
    const supabase = createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      const url = new URL("/login", origin);
      url.searchParams.set("error", exchangeError.message);
      return NextResponse.redirect(url);
    }
  }

  // After successful exchange, decide whether to go to onboarding or the requested page.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // If the user has no workspace memberships yet, send them to onboarding.
    const { count } = await supabase
      .from("workspace_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (!count || count === 0) {
      return NextResponse.redirect(new URL("/onboarding", origin));
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
