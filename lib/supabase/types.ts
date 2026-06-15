// Mirrors the public schema on Sleeping Dog Ai (Supabase project kvwabkhnhskzzibddslw)
// Tables: profiles, workspaces, workspace_members
// Generate canonical types later with: supabase gen types typescript --project-id kvwabkhnhskzzibddslw

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatThread {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  model: string | null;
  system_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  workspace_id: string;
  role: ChatRole;
  content: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  model: string | null;
  created_at: string;
}
