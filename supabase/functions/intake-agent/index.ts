// supabase/functions/intake-agent/index.ts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-3-super:free',
  'google/gemma-3-27b-it:free',
  'openrouter/free',
  'anthropic/claude-sonnet-4-5'
]

async function callOpenRouter(messages: any[], modelIndex = 0): Promise<string> {
  if (modelIndex >= MODELS.length) {
    throw new Error('All models failed')
  }

  const model = MODELS[modelIndex]

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': Deno.env.get('APP_URL') ?? 'https://incubx.in',
        'X-Title': 'INCUBX Antigravity'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 300
      })
    })

    if (!response.ok) {
      console.error(`Model ${model} failed with status ${response.status}`)
      return callOpenRouter(messages, modelIndex + 1)
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error(`Model ${model} returned invalid response`, data)
      return callOpenRouter(messages, modelIndex + 1)
    }

    return data.choices[0].message.content

  } catch (err) {
    console.error(`Model ${model} threw error:`, err)
    return callOpenRouter(messages, modelIndex + 1)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()

    const {
      session_id,
      user_message,
      conversation_history = [],
      covered_dimensions = [],
      problem_statement = '',
      stakeholder_tag = 'User'
    } = body

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user_message) {
      return new Response(
        JSON.stringify({ error: 'user_message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Determine which dimension to ask about NEXT (mandatory sequence)
    const DIMENSION_ORDER = ['WHO', 'WHAT', 'WHEN', 'WHERE', 'WHY', 'HOW']
    const nextDimension = DIMENSION_ORDER.find(d => !covered_dimensions.includes(d)) || 'HOW'
    const remainingDimensions = DIMENSION_ORDER.filter(d => !covered_dimensions.includes(d))
    const progress = `${covered_dimensions.length}/6 dimensions covered`

    const systemPrompt = `You are a problem discovery assistant inside a startup incubation platform.

You are helping the user deeply understand this problem: "${problem_statement || user_message}"

You MUST cover ALL 6 dimensions of the 5W1H framework. This is MANDATORY. No dimension can be skipped.

The 6 dimensions are:
1. WHO — Who is affected? Who causes it? Who are the key people involved?
2. WHAT — What exactly is the problem? What happens? What are the symptoms?
3. WHEN — When does it happen? How often? Is it seasonal, daily, weekly?
4. WHERE — Where does it occur? What locations, contexts, environments?
5. WHY — Why does this happen? What is the root cause? Why do existing solutions fail?
6. HOW — How do people currently cope? What workarounds exist? How severe is the impact?

Progress: ${progress}
Dimensions already covered: ${covered_dimensions.length > 0 ? covered_dimensions.join(', ') : 'NONE — start with WHO'}
Dimensions remaining: ${remainingDimensions.join(', ')}

YOUR CURRENT TASK: Ask a question about the "${nextDimension}" dimension.

Rules you MUST follow:
- Ask ONLY ONE question at a time
- Your question MUST be about the "${nextDimension}" dimension specifically
- Keep the question short, simple, and conversational (1-2 sentences max)
- Build on what the user just said — reference their exact words
- Do NOT explain your process or mention the framework
- Do NOT say "Let me ask about WHO" or "Moving to the next dimension"
- Do NOT say "As an AI" or introduce yourself
- Do NOT ask multiple questions in one message
- Just ask the single most useful question about ${nextDimension}`

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation_history,
      { role: 'user', content: user_message }
    ]

    const question = await callOpenRouter(messages)

    // The dimension is explicitly determined by the mandatory sequence
    const dimension_targeted = nextDimension

    // Store the user's answer in ag_insights
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Get user from JWT
      const { data: { user } } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )

      if (user) {
        // Detect language
        const hindiPattern = /[\u0900-\u097F]/
        const hasHindi = hindiPattern.test(user_message)
        const hasEnglish = /[a-zA-Z]/.test(user_message)
        const language = hasHindi && hasEnglish ? 'mixed' : hasHindi ? 'hi' : 'en'

        await supabase.from('ag_insights').insert({
          session_id,
          user_id: user.id,
          user_role: 'founder',
          stakeholder_tag,
          dimension: dimension_targeted,
          raw_text: user_message,
          language,
          frequency: 1,
          signal: 'LOW'
        })
      }
    }

    return new Response(
      JSON.stringify({
        question,
        dimension_targeted,
        success: true
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('intake-agent error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
