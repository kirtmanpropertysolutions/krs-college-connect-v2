import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Users, Activity, Megaphone, Library, ArrowUpRight, Calendar, Send, KeyRound } from 'lucide-react'
import { supabase } from '../../lib/supabase'

/**
 * Clickable stat card. The `to` prop turns the whole tile into a Link
 * that navigates to the relevant admin page. The card grows a faint
 * crimson border on hover to signal it's interactive — subtle, not
 * Fisher-Price clicky. If `to` is omitted the card renders as a
 * non-interactive div (kept around in case we want a future read-only
 * stat). Hoisted to module scope so React doesn't re-create the
 * component type on every render of AdminDashboard.
 */
function StatCard({ label, value, loading, Icon, sub, to }) {
  const inner = (
    <>
      <div className="flex items-start justify-between mb-3">
        <div className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary font-bold">
          {label}
        </div>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(200,16,46,0.12)' }}
        >
          <Icon size={15} style={{ color: 'var(--crimson-3)' }} />
        </div>
      </div>
      <div className="display-font text-3xl text-fg-primary leading-none">
        {loading ? '—' : value.toLocaleString()}
      </div>
      {sub && <div className="text-[11px] text-text-tertiary mt-2">{sub}</div>}
      {to && (
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] mt-3 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
             style={{ color: 'var(--crimson-3)' }}>
          View <ArrowUpRight size={10} />
        </div>
      )}
    </>
  )
  if (to) {
    return (
      <Link
        to={to}
        className="design-card p-5 relative overflow-hidden group block hover:border-red-700/40 transition-colors"
      >
        {inner}
      </Link>
    )
  }
  return (
    <div className="design-card p-5 relative overflow-hidden">
      {inner}
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalAthletes: 0,
    activeThisWeek: 0,
    announcementsSent: 0,
    contentItems: 0
  })
  const [athletes, setAthletes] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
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

      const orgId = orgs.id

      // Load stats. "Total Athletes" must EXCLUDE the admin (current user)
      // and any other non-athlete roles, otherwise the dashboard count won't
      // match the Athletes tab list. Filter by role='athlete' in both
      // queries so the numbers tell a consistent story.
      const [profilesResult, activeResult, announcementsResult, contentResult] = await Promise.all([
        supabase.from('profiles').select('id').eq('org_id', orgId).eq('role', 'athlete'),
        supabase.from('profiles').select('id').eq('org_id', orgId).eq('role', 'athlete').gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from('announcements').select('id').eq('org_id', orgId),
        supabase.from('content_library').select('id').eq('org_id', orgId)
      ])

      setStats({
        totalAthletes: profilesResult.data?.length || 0,
        activeThisWeek: activeResult.data?.length || 0,
        announcementsSent: announcementsResult.data?.length || 0,
        contentItems: contentResult.data?.length || 0
      })

      // Load recent athlete activity — same role='athlete' filter as the
      // count above so this section matches the Total Athletes number.
      //
      // The widget shows Name / Class+Position / Pipeline / Joined for
      // each athlete. Class+Position lives on the `athletes` table (one
      // row per user), and Pipeline is a count from the `pipelines`
      // table. None of those came across in the original single-table
      // profile query, which is why the dashboard rendered dashes for
      // every athlete even when the data was there. Three parallel
      // queries + a client-side merge gets us every column populated
      // in one round-trip group instead of N+1 lookups.
      const { data: athleteProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, created_at')
        .eq('org_id', orgId)
        .eq('role', 'athlete')
        .order('updated_at', { ascending: false })
        .limit(10)

      const profileIds = (athleteProfiles || []).map((p) => p.id)

      let athleteDetailsByUser = new Map()
      let pipelineCountByUser = new Map()
      if (profileIds.length > 0) {
        const [aDetailsRes, pipelineRes] = await Promise.all([
          supabase
            .from('athletes')
            .select('user_id, class_year, position')
            .in('user_id', profileIds),
          supabase
            .from('pipelines')
            .select('athlete_id')
            .in('athlete_id', profileIds),
        ])
        for (const row of aDetailsRes.data || []) {
          athleteDetailsByUser.set(row.user_id, row)
        }
        for (const row of pipelineRes.data || []) {
          pipelineCountByUser.set(
            row.athlete_id,
            (pipelineCountByUser.get(row.athlete_id) || 0) + 1
          )
        }
      }

      const merged = (athleteProfiles || []).map((p) => {
        const details = athleteDetailsByUser.get(p.id) || {}
        return {
          id: p.id,
          full_name: p.full_name,
          created_at: p.created_at,
          class_year: details.class_year || null,
          position: details.position || null,
          pipeline_count: pipelineCountByUser.get(p.id) || 0,
        }
      })

      setAthletes(merged)

      // Load recent announcements
      const { data: announcementData } = await supabase
        .from('announcements')
        .select('title, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(5)

      setAnnouncements(announcementData || [])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Sync-with-external-state: load dashboard metrics + recent activity from Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData()
  }, [loadDashboardData])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  // NOTE: App.jsx already wraps this page in <AdminLayout>, so we don't wrap
  // it again here (doing so would render two top navs stacked).
  return (
    <div className="space-y-8">
      {/* Editorial header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>
            Club Admin · 2025–26
          </span>
        </div>
        <h1 className="display-font text-4xl text-fg-primary">Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          Welcome back. Here's what's happening at your club this week.
        </p>
      </div>

      {/* Stats Grid — every tile is a Link so admins can drill into each
          number with one tap. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Athletes"
          value={stats.totalAthletes}
          loading={loading}
          Icon={Users}
          sub={stats.totalAthletes > 0 ? `${stats.activeThisWeek} active this week` : 'Invite to get started'}
          to="/admin/athletes"
        />
        <StatCard
          label="Active This Week"
          value={stats.activeThisWeek}
          loading={loading}
          Icon={Activity}
          sub="Last 7 days"
          to="/admin/athletes"
        />
        <StatCard
          label="Announcements Sent"
          value={stats.announcementsSent}
          loading={loading}
          Icon={Megaphone}
          sub="All time"
          to="/admin/announcements"
        />
        <StatCard
          label="Content Items"
          value={stats.contentItems}
          loading={loading}
          Icon={Library}
          sub="Library"
          to="/admin/announcements"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-5 gap-5">
        {/* Athlete Activity */}
        <div className="md:col-span-3">
          <div className="design-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="display-font text-lg text-fg-primary">Athlete activity</h2>
                <p className="text-[11px] uppercase tracking-widest text-text-tertiary mt-1">
                  Most recent
                </p>
              </div>
              <Link
                to="/admin/athletes"
                className="text-xs font-semibold flex items-center gap-1 hover:text-fg-primary transition-colors"
                style={{ color: 'var(--crimson-3)' }}
              >
                View all <ArrowUpRight size={12} />
              </Link>
            </div>

            {athletes.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-card-border rounded-lg">
                <Users size={28} className="mx-auto mb-3 text-text-tertiary" />
                <p className="text-text-secondary text-sm mb-4">
                  No athletes yet. Share an invite code to get started.
                </p>
                <Link to="/admin/invites" className="eastside-btn inline-flex items-center gap-2">
                  <KeyRound size={14} /> Go to Invite Codes
                </Link>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-4 gap-4 text-[10px] text-text-tertiary uppercase font-bold tracking-[0.12em] border-b border-card-border pb-2 mb-1">
                  <span>Name</span>
                  <span>Class</span>
                  <span>Pipeline</span>
                  <span className="text-right">Joined</span>
                </div>
                {athletes.map((athlete, index) => {
                  const initials = (athlete.full_name || 'A')
                    .split(' ')
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-4 gap-4 text-sm py-3 border-b border-card-border last:border-b-0 items-center"
                    >
                      <span className="text-fg-primary font-medium flex items-center gap-2.5">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                          style={{
                            background:
                              'linear-gradient(135deg, var(--crimson) 0%, var(--club-neutral-dark, #1B2A4A) 100%)'
                          }}
                        >
                          {initials}
                        </span>
                        <span className="truncate">{athlete.full_name || 'Unnamed'}</span>
                      </span>
                      {/* Class · Position. Renders only the parts present so
                          a partial profile (e.g. grad year set but position
                          blank) still shows what we have instead of an em-
                          dash. Falls through to '—' only when neither field
                          exists (athletes table row missing entirely). */}
                      <span className="text-text-secondary">
                        {athlete.class_year || athlete.position
                          ? [athlete.class_year, athlete.position].filter(Boolean).join(' · ')
                          : <span className="text-text-tertiary">—</span>}
                      </span>
                      {/* Pipeline count. Athletes with 0 schools in their
                          pipeline read as "0 schools" rather than a dash —
                          the recruiting head wants to spot the inactive
                          athletes at a glance. */}
                      <span className="text-text-secondary">
                        {athlete.pipeline_count > 0
                          ? `${athlete.pipeline_count} ${athlete.pipeline_count === 1 ? 'school' : 'schools'}`
                          : <span className="text-text-tertiary">0 schools</span>}
                      </span>
                      <span className="text-text-tertiary text-right">
                        {formatDate(athlete.created_at)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="md:col-span-2">
          <div className="design-card p-6 h-full">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="display-font text-lg text-fg-primary">Announcements</h2>
                <p className="text-[11px] uppercase tracking-widest text-text-tertiary mt-1">
                  Recent broadcasts
                </p>
              </div>
              <Link
                to="/admin/announcements"
                className="text-xs font-semibold flex items-center gap-1 hover:text-fg-primary transition-colors"
                style={{ color: 'var(--crimson-3)' }}
              >
                Send <ArrowUpRight size={12} />
              </Link>
            </div>

            {announcements.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-card-border rounded-lg">
                <Megaphone size={28} className="mx-auto mb-3 text-text-tertiary" />
                <p className="text-text-secondary text-sm mb-4">No announcements yet.</p>
                <Link to="/admin/announcements" className="eastside-btn inline-flex items-center gap-2">
                  <Send size={14} /> Send your first
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((announcement, index) => (
                  <div
                    key={index}
                    className="border-b border-card-border pb-3 last:border-b-0"
                  >
                    <div className="text-fg-primary text-sm font-medium">{announcement.title}</div>
                    <div className="text-text-tertiary text-xs mt-1 flex items-center gap-1.5">
                      <Calendar size={11} />
                      {formatDate(announcement.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-text-tertiary font-bold mb-3">
          Quick actions
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/announcements" className="eastside-btn inline-flex items-center gap-2">
            <Megaphone size={14} /> Send Announcement
          </Link>
          <Link to="/admin/invites" className="eastside-btn inline-flex items-center gap-2">
            <KeyRound size={14} /> Create Invite Code
          </Link>
          <Link to="/admin/athletes" className="secondary-btn inline-flex items-center gap-2">
            <Users size={14} /> View All Athletes
          </Link>
        </div>
      </div>
    </div>
  )
}