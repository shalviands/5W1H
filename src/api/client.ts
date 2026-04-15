import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase environment variables are missing!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const discoveryApi = {
  // Call intake-agent directly (no orchestrator middleman)
  invokeIntakeAgent: (
    session_id: string,
    user_message: string,
    stakeholder_tag: string,
    conversation_history: { role: string; content: string }[],
    covered_dimensions: string[],
    problem_statement: string
  ) =>
    supabase.functions.invoke('intake-agent', {
      body: {
        session_id,
        user_message,
        conversation_history,
        covered_dimensions,
        problem_statement,
        stakeholder_tag
      }
    }),

  // Legacy orchestrator (kept for reference / future use)
  invokeOrchestrator: (
    session_id: string,
    user_message: string,
    stakeholder_tag: string,
    history: any[],
    dimensions: string[],
    problem_statement: string
  ) =>
    supabase.functions.invoke('orchestrator', {
      body: {
        session_id,
        user_message,
        stakeholder_tag,
        history,
        dimensions,
        problem_statement
      }
    }),

  invokeSynthesis: (session_id: string) =>
    supabase.functions.invoke('synthesis-agent', {
      body: { session_id }
    }),

  invokeClustering: (session_id: string) =>
    supabase.functions.invoke('cluster-agent', {
      body: { session_id }
    }),

  deleteProject: (project_id: string, user_id?: string) =>
    supabase.functions.invoke('delete-project', {
      body: { project_id, user_id }
    })
};
