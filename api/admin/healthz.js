// Diagnostic endpoint — GET only, returns whether the server-side
// Supabase env vars are correctly configured and whether the service
// role key can actually read the database.
//
// Safe to call publicly: only reports presence + a public URL preview,
// never the keys themselves. Useful for confirming that an environment
// (production vs preview) has the right config without running a real
// signup that might leave partial data behind.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Use GET' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  const diag = {
    hasURL: !!supabaseUrl,
    hasServiceKey: !!serviceKey,
    // Show the project ref (the ID-looking prefix) so we can confirm
    // we're hitting the right Supabase project. The full URL is public
    // (it's baked into the frontend bundle), so this is not sensitive.
    urlPreview: supabaseUrl || null,
    serviceKeyLength: serviceKey ? serviceKey.length : 0,
    serviceKeyPrefix: serviceKey
      ? serviceKey.slice(0, 12) + '…' + serviceKey.slice(-4)
      : null,
    canConnect: false,
    connectError: null,
    inviteCodesReadable: null,
    inviteCodesReadError: null,
  }

  if (!supabaseUrl || !serviceKey) {
    return res.status(200).json(diag)
  }

  let supabase
  try {
    supabase = createClient(supabaseUrl, serviceKey)
    diag.canConnect = true
  } catch (e) {
    diag.connectError = e.message
    return res.status(200).json(diag)
  }

  // Try reading invite_codes — bypasses RLS with service role, so any
  // error here is a real auth/key/URL mismatch.
  try {
    const { error } = await supabase
      .from('invite_codes')
      .select('id', { count: 'exact', head: true })
    if (error) {
      diag.inviteCodesReadable = false
      diag.inviteCodesReadError = `${error.code || 'no-code'}: ${error.message}`
    } else {
      diag.inviteCodesReadable = true
    }
  } catch (e) {
    diag.inviteCodesReadable = false
    diag.inviteCodesReadError = `exception: ${e.message}`
  }

  return res.status(200).json(diag)
}
