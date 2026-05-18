import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/authContext'
import { Download, Search, MoreVertical, UserX, AlertCircle } from 'lucide-react'

export default function AdminAthletes() {
  // Pull the admin's org_id from useAuth instead of doing a separate
  // organizations lookup by slug. The slug-based lookup was fragile —
  // if it ever returned null (RLS, typo, deleted row) the whole page
  // would silently show "0 on roster". useAuth already has the org_id
  // resolved at sign-in time.
  const { profile } = useAuth()
  const orgId = profile?.org_id

  const [athletes, setAthletes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState('All Years')
  const [positionFilter, setPositionFilter] = useState('All Positions')
  const [loadError, setLoadError] = useState(null)  // surface query failures

  // Remove flow state
  const [removeTarget, setRemoveTarget] = useState(null)  // athlete row to remove
  const [removeConfirmText, setRemoveConfirmText] = useState('')
  const [removing, setRemoving] = useState(false)
  const [toast, setToast] = useState('')

  // Pagination
  const PAGE_SIZE = 25
  const [currentPage, setCurrentPage] = useState(1)

  /**
   * Load roster as two independent queries and merge in JS.
   *
   * Why two queries instead of PostgREST embedding?
   *   The athletes table has no foreign-key constraint pointing at
   *   profiles.id — athletes.user_id only references auth.users.
   *   PostgREST embedding (`profiles.select('*, athletes(...)')`) needs
   *   a same-schema FK to figure out the join and silently returns
   *   empty `athletes: []` arrays (or worse, a 400 in some clients)
   *   when none exists. Doing the merge in JS makes the join explicit
   *   and impossible to lose to a missing constraint.
   *
   * Also: we log row counts and any error at each step so future
   * "0 on roster but I have athletes" bugs surface immediately
   * in the browser console instead of failing silently.
   */
  const loadAthletes = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      if (import.meta.env.DEV) console.log('🏟️  AdminAthletes: loading roster for orgId =', orgId)

      // Step 1 — profiles in this org with role='athlete'
      const { data: profileRows, error: profileErr } = await supabase
        .from('profiles')
        .select('id, full_name, email, org_id, role, created_at, updated_at')
        .eq('org_id', orgId)
        .eq('role', 'athlete')
        .order('created_at', { ascending: false })

      if (profileErr) {
        console.error('AdminAthletes profile query error:', profileErr)
        setLoadError(`Couldn't load roster: ${profileErr.message}`)
        setAthletes([])
        return
      }
      if (import.meta.env.DEV) console.log(`🏟️  AdminAthletes: loaded ${profileRows?.length ?? 0} profile rows`)

      // Step 2 — athletes rows for those user_ids (separate query, no FK
      // embedding required). If no profiles, skip the round-trip.
      const userIds = (profileRows || []).map((p) => p.id)
      let athleteRows = []
      if (userIds.length > 0) {
        const { data: aRows, error: aErr } = await supabase
          .from('athletes')
          .select('user_id, position, class_year')
          .in('user_id', userIds)
        if (aErr) {
          // Non-fatal — show the roster without onboarding details.
          console.warn('AdminAthletes athletes query error (non-fatal):', aErr)
        } else {
          athleteRows = aRows || []
          if (import.meta.env.DEV) console.log(`🏟️  AdminAthletes: loaded ${athleteRows.length} athlete detail rows`)
        }
      }

      // Step 3 — merge. We keep the same shape (`athletes: [...]`) as the
      // old embedded-query result so the existing JSX render code works
      // unchanged.
      const byUser = new Map(athleteRows.map((a) => [a.user_id, a]))
      const merged = (profileRows || []).map((p) => ({
        ...p,
        athletes: byUser.has(p.id) ? [byUser.get(p.id)] : [],
      }))

      setAthletes(merged)
    } catch (error) {
      console.error('AdminAthletes unexpected error:', error)
      setLoadError(error?.message || 'Unknown error loading roster')
      setAthletes([])
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    // Sync-with-external-state: load roster from Supabase whenever the org changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (orgId) loadAthletes()
  }, [orgId, loadAthletes])

  /**
   * Remove an athlete from the club.
   *
   * Two-step soft removal — preserves the user's auth account and
   * recruiting data (highlights, pipeline, outreach) in case they're
   * ever re-invited:
   *   1. DELETE their org_members row — revokes their access to org data
   *   2. UPDATE profiles.org_id = NULL — removes them from the roster view
   *
   * Both writes are gated by the RLS policies added in migration 036:
   * only admins of the user's current org can execute either statement,
   * and admins can't accidentally move someone into a different org.
   */
  const removeAthlete = async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      // Revoke org access
      const { error: orgMemberErr } = await supabase
        .from('org_members')
        .delete()
        .eq('user_id', removeTarget.id)
        .eq('org_id', removeTarget.org_id)
      if (orgMemberErr) throw orgMemberErr

      // Drop them off the roster
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ org_id: null })
        .eq('id', removeTarget.id)
      if (profileErr) throw profileErr

      // Optimistic UI — remove the row locally without a full reload
      setAthletes((prev) => prev.filter((a) => a.id !== removeTarget.id))
      setToast(`${removeTarget.full_name || 'Athlete'} removed from the club.`)
      setRemoveTarget(null)
      setRemoveConfirmText('')
      // Auto-dismiss toast after 4s
      setTimeout(() => setToast(''), 4000)
    } catch (err) {
      console.error('Remove athlete error:', err)
      setToast(`Couldn't remove: ${err.message || 'unknown error'}`)
      setTimeout(() => setToast(''), 6000)
    } finally {
      setRemoving(false)
    }
  }

  // Derived filtered list — recomputed whenever athletes/filters change.
  // currentPage is reset to 1 from the filter onChange handlers (see below).
  const filteredAthletes = useMemo(() => {
    let filtered = athletes

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(athlete =>
        athlete.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        athlete.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Class year filter
    if (classFilter !== 'All Years') {
      filtered = filtered.filter(athlete =>
        athlete.athletes?.[0]?.class_year?.toString() === classFilter
      )
    }

    // Position filter
    if (positionFilter !== 'All Positions') {
      filtered = filtered.filter(athlete =>
        athlete.athletes?.[0]?.position === positionFilter
      )
    }

    return filtered
  }, [athletes, searchQuery, classFilter, positionFilter])

  // Derived page slice
  const totalPages = Math.max(1, Math.ceil(filteredAthletes.length / PAGE_SIZE))
  const pagedAthletes = filteredAthletes.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  const formatDate = (dateString) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const exportCSV = () => {
    const csvData = filteredAthletes.map(athlete => ({
      Name: athlete.full_name || '',
      Email: athlete.email || '',
      Position: athlete.athletes?.[0]?.position || '',
      'Class Year': athlete.athletes?.[0]?.class_year || '',
      'Date Joined': formatDate(athlete.created_at)
    }))

    const headers = ['Name', 'Email', 'Position', 'Class Year', 'Date Joined']
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eastside-fc-athletes-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const classYears = ['All Years', '2025', '2026', '2027', '2028', '2029', '2030', '2031']
  const positions = ['All Positions', 'Forward', 'Midfielder', 'Defender', 'Goalkeeper']

  return (
    <div className="space-y-6">
      {/* Editorial header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>
            Club Roster
          </span>
        </div>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="display-font text-4xl text-white">Athletes</h1>
            <p className="text-text-secondary text-sm mt-1">Every athlete in your club, searchable and exportable.</p>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold">On Roster</div>
            <div className="display-font text-3xl text-white">{loading ? '—' : athletes.length}</div>
          </div>
        </div>
      </div>

        {/* Filter Bar */}
        <div className="design-card p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                className="w-full pl-10 pr-4 py-2 bg-navy-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-eastside-crimson"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-4">
              <select
                value={classFilter}
                onChange={(e) => { setClassFilter(e.target.value); setCurrentPage(1) }}
                className="px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white focus:outline-none focus:border-eastside-crimson"
              >
                {classYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>

              <select
                value={positionFilter}
                onChange={(e) => { setPositionFilter(e.target.value); setCurrentPage(1) }}
                className="px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white focus:outline-none focus:border-eastside-crimson"
              >
                {positions.map(position => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>

              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-4 py-2 border border-gray-600 text-white rounded hover:border-eastside-crimson hover:text-eastside-crimson transition-colors"
              >
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Athletes Table */}
        <div className="design-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading athletes...</div>
          ) : loadError ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto mb-3 text-red-500" size={28} />
              <p className="text-red-400 text-sm mb-1">Couldn't load roster</p>
              <p className="text-gray-500 text-xs mb-4">{loadError}</p>
              <button
                onClick={loadAthletes}
                className="secondary-btn"
              >
                Try again
              </button>
            </div>
          ) : filteredAthletes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 text-sm mb-4">
                {athletes.length === 0
                  ? "No athletes yet. Share your invite code to get started."
                  : "No athletes match your current filters."
                }
              </p>
              {athletes.length === 0 && (
                <Link
                  to="/admin/invites"
                  className="inline-block bg-eastside-crimson text-white px-4 py-2 rounded text-sm font-medium hover:bg-opacity-90 transition-colors"
                >
                  Go to Invite Codes
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Table Header — 7 columns: name(2) + class + position + status + last active + actions */}
              <div className="hidden md:grid grid-cols-7 gap-4 p-4 border-b border-gray-700 text-xs text-gray-400 uppercase font-medium tracking-wider">
                <span className="col-span-2">Name</span>
                <span>Class</span>
                <span>Position</span>
                <span>Status</span>
                <span>Last Active</span>
                <span className="text-right">Actions</span>
              </div>

              {/* Table Body — current page only.
                  An athlete is "complete" when they have a row in the athletes
                  table (filled in their class year / position / etc). The
                  three phantom signups have profiles + org membership but no
                  athletes row, and we badge those clearly. */}
              <div className="divide-y divide-gray-700">
                {pagedAthletes.map((athlete) => {
                  const aRow = athlete.athletes?.[0]
                  const isIncomplete = !aRow
                  return (
                    <div
                      key={athlete.id}
                      className="grid grid-cols-2 md:grid-cols-7 gap-4 p-4 hover:bg-gray-800 transition-colors"
                    >
                      <div className="col-span-2">
                        <div className="text-white font-medium flex items-center gap-2">
                          {athlete.full_name || (
                            <span className="text-gray-500 italic">Unnamed signup</span>
                          )}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {athlete.email || (
                            <span className="text-gray-600">No email on file</span>
                          )}
                        </div>
                      </div>
                      <div className="text-gray-300 text-sm">
                        {aRow?.class_year || '—'}
                      </div>
                      <div className="text-gray-300 text-sm">
                        {aRow?.position || '—'}
                      </div>
                      <div>
                        {isIncomplete ? (
                          <span className="chip chip-amber inline-flex items-center gap-1">
                            <AlertCircle size={11} /> Setup incomplete
                          </span>
                        ) : (
                          <span className="chip chip-green">Active</span>
                        )}
                      </div>
                      <div className="text-gray-400 text-sm">
                        {formatDate(athlete.updated_at)}
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            setRemoveTarget(athlete)
                            setRemoveConfirmText('')
                          }}
                          className="tap-target text-gray-500 hover:text-red-500 transition-colors rounded-md"
                          title="Remove from club"
                          aria-label={`Remove ${athlete.full_name || 'this athlete'}`}
                        >
                          <UserX size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-700">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm border border-gray-600 rounded text-white disabled:opacity-30 hover:border-eastside-crimson hover:text-eastside-crimson transition-colors disabled:hover:border-gray-600 disabled:hover:text-white"
                  >
                    ← Prev
                  </button>
                  <span className="text-gray-400 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-600 rounded text-white disabled:opacity-30 hover:border-eastside-crimson hover:text-eastside-crimson transition-colors disabled:hover:border-gray-600 disabled:hover:text-white"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      {/* Results Count */}
      {!loading && (
        <div className="text-text-tertiary text-xs uppercase tracking-widest font-bold">
          Showing {Math.min(currentPage * PAGE_SIZE, filteredAthletes.length) - (currentPage - 1) * PAGE_SIZE} of {filteredAthletes.length} athletes
          {filteredAthletes.length !== athletes.length && ` (filtered from ${athletes.length})`}
        </div>
      )}

      {/* ===== Remove Confirmation Modal =====
          Two-step confirmation: admin must type the athlete's exact name
          (or "REMOVE" if the name is missing — phantom signups) before
          the destructive button enables. Prevents accidental clicks
          buried in a long roster. */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 p-4 animate-fadeIn">
          <div className="design-card max-w-md w-full p-6 animate-slide-up-soft">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-600/15 border border-red-600/30 flex items-center justify-center flex-shrink-0">
                <UserX size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="display-font text-xl text-white leading-tight">
                  Remove from club?
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                  {removeTarget.full_name || 'This signup'} will lose access to
                  the platform. Their recruiting data is preserved in case
                  they're re-invited later.
                </p>
              </div>
            </div>

            {/* Confirm-by-typing — protects against fat-fingers */}
            <div className="mb-5">
              <label className="form-label">
                Type <span className="text-red-500 font-mono">
                  {removeTarget.full_name || 'REMOVE'}
                </span> to confirm
              </label>
              <input
                type="text"
                value={removeConfirmText}
                onChange={(e) => setRemoveConfirmText(e.target.value)}
                className="form-input w-full"
                placeholder={removeTarget.full_name || 'REMOVE'}
                autoFocus
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRemoveTarget(null)
                  setRemoveConfirmText('')
                }}
                className="secondary-btn"
                disabled={removing}
              >
                Cancel
              </button>
              <button
                onClick={removeAthlete}
                disabled={
                  removing ||
                  removeConfirmText.trim() !== (removeTarget.full_name || 'REMOVE')
                }
                className="eastside-btn disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {removing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Toast =====
          Brief confirmation/error message. Auto-dismisses, no close button —
          intentionally cheap; for serious errors the modal stays open. */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 design-card px-4 py-3 text-sm text-white shadow-2xl animate-slide-up-soft">
          {toast}
        </div>
      )}
    </div>
  )
}