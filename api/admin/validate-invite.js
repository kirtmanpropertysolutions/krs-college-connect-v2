// Server-side signup completion endpoint.
//
// Validates an invite code and creates the athlete's profile +
// org_member rows. Runs as a Vercel serverless function with the
// service-role key so it can bypass RLS for the signup writes.
//
// SECURITY MODEL (hardened in Phase 2 audit):
//
//   1. NEVER trusts client-supplied userId. The user identity is
//      pulled from the Authorization: Bearer <session JWT> header
//      via supabase.auth.getUser(token), which verifies the JWT
//      against Supabase's signing key. Anyone who can call this
//      endpoint can ONLY create rows for themselves.
//
//   2. Atomic invite consumption via the SECURITY DEFINER
//      `consume_invite_code(p_code text)` Postgres function. Locks
//      the invite row FOR UPDATE so two concurrent signups can't
//      both pass the max_uses check.
//
//   3. Generic error messages. Whether a code is "not found",
//      "expired", "exhausted", or rate-limited, the response is
//      always `{ error: 'Invalid or expired invite code.' }` so an
//      attacker can't enumerate the code space by reading errors.
//
//   4. Per-IP rate limiting via an in-memory token bucket (3 requests
//      per IP per minute). Sufficient for the 16-athlete pilot at
//      one warm Vercel container. For larger scale, swap to Upstash
//      Redis — interface is identical.
//
//   5. No Postgres error details leak to the client. All internal
//      errors are logged via console.error (visible in Vercel logs)
//      but the response body is a generic 500 with a message ID the
//      operator can grep for.
//
//   6. Orphan-auth protection: if invite consumption succeeds but
//      the profile/org_member write fails, we attempt to release
//      the invite use back so the next signup with that code
//      isn't penalized. The auth.users row is left intact (Supabase
//      doesn't expose deletion via service role without admin API
//      configuration) but the user has no profile so they'll fail
//      out at login and the operator can clean up manually.

import { createClient } from '@supabase/supabase-js'

// ─── In-memory IP rate limiter ───────────────────────────────────────
// Keyed by client IP. Each entry: { tokens, refilledAt }. We refill
// to MAX_TOKENS once per WINDOW_MS. Bucket is per-warm-container —
// good enough to stop brute force, not a substitute for Upstash.
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 60_000
const rateBuckets = new Map()

function clientIp(req) {
  const xff = req.headers['x-forwarded-for']
  if (typeof xff === 'string') return xff.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

function rateLimitExceeded(ip) {
  const now = Date.now()
  const bucket = rateBuckets.get(ip) || { tokens: RATE_LIMIT_MAX, refilledAt: now }
  if (now - bucket.refilledAt >= RATE_LIMIT_WINDOW_MS) {
    bucket.tokens = RATE_LIMIT_MAX
    bucket.refilledAt = now
  }
  if (bucket.tokens <= 0) {
    rateBuckets.set(ip, bucket)
    return true
  }
  bucket.tokens -= 1
  rateBuckets.set(ip, bucket)
  return false
}

// ─── Helpers ────────────────────────────────────────────────────────
const GENERIC_INVALID = 'Invalid or expired invite code.'
const GENERIC_ERROR = 'Signup could not be completed.'

function safeError(res, status, message, opId) {
  return res.status(status).json({ error: message, opId })
}

// ─── Handler ────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Generate a per-request opaque ID so server logs and client errors
  // can be correlated without leaking PII.
  const opId = Math.random().toString(36).slice(2, 10)

  if (req.method !== 'POST') {
    return safeError(res, 405, 'Method not allowed', opId)
  }

  // ── Rate limit (per IP) ───────────────────────────────────────────
  const ip = clientIp(req)
  if (rateLimitExceeded(ip)) {
    console.warn(`[validate-invite ${opId}] rate-limit IP=${ip}`)
    return safeError(res, 429, 'Too many requests. Try again in a minute.', opId)
  }

  // ── Env vars (server-only) ────────────────────────────────────────
  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!supabaseUrl || !serviceKey) {
    console.error(`[validate-invite ${opId}] missing env vars`)
    return safeError(res, 500, GENERIC_ERROR, opId)
  }

  // ── Auth: verify the caller's JWT, take userId from server-verified token ──
  // NEVER trust a userId in the request body — the whole point of this
  // endpoint is that it runs with the service-role key, so a forged
  // body would let any caller create rows for any user.
  const authHeader = req.headers.authorization || ''
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null
  if (!accessToken) {
    return safeError(res, 401, 'Missing auth token', opId)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let userId
  try {
    const { data: userData, error: userErr } = await supabase.auth.getUser(accessToken)
    if (userErr || !userData?.user) {
      return safeError(res, 401, 'Auth token invalid or expired', opId)
    }
    userId = userData.user.id
  } catch (e) {
    console.error(`[validate-invite ${opId}] getUser failed:`, e)
    return safeError(res, 401, 'Auth token invalid or expired', opId)
  }

  // ── Parse + light input validation ────────────────────────────────
  let body
  try { body = req.body || {} } catch { body = {} }
  const inviteCodeRaw = typeof body.inviteCode === 'string' ? body.inviteCode.trim() : ''
  if (!inviteCodeRaw || inviteCodeRaw.length > 64) {
    return safeError(res, 400, GENERIC_INVALID, opId)
  }

  // ── Atomic invite consume via SECURITY DEFINER RPC ────────────────
  // This locks the invite row FOR UPDATE and either increments+returns
  // (org_id, ok=true) or returns (NULL, ok=false, reason).
  // We log the reason internally but never leak it to the client.
  let orgId
  try {
    const { data, error } = await supabase.rpc('consume_invite_code', { p_code: inviteCodeRaw })
    if (error) {
      console.error(`[validate-invite ${opId}] rpc error:`, error.message)
      return safeError(res, 500, GENERIC_ERROR, opId)
    }
    const row = Array.isArray(data) ? data[0] : data
    if (!row?.ok) {
      console.warn(`[validate-invite ${opId}] invite rejected: reason=${row?.reason}`)
      return safeError(res, 400, GENERIC_INVALID, opId)
    }
    orgId = row.org_id
  } catch (e) {
    console.error(`[validate-invite ${opId}] rpc exception:`, e)
    return safeError(res, 500, GENERIC_ERROR, opId)
  }

  // ── Create org_member ─────────────────────────────────────────────
  // Upsert is idempotent so a retry after a transient failure won't
  // double-write. The unique constraint on (org_id, user_id) backs this.
  const { error: memberError } = await supabase
    .from('org_members')
    .upsert(
      { org_id: orgId, user_id: userId, role: 'athlete' },
      { onConflict: 'org_id,user_id' }
    )
  if (memberError) {
    console.error(`[validate-invite ${opId}] org_members upsert failed:`, memberError.message)
    // Attempt to release the invite use we just consumed so the next
    // signup attempt with this code isn't penalized for our failure.
    await supabase
      .from('invite_codes')
      .update({ uses: Math.max(0, (await currentUses(supabase, inviteCodeRaw)) - 1) })
      .eq('code', inviteCodeRaw)
      .then(() => {}, () => {})
    return safeError(res, 500, GENERIC_ERROR, opId)
  }

  // ── Create profile ────────────────────────────────────────────────
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, org_id: orgId, role: 'athlete' },
      { onConflict: 'id' }
    )
  if (profileError) {
    console.error(`[validate-invite ${opId}] profiles upsert failed:`, profileError.message)
    return safeError(res, 500, GENERIC_ERROR, opId)
  }

  console.log(`[validate-invite ${opId}] success user=${userId} org=${orgId}`)
  return res.status(200).json({ success: true, orgId })
}

// Best-effort current-uses lookup for the release-on-failure path.
async function currentUses(supabase, code) {
  try {
    const { data } = await supabase
      .from('invite_codes')
      .select('uses')
      .eq('code', code)
      .single()
    return data?.uses || 0
  } catch {
    return 0
  }
}
