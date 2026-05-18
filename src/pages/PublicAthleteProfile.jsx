import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import EastsideFCLogo from '../components/EastsideFC_Logo'
import {
  Play,
  GraduationCap,
  Trophy,
  Calendar,
  Share2,
  ExternalLink,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Film,
} from 'lucide-react'

/* ============================================================
   Public athlete profile — /p/:athleteId
   - Coach-facing page (NO auth required)
   - Shows name, position, grad, bio, Mux highlight reel, stats, target schools
   ============================================================ */

/** Load the Mux player web component from CDN (no npm needed) */
function useMuxPlayerCDN() {
  useEffect(() => {
    const id = 'mux-player-cdn'
    if (document.getElementById(id)) return
    const s = document.createElement('script')
    s.id = id
    s.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player'
    s.type = 'module'
    document.head.appendChild(s)
  }, [])
}

/** Inline player — Mux CDN web component, YouTube embed, or external link fallback */
function HighlightPlayer({ clip, overlayName, overlayPosition, overlayJersey }) {
  useMuxPlayerCDN()

  if (clip.mux_playback_id) {
    return (
      <div className="rounded-lg overflow-hidden border border-card-border relative" style={{ aspectRatio: '16 / 9', background: '#0a0e1a' }}>
        {/* Mux web component */}
        <mux-player
          playback-id={clip.mux_playback_id}
          start-time={String(clip.start_time || 0)}
          style={{ width: '100%', height: '100%' }}
          preload="metadata"
        />
        {/* CSS overlay — athlete name / position / jersey (NOT burned in) */}
        {(overlayName || clip.overlay_name || overlayPosition || clip.overlay_position) && (
          <div
            className="absolute bottom-0 left-0 right-0 px-4 py-3 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
          >
            <div className="text-white font-bold text-sm leading-tight">
              {overlayName || clip.overlay_name || ''}
              {(overlayJersey || clip.overlay_jersey)
                ? <span className="ml-1.5 font-normal opacity-80">#{overlayJersey || clip.overlay_jersey}</span>
                : null}
            </div>
            {(overlayPosition || clip.overlay_position) && (
              <div className="text-[11px] text-white/70 uppercase tracking-widest">
                {overlayPosition || clip.overlay_position}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // YouTube embed fallback
  const ytId = (() => {
    if (!clip.url) return null
    const m = clip.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/)
    return m ? m[1] : null
  })()

  if (ytId) {
    return (
      <div className="rounded-lg overflow-hidden border border-card-border" style={{ aspectRatio: '16 / 9' }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          title="Highlight reel"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
          style={{ border: 0 }}
        />
      </div>
    )
  }

  // External link fallback
  if (clip.url) {
    return (
      <a
        href={clip.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg overflow-hidden border border-card-border relative"
        style={{ aspectRatio: '16 / 9', background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0e1a 100%)' }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.95)' }}>
            <Play size={28} className="ml-0.5" style={{ color: '#0a0e1a', fill: '#0a0e1a' }} />
          </div>
        </div>
        <div className="absolute bottom-4 left-5 right-5">
          <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--crimson-3)' }}>
            Watch on {clip.source || 'external link'}
          </div>
        </div>
      </a>
    )
  }

  return (
    <div
      className="rounded-lg border border-dashed border-card-border text-center text-text-tertiary text-sm py-10 flex flex-col items-center gap-2"
      style={{ background: 'rgba(15,23,41,0.5)' }}
    >
      <Film size={24} />
      No reel uploaded yet.
    </div>
  )
}

export default function PublicAthleteProfile() {
  const { athleteId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [athlete, setAthlete] = useState(null)
  const [profile, setProfile] = useState(null)
  const [primaryHighlight, setPrimaryHighlight] = useState(null)
  const [muxClips, setMuxClips] = useState([])   // from highlight_videos table
  const [activeClipIndex, setActiveClipIndex] = useState(0)
  const [targetSchools, setTargetSchools] = useState([])
  const [org, setOrg] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!athleteId) {
      // Sync-with-external-state (URL param): no athleteId means there's no profile to fetch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('No athlete specified.')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        // Public profile reads go through SECURITY DEFINER RPCs created
        // in migration 048_public_profile_rpcs.sql. anon does NOT have
        // direct SELECT on profiles/athletes/highlights/highlight_videos
        // /athlete_milestones — those grants were revoked. The only
        // anon-accessible read paths to athlete data are these RPCs,
        // each of which explicitly enumerates a safe column projection.
        //
        // Excluded from every RPC body (per minors-privacy policy):
        // height, GPA, SAT, ACT, weight, intended major, raw stats,
        // pipeline strategy, outreach history, school notes, recruiting
        // activity. See migration 048 for the threat model.
        //
        // We fire the three reads in parallel — they're independent.
        const [profileRes, highlightsRes, legacyRes] = await Promise.all([
          supabase.rpc('get_public_athlete_profile',           { p_profile_id: athleteId }),
          supabase.rpc('get_public_athlete_highlights',        { p_athlete_id: athleteId }),
          supabase.rpc('get_public_athlete_primary_highlight', { p_athlete_id: athleteId }),
        ])

        if (profileRes.error) throw profileRes.error

        // RPCs that RETURN TABLE(...) come back as arrays — take the first row.
        const athleteRow = Array.isArray(profileRes.data) ? profileRes.data[0] : profileRes.data
        if (!athleteRow) {
          if (!cancelled) { setError('Profile not found.'); setLoading(false) }
          return
        }
        if (cancelled) return

        // Map RPC shape onto the legacy state variables so the rest of
        // the page renders unchanged. The RPC's `id` IS the user_id.
        setAthlete(athleteRow)
        setProfile({
          id: athleteRow.id,
          full_name: athleteRow.full_name,
          org_id: athleteRow.org_id,
        })
        // Org branding came inline from the same RPC — no second query.
        setOrg(athleteRow.org_name ? {
          name: athleteRow.org_name,
          slug: athleteRow.org_slug,
          primary_color: athleteRow.org_primary_color,
          secondary_color: athleteRow.org_secondary_color,
          logo_url: athleteRow.org_logo_url,
        } : null)

        // Mux reel — already filtered to status='ready' AND reel_order>0
        // inside the RPC.
        setMuxClips(Array.isArray(highlightsRes.data) ? highlightsRes.data : [])

        // Legacy primary-highlight fallback (YouTube/Hudl link).
        const legacy = Array.isArray(legacyRes.data) ? legacyRes.data[0] : legacyRes.data
        setPrimaryHighlight(legacy || null)

        // Target schools — INTENTIONALLY removed from the public profile.
        // Internal recruiting strategy ("which schools is this athlete
        // targeting") is private. If we ever want to surface a curated
        // subset the athlete chooses to feature, that's a separate
        // explicit-consent flow.
        setTargetSchools([])
      } catch (e) {
        console.error('Public profile load failed:', e)
        if (!cancelled) setError("Couldn't load this profile right now.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [athleteId])

  // ── Open Graph / Twitter meta tags ─────────────────────────────────
  useEffect(() => {
    if (!athlete || !profile) return

    // OG description: only fields the public view exposes. GPA, SAT, ACT,
    // weight, and intended major are deliberately not pulled — see
    // migration 045_public_profile_privacy.sql.
    const _fullName  = profile?.full_name || 'Athlete'
    const _position  = athlete.position || 'Player'
    const _gradYear  = athlete.class_year || ''
    const _hs        = athlete.high_school
    const _club      = athlete.club_team || org?.name || 'ECNL Club'
    const _bio       = athlete.bio || `${_fullName.split(' ')[0]} is a ${_gradYear} ${_position.toLowerCase()} with ${_club}.`

    const ogTitle    = `${_fullName} | ${_position} — KRS College Connect`
    const ogDesc     = [
      _gradYear ? `Class of ${_gradYear}` : null,
      _position,
      _hs || null,
      _club,
    ].filter(Boolean).join(' · ') + '. ' + _bio.slice(0, 120)

    const firstClip  = muxClips[0]
    const ogImage    = firstClip?.mux_playback_id
      ? `https://image.mux.com/${firstClip.mux_playback_id}/thumbnail.jpg?width=1200&height=630&fit_mode=smartcrop`
      : `${window.location.origin}/og-default.jpg`
    const ogUrl      = window.location.href
    const twitterCard = firstClip?.mux_playback_id ? 'player' : 'summary_large_image'

    const setMeta = (attrName, attrVal, content) => {
      let tag = document.querySelector(`meta[${attrName}="${attrVal}"]`)
      if (!tag) {
        tag = document.createElement('meta')
        tag.setAttribute(attrName, attrVal)
        document.head.appendChild(tag)
        tag.dataset.ogManaged = '1'
      }
      tag.setAttribute('content', content)
    }

    const prevTitle = document.title
    document.title = ogTitle

    setMeta('property', 'og:type',        'profile')
    setMeta('property', 'og:title',       ogTitle)
    setMeta('property', 'og:description', ogDesc)
    setMeta('property', 'og:image',       ogImage)
    setMeta('property', 'og:url',         ogUrl)
    setMeta('name',     'description',    ogDesc)
    setMeta('name',     'twitter:card',   twitterCard)
    setMeta('name',     'twitter:title',  ogTitle)
    setMeta('name',     'twitter:description', ogDesc)
    setMeta('name',     'twitter:image',  ogImage)

    if (twitterCard === 'player' && firstClip?.mux_playback_id) {
      setMeta('name', 'twitter:player',        `https://stream.mux.com/${firstClip.mux_playback_id}/high.mp4`)
      setMeta('name', 'twitter:player:width',  '1280')
      setMeta('name', 'twitter:player:height', '720')
    }

    return () => {
      document.title = prevTitle
      document.querySelectorAll('meta[data-og-managed]').forEach(el => el.remove())
    }
  }, [athlete, profile, org, muxClips])

  // Loading / error states
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-text-secondary text-sm">Loading…</div>
      </div>
    )
  }

  if (error || !athlete) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <EastsideFCLogo size={56} className="mx-auto mb-4 opacity-80" />
          <div className="display-font text-3xl text-white mb-2">Profile not found</div>
          <p className="text-text-secondary text-sm mb-6">
            {error || 'This recruiting profile may have been moved or is no longer public.'}
          </p>
          <Link to="/login" className="secondary-btn inline-flex items-center gap-2">
            Visit KRS College Connect <ExternalLink size={14} />
          </Link>
        </div>
      </div>
    )
  }

  // Derived fields. Height, GPA, SAT, ACT, weight, intended major are
  // intentionally NOT in the RPC return — they're not displayed on the
  // public profile under the minors-privacy policy. See migration 048.
  const fullName = profile?.full_name || 'Athlete'
  const firstName = fullName.split(' ')[0]
  const position = athlete.position || '—'
  const gradYear = athlete.class_year || '—'
  const jersey = athlete.jersey_number
  const foot = athlete.dominant_foot
  const club = athlete.club_team || org?.name || 'ECNL Club'
  const hs = athlete.high_school
  const bio = athlete.bio || `${firstName} is a ${gradYear} ${position.toLowerCase()} with ${club}.`

  // Determine what to show in the highlight section:
  // Prefer Mux clips (reel), fall back to legacy highlight
  const hasMuxReel = muxClips.length > 0
  const activeClip = hasMuxReel ? muxClips[activeClipIndex] : null

  // For legacy fallback, shape it like a clip object
  const legacyClip = primaryHighlight
    ? { url: primaryHighlight.url, source: primaryHighlight.source }
    : null

  const shareProfile = async () => {
    const url = window.location.href
    const shareData = {
      title: `${fullName} | ${position} — KRS College Connect`,
      text: `Check out ${fullName}'s soccer recruiting profile. Class of ${gradYear}, ${position.toLowerCase()} at ${club}.`,
      url,
    }
    // Use native share sheet on mobile (iOS/Android share to Messages, DMs, etc.)
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData)
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    // Desktop fallback: clipboard copy
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch { /* noop */ }
  }

  const initials = fullName.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Top brand bar */}
      <header className="border-b border-card-border" style={{ background: 'rgba(10,14,26,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EastsideFCLogo size={36} />
            <div className="leading-tight">
              <div className="display-font text-[14px] text-white tracking-[0.08em]">
                {org?.name || 'Eastside FC'}
              </div>
              <div className="text-[9px] text-text-tertiary uppercase tracking-[0.2em]">Recruiting profile</div>
            </div>
          </div>
          <button
            onClick={shareProfile}
            className="secondary-btn inline-flex items-center gap-2"
            style={{ fontSize: '12px', padding: '7px 14px' }}
          >
            {copied ? <><CheckCircle2 size={13} /> Link copied</> : <><Share2 size={13} /> Share</>}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
        {/* Hero */}
        <div className="hero-card crimson-glow-bg p-8 md:p-10">
          <div className="flex flex-wrap items-start gap-6 mb-6">
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center font-bold text-white text-3xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--crimson) 0%, #1B2A4A 100%)' }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
                <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>
                  Class of {gradYear} · {club}
                </span>
              </div>
              <h1 className="display-font text-[44px] md:text-[56px] text-white leading-[1.02] mb-1">{fullName}</h1>
              <div className="display-font text-xl md:text-2xl tracking-[0.06em]" style={{ color: 'var(--crimson-3)' }}>
                {position.toUpperCase()}{jersey ? ` · #${jersey}` : ''}
              </div>
              <div className="text-text-secondary text-sm mt-2">
                {[foot ? `${foot}-footed` : null, hs].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>
          <p className="text-text-secondary leading-relaxed max-w-3xl text-[15px]">{bio}</p>
        </div>

        {/* Quick stats — public-safe fields only (no GPA, no SAT/ACT, no
            weight). See migration 045_public_profile_privacy.sql for the
            full list of fields the public view exposes. */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Grad year', value: gradYear || '—', Icon: GraduationCap },
            { label: 'Position', value: position || '—', Icon: Trophy },
            { label: 'Club', value: club, Icon: Calendar },
          ].map((s) => (
            <div key={s.label} className="design-card p-4 md:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary font-bold">{s.label}</span>
                <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: 'rgba(200,16,46,0.12)' }}>
                  <s.Icon size={13} style={{ color: 'var(--crimson-3)' }} />
                </div>
              </div>
              <div className="display-font text-2xl md:text-3xl text-white leading-tight">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Highlight reel ─────────────────────────────────────────────── */}
        <div className="design-card p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="display-font text-lg text-white">Highlight reel</h2>
              <div className="text-[11px] uppercase tracking-widest text-text-tertiary mt-1">
                {hasMuxReel
                  ? `${muxClips.length} clip${muxClips.length > 1 ? 's' : ''} · Clip ${activeClipIndex + 1} of ${muxClips.length}`
                  : primaryHighlight
                    ? primaryHighlight.title || 'Primary reel'
                    : 'Not yet uploaded'}
              </div>
            </div>

            {/* Clip navigation (only for multi-clip Mux reels) */}
            {hasMuxReel && muxClips.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveClipIndex(i => Math.max(0, i - 1))}
                  disabled={activeClipIndex === 0}
                  className="p-1.5 rounded border border-card-border text-text-tertiary hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setActiveClipIndex(i => Math.min(muxClips.length - 1, i + 1))}
                  disabled={activeClipIndex === muxClips.length - 1}
                  className="p-1.5 rounded border border-card-border text-text-tertiary hover:text-white disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Player */}
          {hasMuxReel ? (
            <HighlightPlayer
              clip={activeClip}
              overlayName={profile?.full_name}
              overlayPosition={position}
              overlayJersey={jersey}
            />
          ) : legacyClip ? (
            <HighlightPlayer clip={legacyClip} />
          ) : (
            <div
              className="rounded-lg border border-dashed border-card-border text-center text-text-tertiary text-sm py-10 flex flex-col items-center gap-2"
              style={{ background: 'rgba(15,23,41,0.5)' }}
            >
              <Film size={24} />
              No reel uploaded yet.
            </div>
          )}

          {/* Clip thumbnail strip (for multi-clip reels) */}
          {hasMuxReel && muxClips.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {muxClips.map((clip, i) => (
                <button
                  key={clip.id}
                  onClick={() => setActiveClipIndex(i)}
                  className={`flex-shrink-0 w-20 h-12 rounded overflow-hidden border-2 transition ${
                    i === activeClipIndex ? 'border-crimson' : 'border-card-border opacity-60 hover:opacity-90'
                  }`}
                  style={i === activeClipIndex ? { borderColor: 'var(--crimson)' } : {}}
                  title={clip.title}
                >
                  <img
                    src={`https://image.mux.com/${clip.mux_playback_id}/thumbnail.jpg?width=80&height=48&fit_mode=smartcrop&time=${clip.start_time || 1}`}
                    alt={clip.title}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Two-column: academics + target schools */}
        <div className="grid md:grid-cols-2 gap-5">
          <div className="design-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-6" style={{ background: 'var(--crimson)' }} />
              <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>Profile</span>
            </div>
            <h3 className="display-font text-lg text-white mb-4">At a glance</h3>
            {/* GPA / SAT / ACT intentionally hidden on public view —
                coaches request academic detail through outreach reply.
                See migration 045_public_profile_privacy.sql. */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold">Class of</div>
                <div className="display-font text-2xl text-white mt-1">{gradYear || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold">Position</div>
                <div className="display-font text-2xl text-white mt-1">{position || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold">High school</div>
                <div className="text-white text-sm mt-1">{hs || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold">Club</div>
                <div className="text-white text-sm mt-1">{club}</div>
              </div>
            </div>
          </div>

          <div className="design-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-6" style={{ background: 'var(--crimson)' }} />
              <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>Target programs</span>
            </div>
            <h3 className="display-font text-lg text-white mb-4">
              {targetSchools.length > 0 ? `${targetSchools.length} programs on the list` : 'Building target list'}
            </h3>
            {targetSchools.length === 0 ? (
              <div className="text-text-tertiary text-sm italic">No target schools yet.</div>
            ) : (
              <div className="space-y-2">
                {targetSchools.slice(0, 6).map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-md transition hover:bg-navy-800">
                    <div
                      className="w-9 h-9 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                      style={{ background: s.primary_color || '#1e293b' }}
                    >
                      {(s.short_name || s.name).split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{s.name}</div>
                      <div className="text-[11px] text-text-tertiary">
                        {s.division} · {s.conference || '—'} · {s.state || '—'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Coach callout */}
        <div
          className="design-card p-6 md:p-7 relative overflow-hidden crimson-glow-bg"
          style={{ borderColor: 'rgba(200,16,46,0.35)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-6" style={{ background: 'var(--crimson)' }} />
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>For coaches</span>
          </div>
          <h3 className="display-font text-2xl text-white mb-2">Want to talk to {firstName}?</h3>
          <p className="text-text-secondary text-sm leading-relaxed max-w-2xl mb-4">
            Reply directly to {firstName}'s outreach email — replies land in their own inbox.
            Or contact the {club} college placement office for additional info.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={shareProfile} className="secondary-btn inline-flex items-center gap-2">
              <Share2 size={14} /> {copied ? 'Link copied' : 'Share this profile'}
            </button>
            {athlete.highlight_reel_url && (
              <a
                href={athlete.highlight_reel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="secondary-btn inline-flex items-center gap-2"
              >
                <Play size={14} /> Full reel
              </a>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8 pb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <EastsideFCLogo size={28} />
            <span className="text-xs text-text-tertiary tracking-widest uppercase">
              {org?.name || 'Eastside FC'} · est. 1970
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-text-tertiary">
            Powered by{' '}
            <Link to="/login" className="hover:text-white" style={{ color: 'var(--crimson-3)' }}>
              KRS College Connect
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
