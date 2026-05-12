import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getPipelineWithStats } from '../lib/pipelineWithStats'
import { timeAgo } from '../lib/timeAgo'
import { logActivity } from '../lib/activity'
import { Users } from 'lucide-react'
import AthleteLayout from '../components/AthleteLayout.jsx'
import SchoolBadge from '../components/SchoolBadge.jsx'
import { getSchoolColors, isLightColor } from '../lib/schoolColors'

export default function Outreach() {
  const { user, profile } = useAuth()
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
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState({ subject: '', body: '', hasMissing: false })

  // Load data on mount and handle URL params
  useEffect(() => {
    loadData()
    handleUrlParams()
  }, [user?.id])

  // Update preview when template or selections change
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
  }, [selectedTemplate, selectedCoach, selectedSchool, athlete])

  const handleUrlParams = () => {
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
  }

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

  const loadData = async () => {
    if (!user?.id) return

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

        getPipelineWithStats(user.id),

        supabase
          .from('outreach')
          .select('*, coaches(name), schools(name)')
          .eq('athlete_id', user.id)
          .order('sent_at', { ascending: false }),

        supabase
          .from('athletes')
          .select('*')
          .eq('user_id', user.id)
          .single(),

        // Recent coaches query
        supabase
          .from('outreach')
          .select('coach_id, coach_name, school, sent_at')
          .eq('athlete_id', user.id)
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
  }

  // Handle selecting a school from pipeline
  const handleSelectSchool = (school) => {
    setActiveTab('compose')
    setSelectedSchool({
      id: school.school_id,
      name: school.school,
      division: school.division,
      conference: school.conference,
      state: school.state,
      primary_color: school.primary_color
    })

    // If school has only 1 coach, auto-select it
    if (school.coach_count === 1) {
      // Find the coach for this school
      const schoolCoach = coaches.find(c => c.schools?.name === school.school)
      if (schoolCoach) {
        setSelectedCoach(schoolCoach)
      }
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle selecting a school from pipeline quick cards in compose
  const handleSelectPipelineQuick = (school) => {
    setSelectedSchool({
      id: school.school_id,
      name: school.school,
      division: school.division,
      conference: school.conference,
      state: school.state,
      primary_color: school.primary_color
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

  // Template substitution function
  const substituteTemplate = (text, vars) => {
    if (!text) return ''

    // First pass: substitute variables
    const substituted = text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const val = vars[key]
      if (val === null) return ''  // explicit null means "drop silently"
      if (val === undefined || val === '') return `[${key}]`  // missing = visible placeholder
      return val
    })

    // Second pass: clean up formatting
    return substituted
      .replace(/Hi Coach\s+,/g, 'Hi Coach,')
      .replace(/Coach\s+,/g, 'Coach,')
      .replace(/\s+([,.])/g, '$1')  // collapse space before punctuation
  }

  // Build variables object for template substitution
  const getTemplateVariables = async (coach, school) => {
    // Format social handles as required by templates
    const formatSocialHandles = () => {
      const handles = []
      if (athlete?.instagram_url) handles.push(`Instagram: ${athlete.instagram_url}`)
      if (athlete?.twitter_url) handles.push(`X: ${athlete.twitter_url}`)
      if (athlete?.tiktok_url) handles.push(`TikTok: ${athlete.tiktok_url}`)
      if (athlete?.youtube_url) handles.push(`YouTube: ${athlete.youtube_url}`)
      return handles.join('\\n')
    }

    // Get primary highlight from highlights table
    let primaryHighlightUrl = ''
    try {
      const { data: primaryHl } = await supabase
        .from('highlights')
        .select('url')
        .eq('athlete_id', user.id)
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
  }

  // Generate preview with proper substitution
  const getPreview = async () => {
    if (!selectedTemplate) {
      return { subject: '', body: '', hasMissing: false }
    }

    const vars = await getTemplateVariables(selectedCoach, selectedSchool)
    const subject = substituteTemplate(selectedTemplate.subject_template || selectedTemplate.subject || '', vars)
    const body = substituteTemplate(selectedTemplate.body_template || selectedTemplate.body || '', vars)

    // Check for missing fields (bracketed placeholders)
    const hasMissing = (subject + body).includes('[') && (subject + body).includes(']')

    return { subject, body, hasMissing }
  }

  // Get plain text preview
  const getPlainTextPreview = async () => {
    const previewData = await getPreview()
    return {
      subject: previewData.subject.replace(/<[^>]*>/g, ''),
      body: previewData.body.replace(/<[^>]*>/g, '')
    }
  }

  // Copy to clipboard
  const handleCopyEmail = async () => {
    const preview = await getPlainTextPreview()
    if (!preview.subject || !preview.body) return

    const emailText = `Subject: ${preview.subject}\\n\\n${preview.body}`

    try {
      await navigator.clipboard.writeText(emailText)
      await logOutreach('copied_to_clipboard', preview.subject, preview.body)
      setShowToast('Copied to clipboard ✓')
      setTimeout(() => setShowToast(''), 3000)
    } catch (error) {
      console.error('Error copying to clipboard:', error)
    }
  }

  // Open in mail app
  const handleOpenMail = async () => {
    const preview = await getPlainTextPreview()
    if (!preview.subject || !preview.body) return

    const email = selectedCoach?.email || selectedSchool?.program_email
    if (!email) return

    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(preview.subject)}&body=${encodeURIComponent(preview.body)}`

    await logOutreach('opened_mail_app', preview.subject, preview.body)
    window.open(mailtoUrl, '_blank')

    setShowToast('Opened in mail app ✓')
    setTimeout(() => setShowToast(''), 3000)
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

  // Update reply status
  const updateReplyStatus = async (logId, replied, status) => {
    try {
      await supabase
        .from('outreach')
        .update({
          coach_replied: replied,
          coach_reply_status: status
        })
        .eq('id', logId)

      loadData()
    } catch (error) {
      console.error('Error updating reply status:', error)
    }
  }

  // Stage pill component
  const StagePill = ({ stage }) => {
    const stageConfig = {
      interested: { bg: 'bg-gray-700', text: 'text-gray-300', label: 'INTERESTED' },
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
            <h4 className="font-medium text-white truncate flex-1">{school.school}</h4>
            <StagePill stage={school.stage} />
          </div>
        </div>
        <p className="text-gray-400 text-xs mb-1">{school.division}</p>
        <p className="text-gray-300 text-xs">
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
          <div className="text-white">Loading outreach tool...</div>
        </div>
      </AthleteLayout>
    )
  }

  const filteredCoaches = getFilteredCoaches()
  const canSend = selectedTemplate && (selectedCoach || selectedSchool)
  const hasEmail = selectedCoach?.email || selectedSchool?.program_email

  return (
    <AthleteLayout>
      <div className="px-4 md:px-8 py-8">
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: 'white', fontSize: '22px', fontWeight: 500, letterSpacing: '-0.01em', margin: 0 }}>OUTREACH</h1>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>Compose professional emails to coaches using proven templates</p>
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
                { id: 'inbox', label: 'INBOX' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-[13px] ${
                    activeTab === tab.id
                      ? 'border-eastside-gold text-white'
                      : 'border-transparent text-text-secondary hover:text-white'
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
            <h2 className="text-[16px] font-medium text-white mb-6">Outreach Composer</h2>

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
                <div className="bg-navy-800 rounded-lg p-4 border border-green-600">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-white font-medium">
                        {selectedCoach ? selectedCoach.name : 'Program Email'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {selectedSchool?.name} • {selectedCoach?.email || selectedSchool?.program_email || 'No email on file'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCoach(null)
                        setSelectedSchool(null)
                        setSearchQuery('')
                      }}
                      className="text-gray-400 hover:text-white"
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
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">RECENT COACHES</p>
                      <div className="flex gap-2 flex-wrap mb-4">
                        {recentCoaches.map(c => (
                          <button
                            key={c.coach_id}
                            onClick={() => selectRecentCoach(c)}
                            className="px-3 py-2 bg-navy-800 hover:bg-navy-700 border border-gray-700 rounded-full text-sm text-white flex items-center gap-2"
                          >
                            <span className="w-6 h-6 rounded-full bg-club-primary text-white text-xs flex items-center justify-center font-semibold">
                              {c.coach_name?.charAt(0) || 'C'}
                            </span>
                            {c.coach_name} · {c.school}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-gray-700"/>
                        <span className="text-xs text-gray-500">OR PICK FROM YOUR PIPELINE</span>
                        <div className="flex-1 h-px bg-gray-700"/>
                      </div>
                    </>
                  )}

                  {/* Pipeline quick select */}
                  {pipelineWithStats.length > 0 && (
                    <>
                      <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">FROM YOUR PIPELINE</p>
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
                        <div className="flex-1 h-px bg-gray-700"/>
                        <span className="text-xs text-gray-500">OR SEARCH ALL SCHOOLS</span>
                        <div className="flex-1 h-px bg-gray-700"/>
                      </div>
                    </>
                  )}

                  {/* Search input */}
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={pipelineWithStats.length > 0 ? "Search any school or coach..." : "Search for coaches or schools..."}
                    className="w-full bg-navy-800 text-white rounded-lg px-4 py-3 border border-gray-600"
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
                          <div className="text-white font-medium">{coach.name}</div>
                          <div className="text-gray-400 text-sm">
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
              <h3 className="text-white font-bold mb-3">Step 2: Select a template</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`p-4 rounded-lg border-2 text-center transition-colors ${
                      selectedTemplate?.id === template.id
                        ? 'bg-club-primary border-club-primary text-white'
                        : 'bg-navy-900 border-gray-600 text-gray-300 hover:border-club-primary'
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
                <h3 className="text-white font-bold mb-3">Step 3: Preview</h3>

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

                <div className="bg-navy-900 rounded-lg p-4 border border-gray-600">
                  <div className="mb-3">
                    <label className="text-gray-400 text-sm uppercase tracking-wider">Subject</label>
                    <div
                      className="text-white bg-gray-800 rounded px-3 py-2 mt-1 font-mono text-sm"
                      dangerouslySetInnerHTML={{ __html: preview.subject }}
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm uppercase tracking-wider">Body</label>
                    <div
                      className="text-white bg-gray-800 rounded px-3 py-2 mt-1 font-mono text-sm whitespace-pre-line max-h-60 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: preview.body }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {canSend && (
              <div className="flex gap-4">
                <button
                  onClick={handleCopyEmail}
                  className="btn-primary flex-1"
                  disabled={!canSend}
                >
                  📋 COPY EMAIL
                </button>
                <button
                  onClick={handleOpenMail}
                  className={`flex-1 ${hasEmail ? 'btn-secondary' : 'btn-secondary opacity-50 cursor-not-allowed'}`}
                  disabled={!hasEmail}
                  title={!hasEmail ? 'No email on file — use Copy' : ''}
                >
                  ✉️ OPEN IN MAIL APP
                </button>
              </div>
            )}
          </div>
        )}

        {/* MY PIPELINE TAB */}
        {activeTab === 'pipeline' && (
          <div className="card mb-8">
            <h2 className="display-font text-xl text-white mb-2">MY PIPELINE</h2>
            <p className="text-gray-400 mb-6">Schools you're tracking — click to start an email</p>

            {pipelineWithStats.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">No schools in your pipeline yet.</div>
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
                      <h3 className="font-semibold text-white truncate flex-1">{school.school}</h3>
                      <StagePill stage={school.stage} />
                    </div>

                    <p className="text-xs text-gray-400 mb-3">
                      {school.division} · {school.conference}
                    </p>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-300">
                        <Users className="w-3 h-3 inline mr-1" />
                        {school.coach_count} {school.coach_count === 1 ? 'coach' : 'coaches'}
                      </span>
                      {school.last_email ? (
                        <span className="text-green-400">
                          Last email: {timeAgo(school.last_email.sent_at)}
                        </span>
                      ) : (
                        <span className="text-gray-500">Never emailed</span>
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

        {/* INBOX TAB */}
        {activeTab === 'inbox' && (
          <div className="card">
            <h2 className="display-font text-xl text-white mb-6">OUTREACH HISTORY</h2>

            {outreachHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">No outreach yet. Pick a coach above and get started.</div>
              </div>
            ) : (
              <div className="space-y-4">
                {outreachHistory.map((log) => (
                  <div key={log.id} className="bg-navy-900 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="text-white font-medium">
                          {log.coach_name || 'Program Email'} • {log.school}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {new Date(log.created_at).toLocaleDateString()} • {log.status}
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-400 text-sm">
                      <strong>Subject:</strong> {log.subject}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AthleteLayout>
  )
}