import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import AthleteLayout from '../components/AthleteLayout.jsx'
import { calculateFitScore, getFitScoreBadge } from '../lib/fitScore.js'

export default function CoachFinder() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [schools, setSchools] = useState([])
  const [coaches, setCoaches] = useState([])
  const [pipeline, setPipeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedSchool, setExpandedSchool] = useState(null)
  const [showAddCoachModal, setShowAddCoachModal] = useState(false)
  const [quizResponses, setQuizResponses] = useState(null)

  // Filter states
  const [filters, setFilters] = useState({
    division: 'All',
    conference: 'All',
    region: 'All',
    state: 'All',
    search: ''
  })

  // Form states
  const [newCoach, setNewCoach] = useState({
    school_id: '',
    name: '',
    title: '',
    email: '',
    phone: '',
    visibility: 'private'
  })

  // Load schools and coaches data
  useEffect(() => {
    async function loadData() {
      try {
        // Load schools
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('*')
          .order('name')

        if (schoolsError) {
          console.error('Error loading schools:', schoolsError)
        } else {
          setSchools(schoolsData || [])
        }

        // Load coaches
        const { data: coachesData, error: coachesError } = await supabase
          .from('coaches')
          .select('*, schools(name, short_name)')

        if (coachesError) {
          console.error('Error loading coaches:', coachesError)
        } else {
          setCoaches(coachesData || [])
        }

        // Load user's pipeline
        if (user?.id) {
          const { data: pipelineData, error: pipelineError } = await supabase
            .from('pipelines')
            .select('school')
            .eq('athlete_id', user.id)

          if (pipelineError) {
            console.error('Error loading pipeline:', pipelineError)
          } else {
            setPipeline(pipelineData?.map(p => p.school) || [])
          }
        }

        // Load user's quiz responses
        if (user?.id) {
          const { data: quizData, error: quizError } = await supabase
            .from('school_fit_quiz_responses')
            .select('*')
            .eq('user_id', user.id)
            .single()

          if (quizError && quizError.code !== 'PGRST116') { // Not found is ok
            console.error('Error loading quiz responses:', quizError)
          } else if (quizData) {
            setQuizResponses(quizData)
          }
        }
      } catch (error) {
        console.error('Error loading coach finder data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  // Get unique values for filter dropdowns
  const conferences = [...new Set(schools.map(s => s.conference).filter(Boolean))]
  const regions = [...new Set(schools.map(s => s.region).filter(Boolean))]
  const states = [...new Set(schools.map(s => s.state).filter(Boolean))].sort()

  // Filter schools based on current filters
  const filteredSchools = schools.filter(school => {
    if (filters.division !== 'All' && school.division !== filters.division) return false
    if (filters.conference !== 'All' && school.conference !== filters.conference) return false
    if (filters.region !== 'All' && school.region !== filters.region) return false
    if (filters.state !== 'All' && school.state !== filters.state) return false
    if (filters.search && !school.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  // Get coaches for a specific school
  const getSchoolCoaches = (schoolId) => {
    return coaches.filter(coach => coach.school_id === schoolId)
  }

  // Get coach counts
  const getCoachCounts = (schoolId) => {
    const schoolCoaches = getSchoolCoaches(schoolId)
    const withEmails = schoolCoaches.filter(c => c.email).length
    return {
      total: schoolCoaches.length,
      withEmails
    }
  }

  // Feature 1: Add to Pipeline
  const handleAddToPipeline = async (school) => {
    if (!user?.id) return

    const isInPipeline = pipeline.includes(school.name)

    try {
      if (isInPipeline) {
        // Remove from pipeline
        await supabase
          .from('pipelines')
          .delete()
          .eq('athlete_id', user.id)
          .eq('school', school.name)

        setPipeline(prev => prev.filter(s => s !== school.name))
      } else {
        // Add to pipeline
        await supabase
          .from('pipelines')
          .insert({
            athlete_id: user.id,
            org_id: profile?.org_id,
            school: school.name,
            status: 'contacted'
          })

        setPipeline(prev => [...prev, school.name])
      }
    } catch (error) {
      console.error('Error updating pipeline:', error)
    }
  }

  // Feature 2: Email Coach
  const handleEmailCoach = (coach, school) => {
    console.log('Navigate to outreach with params:', { coach_id: coach.id, school_id: school.id })
    // Stub: navigate('/outreach', { state: { coachId: coach.id, schoolId: school.id } })
  }


  // Feature 4: Coach Verification Signal
  const getVerificationStatus = (coach) => {
    if (!coach.verified_at) {
      return { dot: 'bg-red-500', tooltip: 'Not yet verified — please confirm this email works' }
    }

    const daysSince = Math.floor((new Date() - new Date(coach.verified_at)) / (1000 * 60 * 60 * 24))
    if (daysSince <= 30) {
      return { dot: 'bg-green-500', tooltip: `Verified ${daysSince} days ago` }
    } else if (daysSince <= 90) {
      return { dot: 'bg-yellow-500', tooltip: `Verified ${daysSince} days ago` }
    } else {
      return { dot: 'bg-red-500', tooltip: `Verified ${daysSince} days ago (stale)` }
    }
  }

  // Feature 5: Get recommended schools
  const getRecommendedSchools = () => {
    if (!profile?.athlete?.class_year || !profile?.athlete?.gpa) {
      return []
    }

    return schools
      .map(school => ({
        ...school,
        fitScore: calculateFitScore(school, quizResponses, profile)
      }))
      .filter(school => school.fitScore !== null)
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 6)
  }

  // Feature 3: Scroll to school and expand it
  const scrollToSchool = (schoolId) => {
    const schoolElement = document.getElementById(`school-${schoolId}`)
    if (schoolElement) {
      // Scroll to the school card
      schoolElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })

      // Expand the school card
      setExpandedSchool(schoolId)

      // Add a brief crimson highlight pulse
      schoolElement.style.boxShadow = '0 0 0 3px #dc2626'
      schoolElement.style.transition = 'box-shadow 0.2s ease'

      setTimeout(() => {
        schoolElement.style.boxShadow = ''
      }, 200)
    }
  }

  // Handle adding a new coach
  const handleAddCoach = async () => {
    try {
      const { error } = await supabase
        .from('coaches')
        .insert({
          ...newCoach,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (error) {
        console.error('Error adding coach:', error)
        alert('Error adding coach. Please try again.')
        return
      }

      // Reload coaches
      const { data: coachesData } = await supabase
        .from('coaches')
        .select('*, schools(name, short_name)')

      setCoaches(coachesData || [])
      setShowAddCoachModal(false)
      setNewCoach({
        school_id: '',
        name: '',
        title: '',
        email: '',
        phone: '',
        visibility: 'private'
      })
    } catch (error) {
      console.error('Error adding coach:', error)
      alert('Error adding coach. Please try again.')
    }
  }

  if (loading) {
    return (
      <AthleteLayout>
        <div className="p-8">
          <div className="text-white">Loading coach finder...</div>
        </div>
      </AthleteLayout>
    )
  }

  const verifiedCoachCount = coaches.filter(c => c.verified_at).length

  return (
    <AthleteLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="display-font text-3xl text-white mb-2">COACH FINDER</h1>
            <p className="text-gray-400">
              {schools.length} schools · {verifiedCoachCount} verified coaches
            </p>
          </div>
          <button
            onClick={() => setShowAddCoachModal(true)}
            className="btn-primary"
          >
            + Add Coach
          </button>
        </div>

        {/* Feature 5: Recommended for You */}
        {!quizResponses?.completed_at ? (
          <div className="border-t-2 border-crimson-600 bg-navy-900 rounded-lg p-6 mb-8 text-center">
            <h2 className="display-font text-xl text-white mb-4">RECOMMENDED FOR YOU</h2>
            <p className="text-gray-400 mb-4">
              Take the School Fit Quiz for personalized recommendations based on your preferences for academics, distance, school size, and more.
            </p>
            <button
              onClick={() => navigate('/school-fit-quiz')}
              className="btn-primary text-lg px-6 py-3"
            >
              Take the School Fit Quiz for personalized recommendations →
            </button>
          </div>
        ) : profile?.athlete?.class_year && profile?.athlete?.gpa ? (
          <div className="border-t-2 border-crimson-600 bg-navy-900 rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="display-font text-xl text-white">RECOMMENDED FOR YOU</h2>
              <span className="text-xs text-green-500 font-bold">✓ QUIZ COMPLETED</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              {getRecommendedSchools().map((school) => {
                const fitScore = school.fitScore
                const fitBadge = getFitScoreBadge(fitScore, quizResponses?.completed_at)
                const coachCounts = getCoachCounts(school.id)
                const isInPipeline = pipeline.includes(school.name)

                return (
                  <div
                    key={school.id}
                    className="bg-navy-900 rounded-lg p-4 text-center h-80 cursor-pointer hover:bg-navy-800 transition-colors"
                    onClick={() => scrollToSchool(school.id)}
                    style={{
                      background: `linear-gradient(135deg, ${school.primary_color || '#dc2626'}08, #0F1E36)`
                    }}
                  >
                    <div className="relative h-full flex flex-col">
                      {/* Fit Score Badge */}
                      <span className={`absolute -top-2 -right-2 px-2 py-1 rounded text-xs font-bold ${fitBadge.className} z-10`}>
                        {fitScore}
                      </span>

                      {/* School Info */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-white font-bold text-sm mb-1 leading-tight">
                            {school.name.length > 25 ? `${school.name.substring(0, 25)}...` : school.name}
                          </h3>

                          {school.conference && (
                            <p className="text-gray-400 text-xs mb-2">{school.conference}</p>
                          )}

                          {(school.city || school.state) && (
                            <p className="text-gray-400 text-xs mb-3">
                              {[school.city, school.state].filter(Boolean).join(', ')}
                            </p>
                          )}

                          <div className="flex items-center justify-center gap-1 mb-3">
                            {school.division && (
                              <span
                                className="px-1 py-0.5 rounded text-xs font-bold text-white"
                                style={{ backgroundColor: school.primary_color || '#dc2626' }}
                              >
                                {school.division}
                              </span>
                            )}
                          </div>

                          <p className="text-gray-400 text-xs mb-4">
                            {coachCounts.total} coach{coachCounts.total !== 1 ? 'es' : ''} · {coachCounts.withEmails} with emails
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddToPipeline(school)
                          }}
                          className={`w-full text-xs py-2 px-2 rounded font-bold ${
                            isInPipeline
                              ? 'bg-green-600 text-white'
                              : 'bg-crimson-600 hover:bg-crimson-700 text-white'
                          }`}
                        >
                          {isInPipeline ? 'Added ✓' : 'Add to Pipeline'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="border-t-2 border-crimson-600 bg-navy-900 rounded-lg p-6 mb-8 text-center">
            <p className="text-gray-400">
              Complete your profile to see personalized recommendations
              <button
                onClick={() => navigate('/profile')}
                className="text-crimson-600 ml-2 underline hover:text-crimson-500"
              >
                → Go to Profile
              </button>
            </p>
          </div>
        )}

        {/* Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div>
            <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
              Division
            </label>
            <select
              value={filters.division}
              onChange={(e) => setFilters(prev => ({ ...prev, division: e.target.value }))}
              className="input-field"
            >
              <option value="All">All</option>
              <option value="D1">D1</option>
              <option value="D2">D2</option>
              <option value="D3">D3</option>
              <option value="NAIA">NAIA</option>
              <option value="JUCO">JUCO</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
              Conference
            </label>
            <select
              value={filters.conference}
              onChange={(e) => setFilters(prev => ({ ...prev, conference: e.target.value }))}
              className="input-field"
            >
              <option value="All">All</option>
              {conferences.map(conf => (
                <option key={conf} value={conf}>{conf}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
              Region
            </label>
            <select
              value={filters.region}
              onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
              className="input-field"
            >
              <option value="All">All</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
              State
            </label>
            <select
              value={filters.state}
              onChange={(e) => setFilters(prev => ({ ...prev, state: e.target.value }))}
              className="input-field"
            >
              <option value="All">All</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
              Search School Name
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="input-field"
              placeholder="Type to search schools..."
            />
          </div>
        </div>

        {/* Schools Grid */}
        {filteredSchools.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-gray-400 mb-4">
              {schools.length === 0 ? (
                'No schools in the database yet. Seed data is coming.'
              ) : (
                'No schools match your current filters.'
              )}
            </div>
            {schools.length === 0 && (
              <p className="text-gray-500 text-sm">
                The schools database will be populated in the next phase.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchools.map((school) => {
              const coachCounts = getCoachCounts(school.id)
              const isExpanded = expandedSchool === school.id
              const fitScore = calculateFitScore(school, quizResponses, profile)
              const fitBadge = getFitScoreBadge(fitScore, quizResponses?.completed_at)
              const isInPipeline = pipeline.includes(school.name)

              return (
                <div
                  key={school.id}
                  id={`school-${school.id}`}
                  className="card relative"
                  style={{
                    background: `linear-gradient(135deg, ${school.primary_color || '#dc2626'}05, #0F1E36)`
                  }}
                >
                  {/* Feature 3: Fit Score Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${fitBadge.className}`}>
                      {fitScore !== null ? fitScore : fitBadge.text}
                    </span>
                  </div>

                  {/* School header with color border */}
                  <div
                    className="border-l-8 pl-4 -ml-6 -mt-6 -mr-6 p-6 mb-4"
                    style={{ borderLeftColor: school.primary_color || '#dc2626' }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-16"> {/* Add padding for fit score badge */}
                        <h3 className="text-white font-bold text-lg mb-1">
                          {school.name}
                        </h3>

                        <div className="flex items-center gap-2 mb-2">
                          {school.division && (
                            <span
                              className="px-2 py-1 rounded text-xs font-bold text-white"
                              style={{ backgroundColor: school.primary_color || '#dc2626' }}
                            >
                              {school.division}
                            </span>
                          )}
                          {school.conference && (
                            <span className="text-gray-400 text-sm">
                              {school.conference}
                            </span>
                          )}
                        </div>

                        {(school.city || school.state) && (
                          <p className="text-gray-400 text-sm mb-3">
                            {[school.city, school.state].filter(Boolean).join(', ')}
                          </p>
                        )}

                        <div className="text-gray-400 text-sm mb-3">
                          {coachCounts.total === 0 ? (
                            'No coaches yet'
                          ) : (
                            `${coachCounts.total} coach${coachCounts.total !== 1 ? 'es' : ''} · ${coachCounts.withEmails} with emails`
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setExpandedSchool(isExpanded ? null : school.id)}
                        className="btn-secondary text-sm"
                        disabled={coachCounts.total === 0}
                      >
                        {isExpanded ? 'Hide Coaches' : 'View Coaches'}
                      </button>

                      {/* Feature 1: Add to Pipeline Button */}
                      <button
                        onClick={() => handleAddToPipeline(school)}
                        className={`text-sm px-4 py-2 rounded font-bold ${
                          isInPipeline
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'btn-primary'
                        }`}
                      >
                        {isInPipeline ? 'Added ✓' : 'Add to Pipeline'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded coach list */}
                  {isExpanded && (
                    <div className="space-y-3">
                      {/* Program Email Section */}
                      {school.program_email && (
                        <div className="bg-green-900 bg-opacity-20 border border-green-600 border-opacity-30 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h4 className="text-white font-medium mb-1 flex items-center gap-2">
                                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded font-bold">✓ VERIFIED</span>
                                PROGRAM EMAIL
                              </h4>
                              <p className="text-gray-300 text-sm mb-1">{school.program_email}</p>
                              <p className="text-gray-400 text-xs">
                                Email the program directly — they forward to the recruiting coordinator.
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => navigator.clipboard.writeText(school.program_email)}
                                className="text-gray-500 hover:text-white text-xs"
                                title="Copy email"
                              >
                                📋
                              </button>
                              <button
                                onClick={() => {
                                  console.log('Navigate to outreach with program email:', {
                                    email: school.program_email,
                                    school_id: school.id
                                  })
                                }}
                                className="btn-secondary text-xs py-1 px-2"
                              >
                                Email Program
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {getSchoolCoaches(school.id).map((coach) => {
                        const verification = getVerificationStatus(coach)

                        return (
                          <div key={coach.id} className="bg-navy-900 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="text-white font-medium">{coach.name}</h4>
                                {coach.title && (
                                  <p className="text-gray-400 text-sm">{coach.title}</p>
                                )}

                                {/* Show helpful message for unverified coaches */}
                                {coach.name.includes('Needs Verification') && (
                                  <div className="mt-2 p-2 bg-yellow-900 bg-opacity-20 border border-yellow-600 border-opacity-30 rounded text-yellow-200 text-xs">
                                    We couldn't verify this coach yet. Try the program email above, or help us by adding the current coach's info.
                                  </div>
                                )}

                                {coach.email && (
                                  <div className="flex items-center gap-2 mt-1">
                                    {/* Feature 4: Verification Signal */}
                                    <div
                                      className={`w-2 h-2 rounded-full ${verification.dot}`}
                                      title={verification.tooltip}
                                    ></div>
                                    <span className="text-gray-300 text-sm">{coach.email}</span>
                                    <button
                                      onClick={() => navigator.clipboard.writeText(coach.email)}
                                      className="text-gray-500 hover:text-white text-xs"
                                      title="Copy email"
                                    >
                                      📋
                                    </button>
                                  </div>
                                )}
                                {coach.phone && (
                                  <p className="text-gray-300 text-sm">{coach.phone}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => console.log('Flag as stale:', coach)}
                                  className="text-xs text-gray-500 hover:text-yellow-500"
                                  title="Flag as stale"
                                >
                                  ⚠️
                                </button>

                                {/* Add/Update Coach button for unverified coaches */}
                                {coach.name.includes('Needs Verification') ? (
                                  <button
                                    onClick={() => {
                                      setNewCoach({
                                        school_id: school.id,
                                        name: '',
                                        title: 'Head Coach',
                                        email: '',
                                        phone: '',
                                        visibility: 'private'
                                      })
                                      setShowAddCoachModal(true)
                                    }}
                                    className="btn-primary text-xs py-1 px-2"
                                  >
                                    Add / Update Coach
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleEmailCoach(coach, school)}
                                    className="btn-secondary text-xs py-1 px-2"
                                  >
                                    Email Coach
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Add Coach Modal */}
        {showAddCoachModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-navy-900 rounded-lg p-6 w-full max-w-md">
              <h2 className="display-font text-xl text-white mb-6">ADD COACH</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                    School
                  </label>
                  <select
                    value={newCoach.school_id}
                    onChange={(e) => setNewCoach(prev => ({ ...prev, school_id: e.target.value }))}
                    className="input-field"
                    required
                  >
                    <option value="">Select a school</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                  {schools.length === 0 && (
                    <p className="text-gray-500 text-xs mt-1">
                      No schools available. Schools will be added in seed data.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                    Coach Name
                  </label>
                  <input
                    type="text"
                    value={newCoach.name}
                    onChange={(e) => setNewCoach(prev => ({ ...prev, name: e.target.value }))}
                    className="input-field"
                    placeholder="John Smith"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newCoach.title}
                    onChange={(e) => setNewCoach(prev => ({ ...prev, title: e.target.value }))}
                    className="input-field"
                    placeholder="Head Coach"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newCoach.email}
                    onChange={(e) => setNewCoach(prev => ({ ...prev, email: e.target.value }))}
                    className="input-field"
                    placeholder="coach@school.edu"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newCoach.phone}
                    onChange={(e) => setNewCoach(prev => ({ ...prev, phone: e.target.value }))}
                    className="input-field"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                    Visibility
                  </label>
                  <select
                    value={newCoach.visibility}
                    onChange={(e) => setNewCoach(prev => ({ ...prev, visibility: e.target.value }))}
                    className="input-field"
                  >
                    <option value="private">Private to me</option>
                    <option value="club">Share with my club</option>
                    <option value="shared">Share with everyone</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowAddCoachModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCoach}
                  className="btn-primary flex-1"
                  disabled={!newCoach.school_id || !newCoach.name}
                >
                  Add Coach
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AthleteLayout>
  )
}