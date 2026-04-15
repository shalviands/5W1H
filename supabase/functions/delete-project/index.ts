import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../shared/cors.ts'

serve(async (req) => {
  // CORS handles preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { project_id, user_id: sender_id } = await req.json()

    // 1. Get User from JWT (if authenticated)
    let authenticatedUser = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const { data: { user } } = await supabase.auth.getUser(token);
        authenticatedUser = user;
      } catch (e) {
        // Not a valid Supabase JWT, likely a guest
      }
    }

    // 2. Fetch Project to check ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('created_by')
      .eq('id', project_id)
      .single()

    if (projectError || !project) throw new Error('Project not found');

    // 3. Permission Check
    // We allow deletion if:
    // a) Authenticated user matches created_by
    // b) sender_id matches created_by (for guests)
    const canDelete = (authenticatedUser && project.created_by === authenticatedUser.id) || 
                      (sender_id && project.created_by === sender_id);

    if (!canDelete) {
        throw new Error('You do not have permission to delete this project');
    }

    // 4. Cascading Delete
    // For better reliability without database-level changes, let's do sequential here
    const { data: sessions } = await supabase
      .from('ag_sessions')
      .select('id')
      .eq('project_id', project_id)
    
    const sessionIds = sessions?.map(s => s.id) || []

    if (sessionIds.length > 0) {
      await supabase.from('ag_insights').delete().in('session_id', sessionIds)
      await supabase.from('ag_clusters').delete().in('session_id', sessionIds)
    }
    
    await supabase.from('ag_mind_maps').delete().eq('project_id', project_id)
    await supabase.from('ag_sessions').delete().eq('project_id', project_id)
    
    const { error: finalError } = await supabase
      .from('projects')
      .delete()
      .eq('id', project_id)

    if (finalError) throw finalError

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Delete Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
