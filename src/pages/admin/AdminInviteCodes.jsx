import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { Copy, Trash2, ToggleLeft, ToggleRight, Shuffle, Mail, Link2, CheckCircle2 } from 'lucide-react'

export default function AdminInviteCodes() {
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newCode, setNewCode] = useState({
    code: '',
    label: '',
    max_uses: 50
  })
  const [toast, setToast] = useState('')
  const [justCreated, setJustCreated] = useState(null)  // most-recent code, surfaced for sharing
  const [inviteModal, setInviteModal] = useState(null)  // { code, email, firstName } or null
  const [inviteSubmitting, setInviteSubmitting] = useState(false)

  // Signup URL for the current origin (works for localhost AND production)
  const signupUrl = (code) => `${window.location.origin}/signup?code=${encodeURIComponent(code)}`

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const loadInviteCodes = useCallback(async () => {
    try {
      // Get Eastside FC org ID
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'eastside-fc-wa')
        .single()

      if (!orgs) {
        console.error('Eastside FC organization not found')
        setLoading(false)
        return
      }

      const { data: codesData } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('org_id', orgs.id)
        .order('created_at', { ascending: false })

      setCodes(codesData || [])
    } catch (error) {
      console.error('Error loading invite codes:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Sync-with-external-state: load invite codes from Supabase on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInviteCodes()
  }, [loadInviteCodes])

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewCode({ ...newCode, code: result })
  }

  const createInviteCode = async () => {
    if (!newCode.code.trim()) {
      alert('Please enter a code')
      return
    }

    setCreating(true)
    try {
      // Get Eastside FC org ID
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'eastside-fc-wa')
        .single()

      if (!orgs) {
        throw new Error('Organization not found')
      }

      const { data, error } = await supabase
        .from('invite_codes')
        .insert({
          org_id: orgs.id,
          code: newCode.code.toUpperCase(),
          label: newCode.label || null,
          max_uses: parseInt(newCode.max_uses),
          uses: 0,
          active: true
        })
        .select()

      if (error) throw error

      // Surface the new code for immediate sharing (clears on next create)
      setJustCreated(data?.[0])

      // Reset form
      setNewCode({ code: '', label: '', max_uses: 50 })

      // Reload codes
      await loadInviteCodes()
      showToast('Invite code created — share it below.')
    } catch (error) {
      console.error('Error creating invite code:', error)
      showToast('Failed to create code: ' + error.message)
    } finally {
      setCreating(false)
    }
  }

  // --- Sharing helpers ---

  const copyToClipboard = async (text, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(`${label} ✓`)
    } catch (error) {
      console.error('Failed to copy:', error)
      showToast('Copy failed — select and copy manually')
    }
  }

  // Step 1: open the modal so the admin can fill in recipient + first name.
  // (We DON'T open Gmail yet — that'd open with an empty To field.)
  const openInviteModal = (code) => {
    setInviteModal({ code, email: '', firstName: '' })
  }

  // Step 2: validate inputs and open Gmail compose with To / Subject / Body
  // all pre-filled and personalized. Synchronous window.open pattern preserves
  // user-gesture context so the URL params aren't stripped by the browser.
  const submitInviteSend = () => {
    if (!inviteModal) return
    const { code, email, firstName } = inviteModal
    const cleanEmail = email.trim()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Enter a valid email address.')
      return
    }

    // Build the personalized body
    const greeting = firstName.trim() ? `Hi ${firstName.trim()},` : 'Hi,'
    const subject = `You're invited to join Eastside FC on KRS College Connect`
    const body = `${greeting}

You've been invited to join Eastside FC's recruiting platform.

1. Visit: ${signupUrl(code.code)}
2. Sign up with your email
3. Use this invite code: ${code.code}

Once you're in, you'll get access to your school pipeline, college coach contacts,
the School Fit Quiz, NIL deal opportunities, and tools to message coaches directly
from your own Gmail.

Reply to this email if you have any trouble signing up.

— Eastside FC College Placement`

    setInviteSubmitting(true)

    // Open the popup synchronously while we still have user-gesture context.
    const popup = window.open('about:blank', '_blank')
    if (!popup) {
      setInviteSubmitting(false)
      showToast('Pop-up blocked. Allow pop-ups for this site, then retry.')
      return
    }

    // We intentionally drop fs=1 so Gmail opens its lighter popup-style compose
    // rather than the heavy fullscreen view. tf=cm tells Gmail this is a new
    // compose request.
    const gmailUrl =
      'https://mail.google.com/mail/?view=cm&tf=cm' +
      '&to=' + encodeURIComponent(cleanEmail) +
      '&su=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body)
    popup.location.href = gmailUrl

    setInviteSubmitting(false)
    setInviteModal(null)
    showToast(`Opened Gmail with email to ${cleanEmail} — review and send.`)
  }

  const toggleCodeStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('invite_codes')
        .update({ active: !currentStatus })
        .eq('id', id)

      if (error) throw error

      await loadInviteCodes()
    } catch (error) {
      console.error('Error toggling code status:', error)
      alert('Failed to update code status')
    }
  }

  const deleteCode = async (id, code) => {
    if (!confirm(`Delete invite code "${code}"? This cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadInviteCodes()
    } catch (error) {
      console.error('Error deleting code:', error)
      alert('Failed to delete code')
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-6 right-6 z-50 design-card px-4 py-3 flex items-center gap-2 shadow-lg"
          style={{ borderColor: 'rgba(200,16,46,0.4)' }}
        >
          <CheckCircle2 size={16} style={{ color: 'var(--crimson-3)' }} />
          <span className="text-sm text-white">{toast}</span>
        </div>
      )}

      {/* Editorial header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>
            Onboarding
          </span>
        </div>
        <h1 className="display-font text-4xl text-white">Invite Codes</h1>
        <p className="text-text-secondary text-sm mt-1">Generate codes athletes use to sign up to your club.</p>
      </div>

      {/* Just-created share panel — pops above the form right after a code is created */}
      {justCreated && (
        <div
          className="design-card p-5 relative overflow-hidden"
          style={{
            borderColor: 'rgba(200,16,46,0.45)',
            background: 'linear-gradient(135deg, rgba(200,16,46,0.10) 0%, rgba(200,16,46,0.02) 60%, transparent 100%), #111827'
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>
              Code created — share it
            </span>
          </div>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <code className="text-white text-2xl font-mono font-bold bg-black/40 px-4 py-2 rounded border border-card-border">
              {justCreated.code}
            </code>
            {justCreated.label && (
              <span className="text-text-secondary text-sm">{justCreated.label}</span>
            )}
            <span className="text-text-tertiary text-xs">
              Up to {justCreated.max_uses} sign-ups
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openInviteModal(justCreated)}
              className="eastside-btn inline-flex items-center gap-2"
            >
              <Mail size={14} /> Send via Gmail
            </button>
            <button
              onClick={() => copyToClipboard(signupUrl(justCreated.code), 'Signup link copied')}
              className="secondary-btn inline-flex items-center gap-2"
            >
              <Link2 size={14} /> Copy signup link
            </button>
            <button
              onClick={() => copyToClipboard(justCreated.code, 'Code copied')}
              className="secondary-btn inline-flex items-center gap-2"
            >
              <Copy size={14} /> Copy code only
            </button>
            <button
              onClick={() => setJustCreated(null)}
              className="ml-auto text-xs text-text-tertiary hover:text-white px-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Create New Code */}
      <div className="design-card p-6">
        <h2 className="display-font text-lg text-white mb-1">Create new code</h2>
        <p className="text-[11px] uppercase tracking-widest text-text-tertiary mb-5">Each code is unique to your club</p>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-gray-400 text-sm mb-2">Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="EASTSIDE2026"
                  value={newCode.code}
                  onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                  className="flex-1 px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-eastside-crimson font-mono"
                />
                <button
                  onClick={generateRandomCode}
                  className="px-3 py-2 border border-gray-600 text-gray-400 rounded hover:border-eastside-crimson hover:text-eastside-crimson transition-colors"
                  title="Generate Random"
                >
                  <Shuffle size={16} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Label (optional)</label>
              <input
                type="text"
                placeholder="Spring 2026 cohort"
                value={newCode.label}
                onChange={(e) => setNewCode({ ...newCode, label: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-eastside-crimson"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm mb-2">Max Uses</label>
              <input
                type="number"
                min="1"
                value={newCode.max_uses}
                onChange={(e) => setNewCode({ ...newCode, max_uses: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white focus:outline-none focus:border-eastside-crimson"
              />
            </div>
          </div>

          <button
            onClick={createInviteCode}
            disabled={creating || !newCode.code.trim()}
            className="bg-eastside-crimson text-white px-6 py-2 rounded font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Code'}
          </button>
        </div>

        {/* All Codes */}
        <div className="space-y-4">
          <h2 className="text-white text-lg font-medium">ALL CODES</h2>

          {loading ? (
            <div className="design-card p-8 text-center text-gray-400">Loading codes...</div>
          ) : codes.length === 0 ? (
            <div className="design-card p-8 text-center">
              <p className="text-gray-400 text-sm">No codes yet. Create one above to start inviting athletes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {codes.map((code) => (
                <div key={code.id} className="design-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <code className="text-white text-lg font-mono font-medium bg-gray-800 px-3 py-1 rounded">
                          {code.code}
                        </code>
                        {code.label && (
                          <span className="text-gray-400 text-sm">{code.label}</span>
                        )}
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          code.active ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-400'
                        }`}>
                          {code.active ? 'Active' : 'Expired'}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-400">
                        <span>Uses: {code.uses || 0}/{code.max_uses}</span>
                        <span>Created: {formatDate(code.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Primary share action — open Gmail compose with templated invite */}
                      <button
                        onClick={() => openInviteModal(code)}
                        className="eastside-btn inline-flex items-center gap-2"
                        style={{ padding: '7px 12px', fontSize: '12px' }}
                        title="Send invite via Gmail"
                        disabled={!code.active}
                      >
                        <Mail size={13} /> Send
                      </button>

                      <button
                        onClick={() => copyToClipboard(signupUrl(code.code), 'Signup link copied')}
                        className="p-2 text-text-tertiary hover:text-white transition-colors"
                        title="Copy signup link"
                      >
                        <Link2 size={16} />
                      </button>

                      <button
                        onClick={() => copyToClipboard(code.code, 'Code copied')}
                        className="p-2 text-text-tertiary hover:text-white transition-colors"
                        title="Copy code only"
                      >
                        <Copy size={16} />
                      </button>

                      <button
                        onClick={() => toggleCodeStatus(code.id, code.active)}
                        className="p-2 text-text-tertiary hover:text-white transition-colors"
                        title={code.active ? 'Deactivate' : 'Activate'}
                      >
                        {code.active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      </button>

                      <button
                        onClick={() => deleteCode(code.id, code.code)}
                        className="p-2 text-text-tertiary hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Send invite modal — collects recipient before opening Gmail */}
      {inviteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setInviteModal(null)}
        >
          <div
            className="design-card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
              <span
                className="text-[10px] uppercase tracking-[0.22em] font-bold"
                style={{ color: 'var(--crimson)' }}
              >
                Send invite
              </span>
            </div>
            <h3 className="display-font text-2xl text-white mb-1">Who's it going to?</h3>
            <p className="text-text-secondary text-sm mb-5">
              We'll open Gmail with the invite pre-filled.
              Code: <span className="font-mono text-white">{inviteModal.code.code}</span>
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-text-tertiary text-xs uppercase tracking-widest font-bold mb-1.5">
                  Recipient email <span style={{ color: 'var(--crimson-3)' }}>*</span>
                </label>
                <input
                  type="email"
                  autoFocus
                  placeholder="parent@example.com"
                  value={inviteModal.email}
                  onChange={(e) => setInviteModal({ ...inviteModal, email: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && submitInviteSend()}
                  className="w-full px-3 py-2.5 bg-navy-800 border border-card-border rounded-md text-white placeholder-text-tertiary focus:outline-none focus:border-eastside-crimson"
                />
              </div>
              <div>
                <label className="block text-text-tertiary text-xs uppercase tracking-widest font-bold mb-1.5">
                  First name <span className="text-text-tertiary normal-case tracking-normal font-normal">(optional, personalizes the greeting)</span>
                </label>
                <input
                  type="text"
                  placeholder="Sarah"
                  value={inviteModal.firstName}
                  onChange={(e) => setInviteModal({ ...inviteModal, firstName: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && submitInviteSend()}
                  className="w-full px-3 py-2.5 bg-navy-800 border border-card-border rounded-md text-white placeholder-text-tertiary focus:outline-none focus:border-eastside-crimson"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setInviteModal(null)}
                className="secondary-btn"
                disabled={inviteSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={submitInviteSend}
                className="eastside-btn inline-flex items-center gap-2"
                disabled={inviteSubmitting}
              >
                <Mail size={14} /> Open Gmail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}