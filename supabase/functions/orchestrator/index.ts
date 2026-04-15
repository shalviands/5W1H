import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { 
      session_id, 
      user_message, 
      stakeholder_tag, 
      history, 
      dimensions, 
      problem_statement 
    } = await req.json()

    // 1. Fetch Session to ensure existence (optional but safe)
    const { data: session } = await supabase
      .from('ag_sessions')
      .select('*')
      .eq('id', session_id)
      .single()

    if (!session) throw new Error('Session not found')

    // 2. Invoke Intake Agent
    const intakeResponse = await supabase.functions.invoke('intake-agent', {
      body: { 
        session_id, 
        user_message, 
        conversation_history: history || [],
        covered_dimensions: dimensions || [],
        problem_statement,
        stakeholder_tag
      }
    })

    if (intakeResponse.error) throw intakeResponse.error
    const { question, dimension_targeted } = intakeResponse.data

    // 3. Update Session State
    const updatedHistory = [
      ...(history || []),
      { role: 'user', content: user_message },
      { role: 'assistant', content: question }
    ]

    await supabase
      .from('ag_sessions')
      .update({
        conversation_history: updatedHistory,
        last_active_at: new Date().toISOString()
      })
      .eq('id', session_id)

    return new Response(
      JSON.stringify({ aiMessage: question, dimension_targeted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
