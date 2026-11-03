import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role for reading all ratings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch all ratings from database
    const { data: ratingsData, error: ratingsError } = await supabase
      .from('ratings')
      .select('show_title, rating')
    
    if (ratingsError) throw ratingsError

    // 2. Fetch shows.json to get existing titles
    const showsResponse = await fetch('https://whizkidgrown.github.io/videobuddy/data/shows.json')
    const showsData = await showsResponse.json()
    const existingTitles = new Set(
      showsData.shows.map((s: any) => s.title.toLowerCase())
    )

    // Add rated titles to exclusion list
    ratingsData?.forEach((r: any) => {
      existingTitles.add(r.show_title.toLowerCase())
    })

    // 3. Organize ratings by type
    const loved = ratingsData?.filter(r => r.rating === 'loved').map(r => r.show_title) || []
    const okay = ratingsData?.filter(r => r.rating === 'okay').map(r => r.show_title) || []
    const disliked = ratingsData?.filter(r => r.rating === 'disliked').map(r => r.show_title) || []
    const notSeen = ratingsData?.filter(r => r.rating === 'not_seen').map(r => r.show_title) || []
    const notInterested = ratingsData?.filter(r => r.rating === 'not_interested').map(r => r.show_title) || []

    // 4. Build prompt for Gemini
    const prompt = `You are a TV show recommendation expert. Based on the user's viewing history, recommend new shows.

USER'S RATINGS:
Loved (❤️): ${loved.join(', ') || 'None yet'}
Okay (👍): ${okay.join(', ') || 'None yet'}
Disliked (👎): ${disliked.join(', ') || 'None yet'}
Not interested: ${notInterested.join(', ') || 'None'}
Not seen yet: ${notSeen.join(', ') || 'None'}

REQUIREMENTS:
- Recommend 5 "top picks" (highest confidence matches to their taste)
- Recommend 10 "have you seen these?" shows (broader discovery)
- Mix of US, Indian, and UK/Nordic titles
- Available on US streaming services (Netflix, Prime Video, Max, Hulu, Disney+, Apple TV+, Peacock, Paramount+, BritBox, ZEE5, Acorn TV, AMC+)
- EXCLUDE any title that already appears in their ratings or not_seen list above
- For each show provide: title, year, country, genres (array), streaming (comma-separated services), pitch (one compelling sentence why they'd like it), poster_url (if you know a valid TVmaze or TMDB URL, otherwise empty string)

Return ONLY valid JSON with this exact structure:
{
  "topPicks": [
    {
      "title": "Show Title",
      "year": 2024,
      "country": "US",
      "genres": ["Drama", "Thriller"],
      "streaming": "Netflix, Hulu",
      "pitch": "One-sentence pitch here",
      "poster_url": ""
    }
  ],
  "batch": [
    // 10 shows with same structure
  ]
}`

    // 5. Call Google Gemini API with fallback models
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured')
    }

    const models = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest']
    let responseText = null
    let lastError = null

    for (const model of models) {
      for (let retry = 0; retry < 2; retry++) {
        try {
          if (retry > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000)) // 2s delay before retry
          }

          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: prompt
                  }]
                }],
                generationConfig: {
                  temperature: 0.7,
                  topK: 40,
                  topP: 0.95,
                  maxOutputTokens: 16384,
                  responseMimeType: 'application/json'
                }
              })
            }
          )

          // Check for retryable errors
          if ([404, 429, 500, 503].includes(geminiResponse.status)) {
            const errorText = await geminiResponse.text()
            lastError = `${model}: ${geminiResponse.status} - ${errorText}`
            if (retry === 0) {
              continue // Retry this model
            } else {
              break // Move to next model
            }
          }

          if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text()
            throw new Error(`${model}: ${geminiResponse.status} - ${errorText}`)
          }

          const geminiData = await geminiResponse.json()
          responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

          if (responseText) {
            console.log(`Success with model: ${model}`)
            break // Success, exit retry loop
          }
        } catch (error) {
          lastError = error.message
          if (retry === 0) {
            continue // Retry
          }
        }
      }

      if (responseText) {
        break // Success, exit model loop
      }
    }

    if (!responseText) {
      throw new Error(lastError || 'All Gemini models failed')
    }

    // Parse JSON from response (strip ```json fences if present)
    let recommendations
    try {
      let jsonText = responseText.trim()
      
      // Strip markdown code fences (```json ... ``` or ``` ... ```)
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '')
      }
      
      recommendations = JSON.parse(jsonText.trim())
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', responseText.substring(0, 500))
      throw new Error('Failed to parse recommendations from Gemini')
    }

    // 6. Dedupe recommendations against existing titles (case-insensitive)
    const dedupeRecommendations = (shows: any[]) => {
      return shows.filter((show: any) => {
        const titleLower = show.title.toLowerCase()
        return !existingTitles.has(titleLower)
      })
    }

    const dedupedTopPicks = dedupeRecommendations(recommendations.topPicks || [])
    const dedupedBatch = dedupeRecommendations(recommendations.batch || [])

    // 7. Clear old suggestions and insert new ones
    await supabase.from('suggestions').delete().neq('title', '__impossible__')

    const insertData = [
      ...dedupedTopPicks.map((show: any) => ({
        title: show.title,
        kind: 'top',
        meta: show
      })),
      ...dedupedBatch.map((show: any) => ({
        title: show.title,
        kind: 'batch',
        meta: show
      }))
    ]

    if (insertData.length > 0) {
      const { error: insertError } = await supabase
        .from('suggestions')
        .insert(insertData)
      
      if (insertError) throw insertError
    }

    return new Response(
      JSON.stringify({
        success: true,
        topPicks: dedupedTopPicks.length,
        batch: dedupedBatch.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to generate recommendations'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
