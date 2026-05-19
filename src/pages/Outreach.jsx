import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/authContext'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getPipelineWithStats } from '../lib/pipelineWithStats'
import { timeAgo } from '../lib/timeAgo'
import { logActivity } from '../lib/activity'
import { Users, Mail, Copy, ExternalLink, CheckCircle2, AlertCircle, Clock, Trophy, Calendar as CalendarIcon } from 'lucide-react'
import AthleteLayout from '../components/AthleteLayout.jsx'
import SchoolBadge from '../components/SchoolBadge.jsx'
import { getSchoolColors, isLightColor } from '../lib/schoolColors'
import { resolveRecipient } from '../lib/outreachRecipient'

export default function Outreach() {
  const { user, profile } = useAuth()
  const userId = user?.id
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Tab management
  const [activeTab, setActiveTab] = useState('compose')

  // State for composer
  const [selectedCoach, setSelectedCoach] = useState(null)
  const [selectedSchool, setSelectedSchool] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showToast, setShowToast] = useState('')

  // Athlete profile data for template substitution
  const [athlete, setAthlete] = useState(null)

  // Data state
  const [coaches, setCoaches] = useState([])
  const [schools, setSchools] = useState([])
  const [templates, setTemplates] = useState([])
  const [pipelineWithStats, setPipelineWithStats] = useState([])
  const [outreachHistory, setOutreachHistory] = useState([])
  const [recentCoaches, setRecentCoaches] = useState([])
  // Admin announcements — read from the `announcements` table for the
  // athlete's org. Lives in the new INBOX tab. (The old INBOX tab was
  // mislabeled — it was actually outreach SENT history, which is now
  // renamed accordingly.)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState({ subject: '', body: '', hasMissing: false })

  const loadCoachFromCoachId = async (coachId, schoolName) => {
    try {
      // Fetch the specific coach
      const { data: coach } = await supabase
        .from('coaches')
        .select('*')
        .eq('id', coachId)
        .single()

      if (coach) {
        setSelectedCoach(coach)

        // Also fetch and set the school
        const { data: school } = await supabase
          .from('schools')
          .select('*')
          .eq('name', schoolName)
          .single()

        if (school) {
          setSelectedSchool(school)
        }
      }
    } catch (error) {
      console.error('Error loading coach from coach_id:', error)
    }
  }

  const preSelectSchoolByName = async (schoolName) => {
    try {
      const { data: school } = await supabase
        .from('schools')
        .select('*')
        .eq('name', schoolName)
        .single()

      if (school) {
        setSelectedSchool(school)

        // Check if this school has only one coach, auto-select it
        const { data: schoolCoaches } = await supabase
          .from('coaches')
          .select('*')
          .eq('school', schoolName)

        if (schoolCoaches && schoolCoaches.length === 1) {
          setSelectedCoach(schoolCoaches[0])
        }
      }
    } catch (error) {
      console.error('Error pre-selecting school:', error)
    }
  }

  const loadCoachFromParams = async (coachId, schoolId, programEmail) => {
    try {
      if (coachId && schoolId) {
        const { data: coach } = await supabase
          .from('coaches')
          .select('*, schools(name)')
          .eq('id', coachId)
          .single()

        const { data: school } = await supabase
          .from('schools')
          .select('*')
          .eq('id', schoolId)
          .single()

        if (coach && school) {
          setSelectedCoach(coach)
          setSelectedSchool(school)
        }
      } else if (schoolId) {
        const { data: school } = await supabase
          .from('schools')
          .select('*')
          .eq('id', schoolId)
          .single()

        if (school) {
          setSelectedSchool(school)

          if (programEmail) {
            const programCoach = {
              id: 'program',
              name: `${school.name} Recruiting`,
              email: programEmail,
              title: 'Recruiting Program',
              isProgramEmail: true
            }
            setSelectedCoach(programCoach)
          }
        }
      }
    } catch (error) {
      console.error('Error loading coach/school from params:', error)
    }
  }

  const handleUrlParams = useCallback(() => {
    const schoolParam = searchParams.get('school')
    const coachIdParam = searchParams.get('coach_id')

    if (schoolParam && coachIdParam) {
      // Direct coach + school from SchoolDetailModal
      setActiveTab('compose')
      loadCoachFromCoachId(coachIdParam, decodeURIComponent(schoolParam))
    } else if (schoolParam) {
      // Just school name - preselect school
      setActiveTab('compose')
      preSelectSchoolByName(decodeURIComponent(schoolParam))
    }

    // Legacy URL params (school_id based)
    const schoolId = searchParams.get('school_id')
    const programEmail = searchParams.get('program_email')

    if ((coachIdParam && schoolId) || schoolId || programEmail) {
      setActiveTab('compose')
      loadCoachFromParams(coachIdParam, schoolId, programEmail)
    }
  }, [searchParams])

  const loadData = useCallback(async () => {
    if (!userId) return

    try {
      const [coachesRes, schoolsRes, templatesRes, pipelineStats, historyRes, athleteRes, recentCoachesRes] = await Promise.all([
        supabase
          .from('coaches')
          .select('*, schools(name, id)')
          .order('name'),

        supabase
          .from('schools')
          .select('*')
          .order('name'),

        supabase
          .from('outreach_templates')
          .select('*')
          .order('template_type', { ascending: true }),

        getPipelineWithStats(userId),

        supabase
          .from('outreach')
          .select('*, coaches(name), schools(name)')
          .eq('athlete_id', userId)
          .order('sent_at', { ascending: false }),

        supabase
          .from('athletes')
          .select('*')
          .eq('user_id', userId)
          .single(),

        // Recent coaches query
        supabase
          .from('outreach')
          .select('coach_id, coach_name, school, sent_at')
          .eq('athlete_id', userId)
          .not('coach_id', 'is', null)
          .order('sent_at', { ascending: false })
          .limit(3)
      ])

      setCoaches(coachesRes.data || [])
      setSchools(schoolsRes.data || [])
      setTemplates(templatesRes.data || [])
      setPipelineWithStats(pipelineStats)
      setOutreachHistory(historyRes.data || [])
      setAthlete(athleteRes.data || null)

      // Load admin announcements for the athlete's org (powers the new
      // INBOX tab). RLS already restricts results to the user's org so
      // we don't filter by org_id here — the policy does it for us.
      const { data: annData } = await supabase
        .from('announcements')
        .select('id, title, body, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
      setAnnouncements(annData || [])

      // Process recent coaches - get unique coaches by coach_id
      const uniqueRecentCoaches = []
      const seenCoachIds = new Set()
      for (const record of recentCoachesRes.data || []) {
        if (!seenCoachIds.has(record.coach_id)) {
          seenCoachIds.add(record.coach_id)
          uniqueRecentCoaches.push(record)
        }
      }
      setRecentCoaches(uniqueRecentCoaches.slice(0, 3))
    } catch (error) {
      console.error('Error loading outreach data:', error)
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Load data on mount and handle URL params
  useEffect(() => {
    // Sync-with-external-state: load outreach data from Supabase whenever the signed-in user changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
    handleUrlParams()
  }, [loadData, handleUrlParams])

  // Handle selecting a school from the My Pipeline tab.
  //
  // The pipeline row from getPipelineWithStats now carries program_email
  // (added with the May 2026 regression fix — without it, the recipient
  // resolver couldn't see the school's program inbox and blocked the
  // send). We forward it explicitly here so selectedSchool has the same
  // shape regardless of which entry point set it.
  const handleSelectSchool = (school) => {
    setActiveTab('compose')
    setSelectedSchool({
      id: school.school_id,
      name: school.school,
      division: school.division,
      conference: school.conference,
      state: school.state,
      primary_color: school.primary_color,
      program_email: school.program_email || null,
    })

    // If school has only 1 coach, auto-select it. (Resolver will still
    // pick that coach over the program email — see resolveRecipient.)
    if (school.coach_count === 1) {
      const schoolCoach = coaches.find(c => c.schools?.name === school.school)
      if (schoolCoach) {
        setSelectedCoach(schoolCoach)
      }
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle selecting a school from the in-compose pipeline quick-card row.
  // Same program_email forwarding as handleSelectSchool above.
  const handleSelectPipelineQuick = (school) => {
    setSelectedSchool({
      id: school.school_id,
      name: school.school,
      division: school.division,
      conference: school.conference,
      state: school.state,
      primary_color: school.primary_color,
      program_email: school.program_email || null,
    })

    if (school.coach_count === 1) {
      const schoolCoach = coaches.find(c => c.schools?.name === school.school)
      if (schoolCoach) {
        setSelectedCoach(schoolCoach)
      }
    }
  }

  // Handle selecting a recent coach
  const selectRecentCoach = async (recentCoach) => {
    try {
      // Fetch full coach details
      const { data: coach } = await supabase
        .from('coaches')
        .select('*')
        .eq('id', recentCoach.coach_id)
        .single()

      if (coach) {
        setSelectedCoach(coach)
      }

      // Fetch school details
      const { data: school } = await supabase
        .from('schools')
        .select('*')
        .eq('name', recentCoach.school)
        .single()

      if (school) {
        setSelectedSchool(school)
      }

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Error selecting recent coach:', error)
    }
  }

  // Filter coaches based on search and pipeline priority
  const getFilteredCoaches = () => {
    if (!searchQuery) return []

    const pipelineSchoolNames = pipelineWithStats.map(p => p.school)
    const allCoaches = coaches.filter(coach =>
      coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.schools?.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Prioritize coaches from schools in pipeline
    const pipelineCoaches = allCoaches.filter(coach =>
      pipelineSchoolNames.includes(coach.schools?.name)
    )
    const otherCoaches = allCoaches.filter(coach =>
      !pipelineSchoolNames.includes(coach.schools?.name)
    )

    return [...pipelineCoaches, ...otherCoaches].slice(0, 10)
  }

  // Template substitution function.
  //
  // Three substitution outcomes per {{token}}:
  //   - val === null         → drop silently (used for optional fields like
  //                            `phone` and `coach_name` where we don't want
  //                            "[phone]" visible to the coach)
  //   - val === '' / undef   → render `[token]` placeholder (used for
  //                            required-but-blank profile fields, surfaces
  //                            in the "Missing: …" warning bar)
  //   - val is a string      → substitute the value
  //
  // The regex captures optional surrounding newlines so when a "drop
  // silently" token sits on its own line in the signature (the common
  // case for `{{phone}}` between position and film URL), we collapse the
  // `\n{{phone}}\n` to `\n` instead of leaving a blank line behind.
  // Without this, an athlete with no phone gets:
  //
  //     2027 · Eastside FC Washington · CM
  //     <— blank line —>
  //     https://hudl.com/v/riley
  //
  // With it, the signature stays tight:
  //
  //     2027 · Eastside FC Washington · CM
  //     https://hudl.com/v/riley
  //
  // For visible-placeholder values (`''`/undef), the surrounding newlines
  // are preserved so the missing-field warning UI can detect the bracket
  // and the layout doesn't shift.
  const substituteTemplate = (text, vars) => {
    if (!text) return ''

    // First pass: substitute variables with newline-aware handling.
    const substituted = text.replace(
      /(\n?)\{\{(\w+)\}\}(\n?)/g,
      (match, before, key, after) => {
        const val = vars[key]
        if (val === null) {
          // Drop silently. If the token was on its own line (newline on
          // both sides), collapse to a single newline so the signature
          // stack doesn't get a blank gap.
          if (before === '\n' && after === '\n') return '\n'
          return ''
        }
        if (val === undefined || val === '') {
          // Visible placeholder — preserve surrounding whitespace.
          return `${before}[${key}]${after}`
        }
        return `${before}${val}${after}`
      }
    )

    // Second pass: belt-and-suspenders cleanup.
    //   - "Hi Coach ," / "Coach ," from a null coach_name
    //   - stray space before punctuation from any token dropping
    //   - 3+ consecutive newlines collapsed to 2 (handles the edge case
    //     where two adjacent tokens both drop silently — shouldn't
    //     happen with the current templates, but cheap insurance)
    return substituted
      .replace(/Hi Coach\s+,/g, 'Hi Coach,')
      .replace(/Coach\s+,/g, 'Coach,')
      .replace(/[ \t]+([,.])/g, '$1')  // collapse space before punctuation
      .replace(/\n{3,}/g, '\n\n')      // collapse runaway blank lines
  }

  // Build variables object for template substitution
  const getTemplateVariables = useCallback(async (coach, school) => {
    // Format social handles as required by org-custom templates that
    // still reference {{social_handles}}. The default seeded templates
    // dropped this token in migration 052, but org admins may still
    // have customized templates using it.
    //
    // Note: the original code joined with `'\\n'` — that's a literal
    // backslash-n string, not a newline. Same typo class as the copy
    // handler bug. Fixed here so multi-platform social blocks actually
    // render with paragraph breaks instead of "Instagram: …\nX: …".
    const formatSocialHandles = () => {
      const handles = []
      if (athlete?.instagram_url) handles.push(`Instagram: ${athlete.instagram_url}`)
      if (athlete?.twitter_url) handles.push(`X: ${athlete.twitter_url}`)
      if (athlete?.tiktok_url) handles.push(`TikTok: ${athlete.tiktok_url}`)
      if (athlete?.youtube_url) handles.push(`YouTube: ${athlete.youtube_url}`)
      return handles.join('\n')
    }

    // Get primary highlight from highlights table
    let primaryHighlightUrl = ''
    try {
      const { data: primaryHl } = await supabase
        .from('highlights')
        .select('url')
        .eq('athlete_id', userId)
        .eq('is_primary', true)
        .maybeSingle()

      primaryHighlightUrl = primaryHl?.url || ''
    } catch (error) {
      console.error('Error fetching primary highlight:', error)
    }

    return {
      // From profile (user table)
      athlete_name: profile?.full_name || '',

      // From athlete table - core fields
      grad_year: athlete?.class_year || '',
      position: athlete?.position || '',
      high_school: athlete?.high_school || '',
      city: athlete?.city || '',
      state: athlete?.state || '',
      club_team: athlete?.club_team || 'Eastside FC Washington',
      jersey_number: athlete?.jersey_number || '',
      gpa: athlete?.gpa || '',

      // Highlight URLs - prioritize primary highlight, then profile fields
      highlight_url: primaryHighlightUrl || athlete?.highlight_reel_url || athlete?.trace_url || athlete?.hudl_url || athlete?.youtube_highlights_url || '',
      trace_url: athlete?.trace_url || '',
      hudl_url: athlete?.hudl_url || '',

      // Contact — used in the signature block. Phone is optional (we
      // don't want to nag athletes who'd rather not share theirs), so
      // we return `null` when blank. substituteTemplate() treats null
      // as "drop silently" and `''` / undefined as "render [phone] as
      // a visible placeholder" — null is what we want here so the
      // signature line just disappears.
      phone: athlete?.phone || null,

      // Physical attributes
      height: athlete?.height_cm ? `${Math.floor(athlete.height_cm/2.54/12)}'${Math.round(athlete.height_cm/2.54%12)}"` : '',
      weight: athlete?.weight_lbs || '',
      dominant_foot: athlete?.dominant_foot || '',

      // From selected coach/school
      coach_name: coach
        ? (coach.name?.split(' ').slice(-1)[0] || coach.full_name?.split(' ').slice(-1)[0] || '')
        : null,  // null means "explicitly absent — handle in template"
      coach_full_name: coach?.full_name || coach?.name || '',
      school_name: school?.name || school?.school || '',
      school_short: school?.short_name || school?.name || school?.school || '',
      division: school?.division || '',
      conference: school?.conference || '',

      // Social handles formatted for templates
      social_handles: formatSocialHandles(),

      // Placeholder for future features
      upcoming_games: ''
    }
  }, [athlete, profile, userId])

  // Generate preview with proper substitution
  const getPreview = useCallback(async () => {
    if (!selectedTemplate) {
      return { subject: '', body: '', hasMissing: false }
    }

    const vars = await getTemplateVariables(selectedCoach, selectedSchool)
    const subject = substituteTemplate(selectedTemplate.subject_template || selectedTemplate.subject || '', vars)
    const body = substituteTemplate(selectedTemplate.body_template || selectedTemplate.body || '', vars)

    // Check for missing fields (bracketed placeholders)
    const hasMissing = (subject + body).includes('[') && (subject + body).includes(']')

    return { subject, body, hasMissing }
  }, [selectedTemplate, selectedCoach, selectedSchool, getTemplateVariables])

  // Update preview when template or selections change (sync-with-derived-async-state)
  useEffect(() => {
    const updatePreview = async () => {
      if (selectedTemplate && athlete) {
        const newPreview = await getPreview()
        setPreview(newPreview)
      } else {
        setPreview({ subject: '', body: '', hasMissing: false })
      }
    }
    updatePreview()
  }, [selectedTemplate, athlete, getPreview])

  // getPlainTextPreview() was removed in the May 2026 send-flow fix.
  // It was async (awaited getPreview() which re-substituted the template
  // and re-fetched primary highlight from the DB), and that await chain
  // killed the iOS Safari user-gesture token across the click handler
  // — silently breaking clipboard writes AND mailto: navigation. All
  // send/copy paths now read directly from the `preview` state (kept
  // fresh by the useEffect at line ~535), strip <…> tags inline, and
  // never block the click handler on a DB roundtrip.

  // Copy subject + body to the clipboard so the athlete can paste into
  // any email client.
  //
  // Two bugs were fixed here in this pass:
  //
  //   1. The original `'\\n\\n'` was a literal backslash-n-backslash-n
  //      string (4 chars), not a paragraph break. Pasted text showed
  //      "Subject: …\n\n…" with visible escape sequences instead of
  //      the formatted email. Now uses real `\n\n` (template literal
  //      with actual newlines).
  //
  //   2. Awaiting `getPlainTextPreview()` before the clipboard write
  //      blew up the iOS Safari user-gesture token the same way it
  //      blew up the mailto: nav — so on mobile, the clipboard write
  //      silently failed (browser threw NotAllowedError). Now we pull
  //      from the cached `preview` state (kept fresh by the useEffect
  //      that watches template/coach/school changes) so the write
  //      happens synchronously inside the click handler.
  const handleCopyEmail = () => {
    const subject = (preview?.subject || '').replace(/<[^>]*>/g, '').trim()
    const body = (preview?.body || '').replace(/<[^>]*>/g, '').trim()
    if (!subject || !body) {
      setShowToast(
        !selectedTemplate
          ? 'Pick a template first.'
          : 'Preview still loading — try again in a second.'
      )
      setTimeout(() => setShowToast(''), 2500)
      return
    }

    const emailText = `Subject: ${subject}\n\n${body}`

    // clipboard.writeText returns a Promise but we don't block on it —
    // the call ITSELF happens synchronously inside the click handler,
    // which is what iOS Safari requires for permission. The .then/catch
    // just toasts the outcome.
    const writeResult = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(emailText)
      : Promise.reject(new Error('clipboard API unavailable'))

    writeResult
      .then(() => {
        logOutreach('copied_to_clipboard', subject, body).catch((e) =>
          console.warn('outreach log (non-blocking) failed:', e?.message)
        )
        setShowToast('Copied to clipboard ✓')
        setTimeout(() => setShowToast(''), 3000)
      })
      .catch((error) => {
        // navigator.clipboard requires HTTPS + user gesture; some
        // mobile browsers also block it inside iframes / PWAs.
        console.error('Error copying to clipboard:', error)
        setShowToast("Couldn't copy — try Open Email App instead.")
        setTimeout(() => setShowToast(''), 4000)
      })
  }

  // Build a mailto: URL from the cached preview (no async work, so the
  // user-gesture context survives across the click → navigation hop on
  // iOS Safari / Android Chrome). Returns null if anything's missing
  // (caller is responsible for the toast in that case).
  //
  // Recipient resolution goes through resolveRecipient() so there's a
  // single source of truth: coach.email > school.program_email > none.
  const buildMailto = () => {
    const r = resolveRecipient(selectedCoach, selectedSchool)
    if (!r.canSend) return null
    const subject = (preview?.subject || '').replace(/<[^>]*>/g, '').trim()
    const body = (preview?.body || '').replace(/<[^>]*>/g, '').trim()
    if (!subject || !body) return null
    return {
      email: r.email,
      subject,
      body,
      url:
        `mailto:${r.email}?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(body)}`,
    }
  }

  // PRIMARY MOBILE SEND.
  //
  // The whole point of this button is to hand a plain `mailto:` to the
  // OS so the user's default mail composer opens — iOS Mail, Gmail app,
  // Outlook, Spark, Proton, whatever. iOS and Android both route
  // `mailto:` through the default-mail-app picker, so we get native
  // app launch on every modern device WITHOUT user-agent sniffing or
  // brittle vendor deep-links (googlegmail://, ms-outlook://).
  //
  // Why this is its own handler instead of reusing handleOpenMail:
  //   - It runs SYNC. No awaits between the click and the navigation,
  //     so iOS Safari keeps the user-gesture token and the OS prompt
  //     actually appears. (handleOpenMail used to await getPlainTextPreview
  //     and logOutreach first; the gesture would expire and Safari
  //     silently dropped the mailto.)
  //   - It uses window.location.href, NOT window.open(..., '_blank').
  //     The `_blank` target spawns a popup that iOS swallows for
  //     mailto: schemes.
  //   - Logging is fire-and-forget AFTER navigation kicks off — losing
  //     the activity log on a network blip is preferable to losing the
  //     user's send.
  const handleSendEmailMobile = () => {
    const mt = buildMailto()
    if (!mt) {
      setShowToast(
        !selectedTemplate
          ? 'Pick a template first.'
          : !preview?.subject
          ? 'Preview still loading — try again in a second.'
          : "No coach email on file — use Copy instead."
      )
      setTimeout(() => setShowToast(''), 3000)
      return
    }
    logOutreach('opened_mail_app', mt.subject, mt.body).catch((e) =>
      console.warn('outreach log (non-blocking) failed:', e?.message)
    )
    // Synchronous nav — preserves user gesture across iOS Safari + PWA.
    // (Click handler, not render — lint false positive.)
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = mt.url
  }

  // DESKTOP secondary — same mailto:, but on desktop we don't have to
  // worry about iOS Safari's user-gesture rules, so we use the cached
  // preview path and let the OS handle the protocol launch. Identical
  // logic to handleSendEmailMobile under the hood; kept as a separate
  // export so the two button labels can diverge later (e.g. "Open in
  // Outlook" if we ever sniff client).
  const handleOpenMail = () => {
    const mt = buildMailto()
    if (!mt) {
      setShowToast("No coach email on file — use Copy instead.")
      setTimeout(() => setShowToast(''), 3000)
      return
    }
    logOutreach('opened_mail_app', mt.subject, mt.body).catch((e) =>
      console.warn('outreach log (non-blocking) failed:', e?.message)
    )
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = mt.url
    setShowToast('Opened in mail app ✓')
    setTimeout(() => setShowToast(''), 2500)
  }

  // Send via Gmail web compose — pre-fills To / Subject / Body and opens Gmail
  // in a new tab. The email goes FROM the athlete's own Gmail address, so
  // replies land in their inbox and Gmail's sender reputation gives clean
  // inbox placement.
  //
  // CRITICAL: window.open MUST be called synchronously in the click handler.
  // If you await first, the browser drops user-gesture context, blocks the
  // popup (or strips the URL params, landing the user on /mail/u/0/ instead
  // of /mail/?view=cm). So we open about:blank immediately, then update the
  // popup's location after the async preview/log work finishes.
  const handleSendViaGmail = () => {
    // ─── ALL SYNCHRONOUS — no awaits before navigation ───────────────
    // The previous version awaited two async calls (getPlainTextPreview
    // and logOutreach) before navigating to Gmail. On mobile Safari and
    // PWAs the user-gesture context evaporates across those awaits, so
    // the navigation either silently fails or gets bounced to Safari's
    // tab handler. Now we use the already-computed `preview` state
    // (kept up-to-date by the useEffect that watches template/coach/
    // school changes) so no DB roundtrip blocks the nav. Logging is
    // fire-and-forget after navigation kicks off.
    const email = selectedCoach?.email || selectedSchool?.program_email
    if (!selectedTemplate || !email) {
      setShowToast('Pick a template and a coach with an email first.')
      setTimeout(() => setShowToast(''), 3000)
      return
    }

    // Pull from cached preview state. Strip HTML tags so Gmail body
    // doesn't show <p>…</p> in plain compose. Empty state means the
    // useEffect hasn't computed yet — fall back to a useful message.
    const subject = (preview?.subject || '').replace(/<[^>]*>/g, '').trim()
    const body = (preview?.body || '').replace(/<[^>]*>/g, '').trim()
    if (!subject || !body) {
      setShowToast('Preview still loading — try again in a second.')
      setTimeout(() => setShowToast(''), 2500)
      return
    }

    const gmailUrl =
      'https://mail.google.com/mail/?view=cm&tf=cm' +
      '&to=' + encodeURIComponent(email) +
      '&su=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body)

    // Mobile / PWA → direct navigation in the same tab (popup-free).
    // Desktop → popup so the outreach page stays open in the background.
    const isStandalonePWA =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator?.standalone === true
    const isMobile = window.matchMedia?.('(max-width: 768px)').matches
    const useDirectNav = isMobile || isStandalonePWA

    if (useDirectNav) {
      // Fire-and-forget the log so the navigation isn't blocked.
      // If the network drops mid-write that's acceptable — the
      // user's email send is the priority, not the activity log.
      logOutreach('sent_via_gmail', subject, body).catch((e) =>
        console.warn('outreach log (non-blocking) failed:', e?.message)
      )
      // Synchronous nav — preserves user gesture across iOS Safari + PWA.
      // (Called inside the click handler, not render — lint false positive.)
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = gmailUrl
      return
    }

    // Desktop path — open popup synchronously, then log + redirect
    const popup = window.open(gmailUrl, '_blank')
    if (!popup) {
      // Popup blocked — fall back to same-tab nav. Click handler, not render.
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = gmailUrl
      return
    }
    logOutreach('sent_via_gmail', subject, body).catch((e) =>
      console.warn('outreach log (non-blocking) failed:', e?.message)
    )
    setShowToast('Opened in Gmail — send it from your account.')
    setTimeout(() => setShowToast(''), 3500)
  }

  // Log outreach to database
  const logOutreach = async (method, subject, body) => {
    if (!user?.id || !selectedTemplate) return

    try {
      await supabase
        .from('outreach')
        .insert({
          athlete_id: user.id,
          org_id: profile?.org_id,
          coach_name: selectedCoach?.name || null,
          school: selectedSchool?.name || null,
          email: selectedCoach?.email || selectedSchool?.program_email || null,
          subject,
          body,
          status: method === 'copied_to_clipboard' ? 'draft' : 'sent',
          sent_at: method === 'opened_mail_app' ? new Date().toISOString() : null
        })

      // Log activity for dashboard
      await logActivity(user.id, 'email_sent', {
        school_name: selectedSchool?.name,
        coach_name: selectedCoach?.name,
        template: selectedTemplate.template_type
      })

      // Update pipeline last activity
      if (selectedSchool?.name) {
        await supabase
          .from('pipelines')
          .update({ updated_at: new Date().toISOString() })
          .eq('athlete_id', user.id)
          .eq('school', selectedSchool.name)
      }

      // Reload data
      loadData()
    } catch (error) {
      console.error('Error logging outreach:', error)
    }
  }

  // Update reply status — wired to the "Got a reply" buttons in the INBOX tab.
  // Stamps reply_received_at so analytics + dashboards can show reply velocity.
  const updateReplyStatus = async (logId, status) => {
    try {
      await supabase
        .from('outreach')
        .update({
          coach_replied: true,
          coach_reply_status: status,
          reply_received_at: new Date().toISOString()
        })
        .eq('id', logId)

      // Log activity so the recent activity feed picks it up.
      try {
        await logActivity(user.id, 'coach_replied', {
          outreach_id: logId,
          reply_status: status
        })
      } catch { /* non-blocking */ }

      setShowToast('Reply logged ✓')
      setTimeout(() => setShowToast(''), 2500)
      loadData()
    } catch (error) {
      console.error('Error updating reply status:', error)
    }
  }

  // Clear a logged reply (in case the athlete clicked the wrong button)
  const clearReplyStatus = async (logId) => {
    try {
      await supabase
        .from('outreach')
        .update({ coach_replied: false, coach_reply_status: null, reply_received_at: null })
        .eq('id', logId)
      loadData()
    } catch (error) {
      console.error('Error clearing reply status:', error)
    }
  }

  // Stage pill component
  const StagePill = ({ stage }) => {
    const stageConfig = {
      interested: { bg: 'bg-gray-700', text: 'text-text-secondary', label: 'INTERESTED' },
      contacted: { bg: 'bg-blue-600/20', text: 'text-blue-400', label: 'CONTACTED' },
      visiting: { bg: 'bg-club-secondary/20', text: 'text-club-secondary', label: 'VISITING' },
      offer: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'OFFER' },
      committed: { bg: 'bg-green-600/20', text: 'text-green-400', label: 'COMMITTED' }
    }

    const config = stageConfig[stage] || stageConfig.interested
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  // Pipeline quick card for compose tab
  const PipelineQuickCard = ({ school, onClick }) => {
    const schoolColors = getSchoolColors(school.school)

    // Use secondary color for light primaries
    const accentColor = isLightColor(schoolColors.primary) ? schoolColors.secondary : schoolColors.primary
    const tintColor = isLightColor(schoolColors.primary) ? schoolColors.secondary : schoolColors.primary

    return (
      <button
        onClick={() => onClick(school)}
        className="hover:bg-card-hover border-l-2 rounded p-3 text-left transition-colors text-xs border border-card-border border-l-0"
        style={{
          borderLeftColor: accentColor,
          background: `linear-gradient(135deg, ${tintColor}10 0%, ${tintColor}05 50%, transparent 100%), #111827`
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          <SchoolBadge schoolName={school.school} size="sm" />
          <div className="flex items-center justify-between flex-1">
            <h4 className="font-medium text-fg-primary truncate flex-1">{school.school}</h4>
            <StagePill stage={school.stage} />
          </div>
        </div>
        <p className="text-text-tertiary text-xs mb-1">{school.division}</p>
        <p className="text-text-secondary text-xs">
          <Users className="w-3 h-3 inline mr-1" />
          {school.coach_count} {school.coach_count === 1 ? 'coach' : 'coaches'}
        </p>
      </button>
    )
  }

  if (loading) {
    return (
      <AthleteLayout>
        <div className="p-8">
          <div className="text-fg-primary">Loading outreach tool...</div>
        </div>
      </AthleteLayout>
    )
  }

  const filteredCoaches = getFilteredCoaches()
  // Single source of truth for "where does this email go?" — resolver
  // returns { email, sourceType, label, displayName, canSend } and we
  // use that everywhere (button disabled state, Step-1 chip, copy/send
  // paths). See src/lib/outreachRecipient.js.
  const recipient = resolveRecipient(selectedCoach, selectedSchool)
  const canSend = selectedTemplate && (selectedCoach || selectedSchool)
  const hasEmail = recipient.canSend

  return (
    <AthleteLayout>
      <div className="px-4 md:px-8 py-8">
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>Coach Email</span>
          </div>
          <h1 className="display-font text-fg-primary" style={{ fontSize: '36px', margin: 0 }}>Outreach</h1>
          <p className="text-text-secondary text-sm mt-1">Send from your own email — coaches reply to your inbox.</p>
        </div>

        {/* Toast notification */}
        {showToast && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg">
            {showToast}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-card-border">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'compose', label: 'COMPOSE' },
                { id: 'pipeline', label: 'MY PIPELINE' },
                // INBOX is now for admin announcements (messages from
                // the club director). SENT replaces what used to be
                // mis-labeled "INBOX" — i.e. the outreach history of
                // emails the athlete sent themselves. Coaches reply
                // straight to the athlete's Gmail, not to the platform,
                // so there are no incoming-from-coach messages.
                {
                  id: 'inbox',
                  label:
                    'INBOX' + (announcements.length ? ` (${announcements.length})` : ''),
                },
                { id: 'sent', label: 'SENT' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-[13px] ${
                    activeTab === tab.id
                      ? 'border-eastside-gold text-fg-primary'
                      : 'border-transparent text-text-secondary hover:text-fg-primary'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* COMPOSE TAB */}
        {activeTab === 'compose' && (
          <div className="design-card p-5 mb-4">
            <h2 className="text-[16px] font-medium text-fg-primary mb-6">Outreach Composer</h2>

            {/* Step 1: Select Coach */}
            <div className="design-card p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 rounded-full bg-eastside-crimson text-white text-[11px] flex items-center justify-center font-medium">
                  1
                </div>
                <h3 className="text-[11px] text-text-secondary uppercase tracking-[0.08em]">
                  Select a coach or program
                </h3>
              </div>

              {selectedCoach || selectedSchool ? (
                // Selected-recipient card. The colored chip on the right
                // shows the resolver's verdict so the athlete knows at a
                // glance whether this is a real coach email, the program
                // inbox, or nothing usable. Border color follows the
                // verdict — green for sendable, amber for nothing yet.
                <div className={`bg-navy-800 rounded-lg p-4 border ${recipient.canSend ? 'border-green-600' : 'border-amber-600'}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-fg-primary font-medium truncate">
                          {recipient.displayName || (selectedCoach?.name || 'Program Email')}
                        </p>
                        <span
                          className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                            recipient.sourceType === 'coach'
                              ? 'bg-green-600/20 text-green-400'
                              : recipient.sourceType === 'program'
                              ? 'bg-blue-600/20 text-blue-400'
                              : 'bg-amber-600/20 text-amber-400'
                          }`}
                        >
                          {recipient.label}
                        </span>
                      </div>
                      <p className="text-text-tertiary text-sm truncate">
                        {selectedSchool?.name}
                        {recipient.email
                          ? ` • ${recipient.email}`
                          : ' • Nothing to send to yet — use Copy + paste manually.'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCoach(null)
                        setSelectedSchool(null)
                        setSearchQuery('')
                      }}
                      className="text-text-tertiary hover:text-fg-primary flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Recent coaches */}
                  {recentCoaches.length > 0 && (
                    <>
                      <p className="text-xs uppercase tracking-wider text-text-tertiary font-semibold mb-3">RECENT COACHES</p>
                      <div className="flex gap-2 flex-wrap mb-4">
                        {recentCoaches.map(c => (
                          <button
                            key={c.coach_id}
                            onClick={() => selectRecentCoach(c)}
                            className="px-3 py-2 bg-navy-800 hover:bg-navy-700 border border-gray-700 rounded-full text-sm text-fg-primary flex items-center gap-2"
                          >
                            <span className="w-6 h-6 rounded-full bg-club-primary text-white text-xs flex items-center justify-center font-semibold">
                              {c.coach_name?.charAt(0) || 'C'}
                            </span>
                            {c.coach_name} · {c.school}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-border-default"/>
                        <span className="text-xs text-text-muted">OR PICK FROM YOUR PIPELINE</span>
                        <div className="flex-1 h-px bg-border-default"/>
                      </div>
                    </>
                  )}

                  {/* Pipeline quick select */}
                  {pipelineWithStats.length > 0 && (
                    <>
                      <p className="text-xs uppercase tracking-wider text-text-tertiary font-semibold mb-3">FROM YOUR PIPELINE</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        {pipelineWithStats.map(s => (
                          <PipelineQuickCard
                            key={s.id}
                            school={s}
                            onClick={handleSelectPipelineQuick}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-border-default"/>
                        <span className="text-xs text-text-muted">OR SEARCH ALL SCHOOLS</span>
                        <div className="flex-1 h-px bg-border-default"/>
                      </div>
                    </>
                  )}

                  {/* Search input */}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={pipelineWithStats.length > 0 ? "Search any school or coach..." : "Search for coaches or schools..."}
                    className="w-full bg-navy-800 text-fg-primary rounded-lg px-4 py-3 border border-gray-600"
                  />

                  {/* Search results */}
                  {searchQuery && filteredCoaches.length > 0 && (
                    <div className="bg-navy-800 border border-gray-600 rounded-lg max-h-60 overflow-y-auto mt-2">
                      {filteredCoaches.map((coach) => (
                        <button
                          key={coach.id}
                          onClick={() => {
                            setSelectedCoach(coach)
                            setSelectedSchool(schools.find(s => s.id === coach.school_id))
                            setSearchQuery('')
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-navy-700 border-b border-gray-700 last:border-b-0"
                        >
                          <div className="text-fg-primary font-medium">{coach.name}</div>
                          <div className="text-text-tertiary text-sm">
                            {coach.schools?.name} • {coach.email || 'No email'}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Select Template */}
            <div className="mb-6">
              <h3 className="text-fg-primary font-bold mb-3">Step 2: Select a template</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-club-primary border-club-primary text-white'
                        : 'bg-navy-900 border-gray-600 text-text-secondary hover:border-club-primary'
                    }`}
                  >
                    <div className="text-lg mb-1">
                      {template.template_type === 'initial' && '👋'}
                      {template.template_type === 'follow_up' && '🔄'}
                      {template.template_type === 'highlight_share' && '🎥'}
                      {template.template_type === 'campus_visit' && '🏫'}
                      {template.template_type === 'thank_you_camp' && '🙏'}
                      {template.template_type === 'schedule_update' && '📅'}
                    </div>
                    <div className="text-sm font-medium">{template.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Preview */}
            {selectedTemplate && (
              <div className="mb-6">
                <h3 className="text-fg-primary font-bold mb-3">Step 3: Preview</h3>

                {/* Missing fields warning */}
                {preview.hasMissing && (() => {
                  // Extract missing field names
                  const missing = [...(preview.subject + preview.body).matchAll(/\[(\w+)\]/g)]
                    .map(m => m[1])
                    .filter(field => field !== 'coach_name')  // never warn about coach_name in Program Email mode
                    .filter((v, i, a) => a.indexOf(v) === i)  // dedupe

                  // Friendly field names
                  const friendlyName = {
                    highlight_url: 'highlight reel link',
                    trace_url: 'Trace profile link',
                    hudl_url: 'Hudl link',
                    gpa: 'GPA',
                    jersey_number: 'jersey number',
                    high_school: 'high school',
                    club_team: 'club team',
                    athlete_name: 'full name',
                    grad_year: 'graduation year',
                    position: 'position',
                    city: 'city',
                    state: 'state',
                    social_handles: 'social media',
                    upcoming_games: 'upcoming games'
                  }

                  const friendlyMissing = missing.map(field => friendlyName[field] || field).join(', ')

                  return (
                    <div className="bg-club-secondary/20 border border-club-secondary/50 rounded-lg p-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-club-secondary">⚠️</span>
                        <span className="text-club-secondary-light text-sm">
                          Missing: {friendlyMissing} —
                          <Link to="/profile" className="text-club-secondary-light underline hover:text-club-secondary-light ml-1">
                            Complete profile →
                          </Link>
                        </span>
                      </div>
                    </div>
                  )
                })()}

                {/* Plain-text preview. Previously used dangerouslySetInnerHTML
                    which would have executed any <script> tag that ended up
                    in the substituted body — e.g. via a coach's scraped name
                    or an athlete's bio that contained markup. Email body is
                    sent via Gmail compose URL as plain text anyway, so we
                    render it as text here too. The whitespace-pre-line keeps
                    line breaks intact. */}
                <div className="bg-navy-900 rounded-lg p-4 border border-gray-600">
                  <div className="mb-3">
                    <label className="text-text-tertiary text-sm uppercase tracking-wider">Subject</label>
                    <div className="text-fg-primary bg-surface-card-hover border border-border-default rounded px-3 py-2 mt-1 font-mono text-sm">
                      {preview.subject}
                    </div>
                  </div>
                  <div>
                    <label className="text-text-tertiary text-sm uppercase tracking-wider">Body</label>
                    <div className="text-fg-primary bg-gray-800 rounded px-3 py-2 mt-1 font-mono text-sm whitespace-pre-line max-h-60 overflow-y-auto">
                      {preview.body}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons.
                Mobile and desktop see different layouts because the right
                "send" affordance is platform-dependent:
                  • Mobile → one big mailto: button. iOS / Android route
                    mailto: to the user's default mail app (Apple Mail,
                    Gmail app, Outlook, Spark, …) without any sniffing,
                    so we don't need separate "Send via Gmail" /
                    "Open in Mail App" buttons that just confuse athletes.
                  • Desktop → the three-button set still makes sense:
                    Gmail web for athletes who live in a browser tab,
                    mailto: for desktop mail clients, copy as fallback.
                Tailwind's `md:` prefix kicks in at ≥ 768px — same
                breakpoint we use everywhere else in the app for the
                mobile ↔ desktop split. */}
            {canSend && (
              <div>
                {/* MOBILE LAYOUT — one primary action, one fallback.
                    Renders only below md (Tailwind 768px breakpoint).
                    The primary fires a plain mailto: which iOS / Android
                    route to whatever the user set as their default mail
                    app (Apple Mail, Gmail app, Outlook, Spark, …).
                    Copy is the fallback for cases where the user has no
                    mail-app default configured or the mailto: handler
                    bounces them somewhere they don't want. */}
                <div className="grid grid-cols-1 gap-3 mb-3 md:hidden">
                  <button
                    onClick={handleSendEmailMobile}
                    className={`eastside-btn flex items-center justify-center gap-2 ${hasEmail ? '' : 'opacity-50 cursor-not-allowed'}`}
                    disabled={!hasEmail}
                    title={!hasEmail ? 'No verified email on file — use Copy + paste manually' : 'Opens your phone\'s default mail app'}
                    style={{ padding: '14px 18px', fontSize: '15px' }}
                  >
                    <Mail size={18} /> OPEN EMAIL APP
                  </button>
                  <button
                    onClick={handleCopyEmail}
                    className="secondary-btn flex items-center justify-center gap-2"
                    style={{ padding: '12px 18px', fontSize: '13px' }}
                  >
                    <Copy size={16} /> COPY EMAIL + MESSAGE
                  </button>
                </div>

                {/* DESKTOP LAYOUT — three-button set. Renders at ≥ md. */}
                <div className="hidden md:grid md:grid-cols-3 gap-3 mb-3">
                  {/* Primary — Send via Gmail (browser-first workflow) */}
                  <button
                    onClick={handleSendViaGmail}
                    className={`eastside-btn flex items-center justify-center gap-2 ${hasEmail ? '' : 'opacity-50 cursor-not-allowed'}`}
                    disabled={!hasEmail}
                    title={!hasEmail ? 'No coach email on file — use Copy instead' : 'Opens Gmail compose with the email pre-filled'}
                    style={{ padding: '12px 18px', fontSize: '13px' }}
                  >
                    <Mail size={16} /> SEND VIA GMAIL
                  </button>

                  {/* Open in OS default mail app (Outlook / Mail.app / etc.) */}
                  <button
                    onClick={handleOpenMail}
                    className={`secondary-btn flex items-center justify-center gap-2 ${hasEmail ? '' : 'opacity-50 cursor-not-allowed'}`}
                    disabled={!hasEmail}
                    title={!hasEmail ? 'No coach email on file — use Copy instead' : 'Opens your default email app (Mail / Outlook)'}
                    style={{ padding: '12px 18px', fontSize: '13px' }}
                  >
                    <ExternalLink size={16} /> OPEN MAIL APP
                  </button>

                  {/* Universal fallback — always works */}
                  <button
                    onClick={handleCopyEmail}
                    className="secondary-btn flex items-center justify-center gap-2"
                    style={{ padding: '12px 18px', fontSize: '13px' }}
                    title="Copy subject + body to your clipboard — paste into any email tool"
                  >
                    <Copy size={16} /> COPY EMAIL + MESSAGE
                  </button>
                </div>

                <p className="text-[11px] text-text-tertiary text-center leading-relaxed">
                  Emails are sent from <span className="text-fg-primary">your own email address</span>, not from KRS.
                  Replies land in your inbox — log them back here so your pipeline stays up to date.
                </p>
              </div>
            )}
          </div>
        )}

        {/* MY PIPELINE TAB */}
        {activeTab === 'pipeline' && (
          <div className="card mb-8">
            <h2 className="display-font text-xl text-fg-primary mb-2">MY PIPELINE</h2>
            <p className="text-text-tertiary mb-6">Schools you're tracking — click to start an email</p>

            {pipelineWithStats.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-text-tertiary mb-4">No schools in your pipeline yet.</div>
                <button
                  onClick={() => navigate('/coach-finder')}
                  className="btn-primary"
                >
                  FIND SCHOOLS
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pipelineWithStats.map((school) => (
                  <button
                    key={school.id}
                    onClick={() => handleSelectSchool(school)}
                    className="bg-navy-900 hover:bg-navy-800 border-l-4 rounded-lg p-4 text-left transition-colors"
                    style={{ borderLeftColor: school.primary_color }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-fg-primary truncate flex-1">{school.school}</h3>
                      <StagePill stage={school.stage} />
                    </div>

                    <p className="text-xs text-text-tertiary mb-3">
                      {school.division} · {school.conference}
                    </p>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-text-secondary">
                        <Users className="w-3 h-3 inline mr-1" />
                        {school.coach_count} {school.coach_count === 1 ? 'coach' : 'coaches'}
                      </span>
                      {school.last_email ? (
                        <span className="text-green-400">
                          Last email: {timeAgo(school.last_email.sent_at)}
                        </span>
                      ) : (
                        <span className="text-text-muted">Never emailed</span>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-gray-700 flex items-center justify-between">
                      <span className="text-xs text-club-primary font-semibold">WRITE TO COACH →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INBOX TAB — admin announcements from the club director.
            Athletes never receive coach replies on the platform (coaches
            reply directly to the athlete's Gmail), so an "inbox" of
            club-sent messages is the only thing that makes sense here. */}
        {activeTab === 'inbox' && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="display-font text-xl text-fg-primary">CLUB MESSAGES</h2>
              <div className="text-xs text-text-tertiary">
                {announcements.length} {announcements.length === 1 ? 'message' : 'messages'}
              </div>
            </div>

            {announcements.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-red-900/40"
                     style={{ background: 'linear-gradient(135deg, rgba(200,16,46,0.18) 0%, rgba(10,14,26,0.5) 100%)' }}>
                  <Mail size={22} className="text-red-500" />
                </div>
                <h3 className="display-font text-lg text-fg-primary mb-2">No messages yet</h3>
                <p className="text-text-secondary text-sm max-w-sm mx-auto leading-relaxed">
                  Your club director will post announcements here — recruiting
                  tips, important deadlines, and updates from the program.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div key={a.id} className="design-card p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="text-fg-primary font-semibold text-[15px] leading-snug flex-1">
                        {a.title}
                      </h3>
                      <span className="text-text-tertiary text-[11px] flex-shrink-0 whitespace-nowrap">
                        {new Date(a.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                      {a.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SENT TAB — outreach history (was previously mis-labeled
            "INBOX"). Shows every email the athlete has sent to a coach,
            with reply-logging controls so they can mark whether they
            heard back. */}
        {activeTab === 'sent' && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="display-font text-xl text-fg-primary">OUTREACH HISTORY</h2>
              <div className="flex gap-2 text-xs text-text-tertiary">
                <span>{outreachHistory.length} total</span>
                <span>·</span>
                <span className="text-green-400">
                  {outreachHistory.filter(o => o.coach_replied).length} replied
                </span>
              </div>
            </div>

            {outreachHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-text-tertiary mb-4">No outreach yet. Pick a coach above and get started.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {outreachHistory.map((log) => {
                  const replyChipMap = {
                    positive: { cls: 'chip-green',   icon: CheckCircle2, label: 'Positive reply' },
                    pending:  { cls: 'chip-amber',   icon: Clock,        label: 'Still talking' },
                    negative: { cls: 'chip-slate',   icon: AlertCircle,  label: 'Polite no' },
                    visit:    { cls: 'chip-blue',    icon: CalendarIcon, label: 'Visit scheduled' },
                    offer:    { cls: 'chip-purple',  icon: Trophy,       label: 'Offer received' }
                  }
                  const replyChip = log.coach_reply_status ? replyChipMap[log.coach_reply_status] : null

                  return (
                    <div key={log.id} className="design-card p-4">
                      <div className="flex flex-wrap justify-between items-start gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-fg-primary font-medium truncate">
                            {log.coach_name || 'Program Email'} <span className="text-text-tertiary">·</span> {log.school}
                          </div>
                          <div className="text-text-tertiary text-xs">
                            {new Date(log.sent_at || log.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' · '}
                            <span className="capitalize">{log.status || 'sent'}</span>
                          </div>
                        </div>
                        {replyChip && (
                          <span className={`chip ${replyChip.cls} flex items-center gap-1`}>
                            <replyChip.icon size={12} /> {replyChip.label}
                          </span>
                        )}
                      </div>
                      <div className="text-text-secondary text-sm mb-3">
                        <strong className="text-text-tertiary text-xs uppercase tracking-wider mr-1">Subject:</strong>
                        {log.subject}
                      </div>

                      {/* Reply-logging controls */}
                      {!log.coach_replied ? (
                        <div className="border-t border-card-border pt-3 mt-2">
                          <div className="text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                            Did you hear back? Log it here
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => updateReplyStatus(log.id, 'positive')}
                                    className="chip chip-green hover:brightness-125 cursor-pointer flex items-center gap-1.5"
                                    style={{ padding: '5px 10px', fontSize: 11 }}>
                              <CheckCircle2 size={12} /> Positive
                            </button>
                            <button onClick={() => updateReplyStatus(log.id, 'pending')}
                                    className="chip chip-amber hover:brightness-125 cursor-pointer flex items-center gap-1.5"
                                    style={{ padding: '5px 10px', fontSize: 11 }}>
                              <Clock size={12} /> Still talking
                            </button>
                            <button onClick={() => updateReplyStatus(log.id, 'visit')}
                                    className="chip chip-blue hover:brightness-125 cursor-pointer flex items-center gap-1.5"
                                    style={{ padding: '5px 10px', fontSize: 11 }}>
                              <CalendarIcon size={12} /> Visit
                            </button>
                            <button onClick={() => updateReplyStatus(log.id, 'offer')}
                                    className="chip chip-purple hover:brightness-125 cursor-pointer flex items-center gap-1.5"
                                    style={{ padding: '5px 10px', fontSize: 11 }}>
                              <Trophy size={12} /> Offer
                            </button>
                            <button onClick={() => updateReplyStatus(log.id, 'negative')}
                                    className="chip chip-slate hover:brightness-125 cursor-pointer flex items-center gap-1.5"
                                    style={{ padding: '5px 10px', fontSize: 11 }}>
                              <AlertCircle size={12} /> Polite no
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="border-t border-card-border pt-3 mt-2 flex items-center justify-between">
                          <div className="text-xs text-text-tertiary">
                            Reply logged {log.reply_received_at ? timeAgo(log.reply_received_at) : ''}
                          </div>
                          <button
                            onClick={() => clearReplyStatus(log.id)}
                            className="text-[11px] text-text-tertiary hover:text-fg-primary underline"
                          >
                            undo
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AthleteLayout>
  )
}