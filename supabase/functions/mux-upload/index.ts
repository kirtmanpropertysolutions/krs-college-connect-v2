/**
 * supabase/functions/mux-upload/index.ts
 *
 * Lightweight Supabase Edge Function that proxies Mux API calls so the
 * MUX_TOKEN_SECRET never touches the frontend.
 *
 * Endpoints:
 *   POST /functions/v1/mux-upload
 *     Body: { title?: string }
 *     → Creates a Mux direct upload URL + a highlight_videos row in Supabase
 *     ← { upload_url, upload_id, db_id }
 *
 *   GET /functions/v1/mux-upload?upload_id=xxx&db_id=yyy
 *     → Checks Mux upload/asset status; updates DB when ready
 *     ← { status, mux_asset_id?, mux_playback_id?, duration? }
 *
 * Required secrets (set via `supabase secrets set`):
 *   MUX_TOKEN_ID
 *   MUX_TOKEN_SECRET
 *   SUPABASE_URL          (auto-set by Supabase)
 *   SUPABASE_SERVICE_ROLE_KEY (auto-set by Supabase)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MUX_TOKEN_ID = Deno.env.get('MUX_TOKEN_ID') ?? ''
const MUX_TOKEN_SECRET = Deno.env.get('MUX_TOKEN_SECRET') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Basic auth header for Mux API
const muxAuth = btoa(`${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

Deno.serve(async (req) => {
  // Pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const user = await getAuthUser(req)
  if (!user) return json({ error: 'Unauthorized' }, 401)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const url = new URL(req.url)

  // ── POST: create a new direct upload ────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({}))
    const title: string = body.title || 'Untitled Clip'

    // Ask Mux for a direct-upload URL
    const muxRes = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${muxAuth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        new_asset_settings: { playback_policy: ['public'] },
        cors_origin: '*',
      }),
    })

    if (!muxRes.ok) {
      const text = await muxRes.text()
      console.error('Mux upload creation failed:', text)
      return json({ error: 'Mux API error', detail: text }, 502)
    }

    const { data: muxUpload } = await muxRes.json()

    // Create the highlight_videos row (status = uploading)
    const { data: dbRow, error: dbErr } = await supabase
      .from('highlight_videos')
      .insert({
        athlete_id: user.id,
        mux_upload_id: muxUpload.id,
        title,
        status: 'uploading',
      })
      .select()
      .single()

    if (dbErr) {
      console.error('DB insert failed:', dbErr)
      return json({ error: 'Database error', detail: dbErr.message }, 500)
    }

    return json({
      upload_url: muxUpload.url,
      upload_id: muxUpload.id,
      db_id: dbRow.id,
    })
  }

  // ── GET: poll upload / asset status ─────────────────────────────────
  if (req.method === 'GET') {
    const uploadId = url.searchParams.get('upload_id')
    const dbId = url.searchParams.get('db_id')

    if (!uploadId || !dbId) {
      return json({ error: 'upload_id and db_id are required' }, 400)
    }

    // Fetch upload status from Mux
    const uploadRes = await fetch(`https://api.mux.com/video/v1/uploads/${uploadId}`, {
      headers: { Authorization: `Basic ${muxAuth}` },
    })

    if (!uploadRes.ok) {
      return json({ error: 'Failed to fetch upload from Mux' }, 502)
    }

    const { data: muxUpload } = await uploadRes.json()

    // If Mux has associated an asset, fetch it for richer status
    if (muxUpload.asset_id) {
      const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${muxUpload.asset_id}`, {
        headers: { Authorization: `Basic ${muxAuth}` },
      })

      if (assetRes.ok) {
        const { data: asset } = await assetRes.json()
        const playbackId = asset.playback_ids?.[0]?.id ?? null
        const isReady = asset.status === 'ready'

        if (isReady && playbackId) {
          // Update the DB row to ready
          await supabase
            .from('highlight_videos')
            .update({
              mux_asset_id: asset.id,
              mux_playback_id: playbackId,
              status: 'ready',
              duration: asset.duration ?? null,
            })
            .eq('id', dbId)
            .eq('athlete_id', user.id)

          return json({
            status: 'ready',
            mux_asset_id: asset.id,
            mux_playback_id: playbackId,
            duration: asset.duration ?? null,
          })
        }

        // Asset exists but still processing — update DB status
        await supabase
          .from('highlight_videos')
          .update({
            mux_asset_id: asset.id,
            status: 'processing',
          })
          .eq('id', dbId)
          .eq('athlete_id', user.id)

        return json({ status: 'processing', mux_asset_id: asset.id })
      }
    }

    // No asset yet — still uploading
    return json({ status: muxUpload.status ?? 'uploading' })
  }

  return json({ error: 'Method not allowed' }, 405)
})
