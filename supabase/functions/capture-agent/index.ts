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

    const input = await req.json()
    const apiKey = Deno.env.get('OPENROUTER_API_KEY')

    const systemPrompt = `
      You are an expert insight categorization agent.
      Analyze the user's answer and the question that was asked.
      
      Extract:
      1. Dimension (WHO, WHAT, WHEN, WHERE, WHY, HOW)
      2. Signal (HIGH, MEDIUM, LOW) - Based on the depth and repetition of the insight.
      
      Return ONLY JSON:
      {
        "dimension": "WHAT",
        "signal": "MEDIUM"
      }
    `

    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Question: "${input.question_asked}"\nAnswer: "${input.raw_text}"` }
        ],
        response_format: { type: "json_object" }
      })
    })

    const aiData = await aiRes.json()
    const parsed = JSON.parse(aiData.choices[0].message.content)

    const insightData = {
      session_id: input.session_id,
      project_id: input.project_id || '00000000-0000-0000-0000-000000000000',
      team_id: input.team_id || '00000000-0000-0000-0000-000000000000',
      user_id: input.user_id,
      user_role: 'founder',
      stakeholder_tag: input.stakeholder_tag || 'Unknown',
      dimension: parsed.dimension || 'WHAT',
      question_asked: input.question_asked,
      raw_text: input.raw_text, // VERBATIM
      language: input.language_detected || 'en',
      signal: parsed.signal || 'LOW'
    }

    const { data, error } = await supabase
      .from('ag_insights')
      .insert(insightData)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
