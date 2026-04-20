// Server-side API route for validating invite codes
// This runs on Vercel serverless functions and can safely use the service role key

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { inviteCode, userId } = req.body

    // Create server-side Supabase client with service role key
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // No VITE_ prefix - server only
    )

    // Validate invite code
    const { data: invite, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode)
      .eq('active', true)
      .single()

    if (inviteError || !invite) {
      return res.status(400).json({ error: 'Invalid invite code' })
    }

    // Check if invite code has uses left
    if (invite.max_uses && invite.uses >= invite.max_uses) {
      return res.status(400).json({ error: 'Invite code has reached maximum uses' })
    }

    // Check if invite code is expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invite code has expired' })
    }

    // Create org_member relationship
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({
        org_id: invite.org_id,
        user_id: userId,
        role: 'athlete' // Default to athlete role
      })

    if (memberError) {
      return res.status(500).json({ error: 'Failed to create org membership' })
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        org_id: invite.org_id,
        role: 'athlete'
      })

    if (profileError) {
      return res.status(500).json({ error: 'Failed to create profile' })
    }

    // Increment invite code usage
    await supabase
      .from('invite_codes')
      .update({ uses: invite.uses + 1 })
      .eq('id', invite.id)

    return res.status(200).json({ success: true, orgId: invite.org_id })

  } catch (error) {
    console.error('Error validating invite:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}