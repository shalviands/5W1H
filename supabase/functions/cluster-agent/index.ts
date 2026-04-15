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

    // 1. Fetch unclustered insights
    const { data: insights, error: insightsError } = await supabase
      .from('ag_insights')
      .select('*')
      .eq('session_id', session_id)
      .is('cluster_id', null)

    if (insightsError) throw insightsError
    if (!insights || insights.length < 3) {
      return new Response(JSON.stringify({ message: 'Not enough insights to cluster' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Cluster using AI
    const systemPrompt = `
      You are a clustering agent. Group semantically related insights into "Themes".
      Each theme should have a clear name and a primary 5W1H dimension.
      Return ONLY JSON: { "clusters": [ { "theme": "string", "dimension": "WHO|WHAT...", "insight_ids": [] } ] }
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
          { role: 'user', content: `Cluster these insights: ${JSON.stringify(insights.map(i => ({ id: i.id, text: i.raw_text, dim: i.dimension })))}` }
        ],
        response_format: { type: "json_object" }
      })
    })

    const aiData = await aiRes.json()
    const { clusters } = JSON.parse(aiData.choices[0].message.content)

    // 3. Save Clusters and Update Insights
    for (const c of clusters) {
      const { data: cluster, error: clusterError } = await supabase
        .from('ag_clusters')
        .insert({
          session_id,
          project_id: insights[0].project_id,
          theme: c.theme,
          primary_dimension: c.dimension,
          signal: 'MEDIUM',
          evidence_count: c.insight_ids.length
        })
        .select()
        .single()

      if (clusterError) continue

      await supabase
        .from('ag_insights')
        .update({ cluster_id: cluster.id })
        .in('id', c.insight_ids)
    }

    return new Response(JSON.stringify({ success: true, clusters_count: clusters.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
