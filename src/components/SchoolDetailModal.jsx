import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { getFitScoreBadge } from '../lib/fitScore'
import { logActivity } from '../lib/activity.js'
import CoachPopover from './CoachPopover.jsx'

export default function SchoolDetailModal({
  school,
  isOpen,
  onClose,
  athleteProfile,
  onAddToPipeline,
  onRemoveFromPipeline,
  isInPipeline,
  fitScore
}) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('COACHES')
  const [notes, setNotes] = useState('')
  const [saveStatus, setSaveStatus] = useState('') // '', 'saving', 'saved', 'error'
  const [expandedPlaceholders, setExpandedPlaceholders] = useState(false)
  const [showAddCoachModal, setShowAddCoachModal] = useState(false)
  const [showRemoveDropdown, setShowRemoveDropdown] = useState(false)
  const [saveTimeout, setSaveTimeout] = useState(null)
  const [activeCoachPopover, setActiveCoachPopover] = useState(null)

  // Load notes when modal opens
  useEffect(() => {
    if (isOpen && school && user) {
      loadNotes()
      updateLastActivity()
    }
  }, [isOpen, school?.id, user?.id])

  const updateLastActivity = async () => {
    if (!isInPipeline || !user?.id || !school?.name) return

    try {
      await supabase
        .from('pipelines')
        .update({
          last_activity_at: new Date().toISOString()
        })
        .eq('athlete_id', user.id)
        .eq('school', school.name)
    } catch (error) {
      console.error('Error updating last activity:', error)
    }
  }

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const loadNotes = async () => {
    try {
      const { data } = await supabase
        .from('school_notes')
        .select('notes')
        .eq('user_id', user.id)
        .eq('school_id', school.id)
        .single()

      setNotes(data?.notes || '')
    } catch (error) {
      // Notes don't exist yet, that's fine
      setNotes('')
    }
  }

  const saveNotes = async () => {
    if (!user || !school) return

    console.log('🔄 Setting saveStatus to saving')
    setSaveStatus('saving')
    try {
      await supabase
        .from('school_notes')
        .upsert({
          user_id: user.id,
          school_id: school.id,
          notes: notes.trim(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,school_id'
        })

      console.log('✅ Setting saveStatus to saved')
      setSaveStatus('saved')

      // Log activity
      await logActivity(user.id, 'note_saved', { school_name: school?.name })

      setTimeout(() => {
        console.log('⏰ Clearing saveStatus')
        setSaveStatus('')
      }, 2000)
    } catch (error) {
      console.error('❌ Error saving notes:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(''), 3000)
    }
  }

  const handleNotesChange = (e) => {
    setNotes(e.target.value)

    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout)
    }

    // Set new timeout for debounced save (1.5 seconds)
    const newTimeout = setTimeout(() => {
      saveNotes()
    }, 1500)

    setSaveTimeout(newTimeout)
  }

  const handleNotesBlur = () => {
    // Save immediately on blur if there are unsaved changes
    if (saveTimeout) {
      clearTimeout(saveTimeout)
      setSaveTimeout(null)
      saveNotes()
    }
  }

  const getVerificationStatus = (coach) => {
    if (!coach.verified_at) {
      return { dot: 'bg-red-500', tooltip: 'Not yet verified' }
    }

    const daysSince = Math.floor((new Date() - new Date(coach.verified_at)) / (1000 * 60 * 60 * 24))
    if (daysSince <= 30) {
      return { dot: 'bg-green-500', tooltip: `Verified ${daysSince} days ago` }
    } else if (daysSince <= 90) {
      return { dot: 'bg-club-secondary', tooltip: `Verified ${daysSince} days ago` }
    } else {
      return { dot: 'bg-red-500', tooltip: `Verified ${daysSince} days ago (stale)` }
    }
  }

  const navigateToOutreach = (coach, schoolData) => {
    const schoolName = schoolData.name || schoolData.school
    const url = `/outreach?school=${encodeURIComponent(schoolName)}&coach_id=${coach.id}`
    navigate(url)
  }

  const handleEmailCoach = (coach) => {
    navigateToOutreach(coach, school)
  }

  const handleEmailProgram = () => {
    navigate(`/outreach?school_id=${school.id}&program_email=${encodeURIComponent(school.program_email)}`)
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  if (!isOpen || !school) return null

  // Get coaches
  const allCoaches = school.coaches || []
  const realCoaches = allCoaches.filter(c =>
    !c.name.includes('Needs Verification') &&
    !c.name.includes('Support Staff') &&
    c.name !== 'Administrative Support Staff'
  )
  const placeholderCoaches = allCoaches.filter(c => c.name.includes('Needs Verification'))

  // Fit score badge
  const fitBadge = fitScore !== null ? getFitScoreBadge(fitScore) : null

  const buildAboutDescription = () => {
    const parts = []

    // Build program description
    let programDesc = ''
    if (school.division) {
      programDesc = `Division ${school.division} program`
      if (school.conference) {
        programDesc += ` in ${school.conference}`
      }
    }
    if (programDesc) parts.push(programDesc)

    // Add location
    if (school.city || school.state) {
      parts.push(`Located in ${[school.city, school.state].filter(Boolean).join(', ')}`)
    }

    // Add enrollment
    if (school.enrollment) {
      parts.push(`Current enrollment: ${school.enrollment.toLocaleString()} students`)
    }

    return parts.length > 0 ? parts.join('. ') + '.' : 'Information coming soon.'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="fixed inset-0 md:inset-auto md:max-w-[900px] md:max-h-[85vh] md:rounded-xl md:m-auto bg-navy-900 shadow-2xl border border-gray-600 w-full overflow-hidden animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div
          className="sticky top-0 bg-navy-900 z-10 relative p-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${school.primary_color}26 0%, #0F1E36 100%)`
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 h-12 w-12 md:h-10 md:w-10 flex items-center justify-center rounded-full bg-black bg-opacity-30 hover:bg-opacity-50 text-white"
          >
            ×
          </button>

          {/* Fit score badge */}
          {fitBadge && (
            <div className="absolute top-4 right-16">
              <span className={`px-2 py-1 rounded text-xs font-bold ${fitBadge.className}`}>
                {fitScore}
              </span>
            </div>
          )}

          {/* School info */}
          <div className="pr-20">
            <h1 className="display-font text-3xl font-bold mb-2">{school.name}</h1>

            <div className="flex items-center gap-3 mb-4">
              {school.division && (
                <span
                  className="px-2 py-1 rounded text-xs font-bold text-white"
                  style={{ backgroundColor: school.primary_color || '#dc2626' }}
                >
                  {school.division}
                </span>
              )}
              {school.conference && (
                <span className="text-gray-300 text-sm">{school.conference}</span>
              )}
              {(school.city || school.state) && (
                <span className="text-gray-300 text-sm">
                  {[school.city, school.state].filter(Boolean).join(', ')}
                </span>
              )}
            </div>

            {isInPipeline ? (
              <div className="relative">
                <button
                  onClick={() => setShowRemoveDropdown(!showRemoveDropdown)}
                  className="bg-green-600 text-white hover:bg-green-700 px-6 py-2 rounded font-bold flex items-center gap-2"
                >
                  ADDED ✓
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showRemoveDropdown && (
                  <div className="absolute right-0 top-10 bg-navy-800 border border-gray-600 rounded-lg py-2 min-w-[200px] z-30">
                    <button
                      onClick={() => {
                        if (onRemoveFromPipeline) onRemoveFromPipeline(school)
                        setShowRemoveDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2 text-red-400 text-sm hover:bg-navy-700"
                    >
                      Remove from Pipeline
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onAddToPipeline(school)}
                className="bg-club-primary text-white hover:bg-club-primary-dark px-6 py-2 rounded font-bold"
              >
                ADD TO PIPELINE
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row h-96 overflow-hidden">
          {/* Left sidebar - 30% */}
          <div className="w-full md:w-[30%] bg-navy-800 p-6 border-b md:border-b-0 md:border-r border-gray-600 overflow-y-auto">
            <div className="space-y-6">
              {/* Program Email */}
              <div>
                <h3 className="text-white font-bold mb-2 text-sm uppercase tracking-wider">Program Email</h3>
                {school.program_email ? (
                  <div className="bg-green-900 bg-opacity-20 border border-green-600 border-opacity-30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-green-600 text-white text-xs px-2 py-1 rounded font-bold">✓ VERIFIED</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-300 text-sm">{school.program_email}</span>
                      <button
                        onClick={() => copyToClipboard(school.program_email)}
                        className="text-gray-400 hover:text-white text-xs"
                        title="Copy email"
                      >
                        📋
                      </button>
                    </div>
                    <p className="text-gray-400 text-xs mb-3">
                      Email the program — they forward to recruiting.
                    </p>
                    <button
                      onClick={handleEmailProgram}
                      className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-3 rounded font-bold"
                    >
                      EMAIL PROGRAM
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">No program email on file</p>
                )}
              </div>

              {/* Athletics Website */}
              {school.athletics_website && (
                <div>
                  <h3 className="text-white font-bold mb-2 text-sm uppercase tracking-wider">Athletics Website</h3>
                  <a
                    href={school.athletics_website.startsWith('http') ? school.athletics_website : `https://${school.athletics_website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-club-primary hover:text-club-primary-light text-sm underline"
                  >
                    {school.athletics_website}
                  </a>
                </div>
              )}

              {/* Academic Rank */}
              <div>
                <h3 className="text-white font-bold mb-2 text-sm uppercase tracking-wider">Academic Rank</h3>
                <p className="text-gray-400 text-sm">
                  {school.academic_rank ? `#${school.academic_rank} US News` : 'Not ranked'}
                </p>
              </div>

              {/* Enrollment */}
              <div>
                <h3 className="text-white font-bold mb-2 text-sm uppercase tracking-wider">Enrollment</h3>
                <p className="text-gray-400 text-sm">
                  {school.enrollment ? school.enrollment.toLocaleString() : 'Unknown'}
                </p>
              </div>

              {/* Region */}
              {school.region && (
                <div>
                  <h3 className="text-white font-bold mb-2 text-sm uppercase tracking-wider">Region</h3>
                  <p className="text-gray-400 text-sm">{school.region}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right main area - 70% */}
          <div className="flex-1 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-600 bg-navy-900 overflow-x-auto">
              {['COACHES', 'ABOUT SCHOOL', 'MY NOTES'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-bold transition-colors ${
                    activeTab === tab
                      ? 'text-club-primary border-b-2 border-club-primary'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 p-6 overflow-y-auto">
              {activeTab === 'COACHES' && (
                <div className="space-y-4">
                  {/* Real coaches */}
                  {realCoaches.length > 0 ? (
                    realCoaches.map((coach) => {
                      const verification = getVerificationStatus(coach)
                      return (
                        <div
                          key={coach.id}
                          onClick={() => setActiveCoachPopover(coach)}
                          className="bg-navy-800 hover:bg-navy-700 rounded-lg p-4 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-white truncate">{coach.full_name || coach.name}</h4>
                              <p className="text-sm text-gray-400">{coach.title || 'Coach'}</p>
                              {coach.email && (
                                <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-1">
                                  <span className={`inline-block w-2 h-2 rounded-full ${verification.dot}`}/>
                                  {coach.email}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigateToOutreach(coach, school)
                              }}
                              className="px-3 py-2 bg-club-primary hover:bg-club-primary-dark text-white text-xs font-semibold rounded shrink-0"
                            >
                              EMAIL COACH
                            </button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-gray-400">No verified coaches yet.</p>
                  )}

                  {/* Placeholder coaches section */}
                  {placeholderCoaches.length > 0 && (
                    <div className="mt-6">
                      {realCoaches.length > 0 ? (
                        <button
                          onClick={() => setExpandedPlaceholders(!expandedPlaceholders)}
                          className="w-full text-left bg-club-secondary-dark bg-opacity-20 border border-club-secondary border-opacity-30 rounded-lg p-3 text-club-secondary-light text-sm hover:bg-opacity-30"
                        >
                          ⚠️ {placeholderCoaches.length} unverified coach role{placeholderCoaches.length !== 1 ? 's' : ''} — help us add the current coach info
                        </button>
                      ) : (
                        <div className="bg-club-secondary-dark bg-opacity-20 border border-club-secondary border-opacity-30 rounded-lg p-3 text-club-secondary-light text-sm">
                          ⚠️ {placeholderCoaches.length} unverified coach role{placeholderCoaches.length !== 1 ? 's' : ''} — help us add the current coach info
                        </div>
                      )}

                      {(expandedPlaceholders || realCoaches.length === 0) && (
                        <div className="mt-2 space-y-2">
                          {placeholderCoaches.map((coach) => (
                            <div key={coach.id} className="bg-gray-800 rounded-lg p-3 flex justify-between items-center">
                              <div>
                                <h5 className="text-white font-medium">{coach.name}</h5>
                                <p className="text-gray-400 text-sm">{coach.title}</p>
                              </div>
                              <button
                                onClick={() => setShowAddCoachModal(true)}
                                className="bg-club-primary hover:bg-club-primary-dark text-white text-xs py-1 px-3 rounded font-bold"
                              >
                                ADD / UPDATE COACH
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'ABOUT SCHOOL' && (
                <div className="space-y-6">
                  <div>
                    <p className="text-gray-300 text-base leading-relaxed mb-4">
                      {buildAboutDescription()}
                    </p>

                    {school.academic_rank && (
                      <p className="text-gray-300 text-sm mb-4">
                        Ranked #{school.academic_rank} nationally (US News)
                      </p>
                    )}

                    {school.athletics_website && (
                      <div className="mb-4">
                        <a
                          href={school.athletics_website.startsWith('http') ? school.athletics_website : `https://${school.athletics_website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block bg-club-primary hover:bg-club-primary-dark text-white text-sm py-2 px-4 rounded font-bold"
                        >
                          VISIT ATHLETICS SITE
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-600">
                    <p className="text-gray-400 text-sm">
                      <strong>About this program</strong> — coming soon
                    </p>
                    <p className="text-gray-500 text-xs mt-1">
                      Program history, notable alumni, recent achievements, coaching philosophy
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'MY NOTES' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-gray-400 text-sm">Private to you. Track visit impressions, pros/cons, conversation notes.</p>
                    <div className="text-xs min-h-[20px]">
                      {saveStatus === 'saving' && <span className="text-club-secondary flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
                      {saveStatus === 'saved' && <span className="text-green-400 flex items-center gap-1"><Check className="w-3 h-3" /> Saved</span>}
                      {saveStatus === 'error' && <span className="text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Error</span>}
                    </div>
                  </div>

                  <textarea
                    value={notes}
                    onChange={handleNotesChange}
                    onBlur={handleNotesBlur}
                    placeholder="Add your private notes about this school..."
                    className="w-full h-64 bg-navy-800 text-white rounded-lg p-4 border border-gray-600 focus:border-club-primary focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coach Popover */}
        {activeCoachPopover && (
          <CoachPopover
            coach={activeCoachPopover}
            school={school}
            onClose={() => setActiveCoachPopover(null)}
            onEmailCoach={(coach) => {
              setActiveCoachPopover(null)
              navigateToOutreach(coach, school)
            }}
          />
        )}
      </div>
    </div>
  )
}