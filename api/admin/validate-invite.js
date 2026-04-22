// Server-side API route for validating invite codes
// This runs on Vercel serverless functions and can safely use the service role key

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  console.log('🎯 validate-invite: Handler started')

  if (req.method !== 'POST') {
    console.log('❌ validate-invite: Wrong method:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { inviteCode, userId } = req.body
    console.log('📥 validate-invite: Request data:', { inviteCode, userId })

    // Check environment variables
    console.log('🔧 validate-invite: Environment check:', {
      hasURL: !!process.env.VITE_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })

    // Create server-side Supabase client with service role key
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL?.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() // No VITE_ prefix - server only
    )
    console.log('🔗 validate-invite: Supabase client created')

    // Validate invite code
    console.log('🎫 validate-invite: Validating invite code:', inviteCode)
    const { data: invite, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode)
      .eq('active', true)
      .single()

    if (inviteError || !invite) {
      console.log('❌ validate-invite: Invalid invite code error:', inviteError)
      return res.status(400).json({ error: 'Invalid invite code' })
    }

    console.log('✅ validate-invite: Invite code found:', { id: invite.id, org_id: invite.org_id, uses: invite.uses, max_uses: invite.max_uses })

    // Check if invite code has uses left
    if (invite.max_uses && invite.uses >= invite.max_uses) {
      console.log('❌ validate-invite: Invite code exhausted')
      return res.status(400).json({ error: 'Invite code has reached maximum uses' })
    }

    // Check if invite code is expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      console.log('❌ validate-invite: Invite code expired')
      return res.status(400).json({ error: 'Invite code has expired' })
    }

    // Create or update org_member relationship (idempotent)
    console.log('👥 validate-invite: Creating org_members relationship')
    const { error: memberError } = await supabase
      .from('org_members')
      .upsert({
        org_id: invite.org_id,
        user_id: userId,
        role: 'athlete' // Default to athlete role
      }, {
        onConflict: 'org_id,user_id'
      })

    if (memberError) {
      console.error('❌ validate-invite: org_members upsert error:', memberError)
      return res.status(500).json({ error: 'Failed to create org membership', details: memberError.message })
    }
    console.log('✅ validate-invite: org_members relationship created/updated')

    // Create or update profile (idempotent)
    console.log('👤 validate-invite: Creating profile')
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        org_id: invite.org_id,
        role: 'athlete'
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('❌ validate-invite: profiles upsert error:', profileError)
      return res.status(500).json({ error: 'Failed to create profile' })
    }
    console.log('✅ validate-invite: profile created/updated')

    // Increment invite code usage
    console.log('📊 validate-invite: Incrementing invite code usage')
    await supabase
      .from('invite_codes')
      .update({ uses: invite.uses + 1 })
      .eq('id', invite.id)
    console.log('✅ validate-invite: Invite code usage updated')

    console.log('🎉 validate-invite: All steps completed successfully')
    return res.status(200).json({ success: true, orgId: invite.org_id })

  } catch (error) {
    console.error('💥 validate-invite: Unexpected error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}