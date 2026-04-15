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

    const { session_id } = await req.json()
    const apiKey = Deno.env.get('OPENROUTER_API_KEY')

    // 1. Fetch Session and Insights
    const { data: session } = await supabase.from('ag_sessions').select('*').eq('id', session_id).single()
    const { data: insights } = await supabase.from('ag_insights').select('*').eq('session_id', session_id)

    if (!session || !insights) throw new Error('Data not found')

    const payload = {
      project_name: session.project_name,
      problem_statement: session.problem_domain,
      sector: session.sector,
      insights: insights.map(i => ({ 
        text: i.raw_text, 
        dim: i.dimension, 
        stakeholder: i.stakeholder_tag,
        signal: i.signal 
      }))
    }

    // 2. Generate Synthesis Report
    const systemPrompt = `
      You are an expert Discovery Synthesis Agent. Your task is to analyze stakeholder discovery data and generate a structured report following these strict rules:

      PHASE 8 — MIND MAP GENERATION:
      Structure:
      - Center Node: The problem statement.
      - 6 Main Branches: WHO, WHAT, WHEN, WHERE, WHY, HOW.
      - Under each branch, create sub-branches (themes) consisting of 2-4 words max.
      - Leaf Nodes: Raw answers verbatim, tagged with stakeholder name and signal indicator (🔴 HIGH / 🟡 MEDIUM / 🟢 LOW).
      - Add 💡 emoji to leaf nodes in the HOW dimension (these indicate workarounds).

      PHASE 9 — INSIGHTS AND HYPOTHESES:
      Generate these sections:
      - TOP PROBLEMS: 3–5 most repeated or cross-stakeholder insights.
      - BOTTLENECKS: Where pain concentrates.
      - OPPORTUNITY GAPS: Unmet needs derived from HOW workarounds.
      - HYPOTHESES: 3–5 testable hypotheses ("If [root cause] is addressed, then [outcome] may improve").

      Return ONLY JSON:
      {
        "mind_map_md": "Markdown string using # for center, ## for dimensions, ### for themes, and - for leaf nodes",
        "top_problems": ["List of problems with evidence counts"],
        "bottlenecks": ["Concentration points"],
        "opportunity_gaps": ["Workaround -> Gap mapping"],
        "hypotheses": ["Testable hypotheses"]
      }
    `

    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this discovery data and return the JSON report: ${JSON.stringify(payload)}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    })

    const aiData = await aiRes.json()
    const result = JSON.parse(aiData.choices[0].message.content)

    // 3. Store Mind Map
    const { data: mindMapData, error } = await supabase
      .from('ag_mind_maps')
      .insert({
        session_id,
        project_id: session.project_id,
        team_id: session.team_id,
        generated_by: session.created_by,
        mind_map_md: result.mind_map_md,
        opportunity_gaps: result.opportunity_gaps || [],
        signal_summary: result.top_problems || [], // Repurposing signal_summary to store top problems
        total_insights: insights.length
      })
      .select()
      .single()

    if (error) throw error

    // Update session status
    await supabase.from('ag_sessions').update({ status: 'synthesis_ready' }).eq('id', session_id)

    return new Response(JSON.stringify(mindMapData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
