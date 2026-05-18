import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/authContext'
import { useNavigate } from 'react-router-dom'
import AthleteLayout from '../components/AthleteLayout.jsx'
import SchoolDetailModal from '../components/SchoolDetailModal.jsx'
import SchoolBadge from '../components/SchoolBadge.jsx'
import SchoolResultCard from '../components/SchoolResultCard.jsx'
import { calculateFitScore } from '../lib/fitScore.js'
import { logActivity } from '../lib/activity.js'

export default function CoachFinder() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [rawSchools, setRawSchools] = useState([])
  const [coaches, setCoaches] = useState([])
  const [pipeline, setPipeline] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalSchool, setModalSchool] = useState(null)
  const [showAddCoachModal, setShowAddCoachModal] = useState(false)
  const [quizResponses, setQuizResponses] = useState(null)
  const [showToast, setShowToast] = useState('')

  // Pagination — how many school cards are visible in the grid
  const PAGE_SIZE = 25
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)

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
    async function loadData(userId) {
      try {
        // Load schools with coaches
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('*, coaches(*)')
          .order('name')

        if (schoolsError) {
          console.error('Error loading schools:', schoolsError)
        } else {
          setRawSchools(schoolsData || [])
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
        if (userId) {
          const { data: pipelineData, error: pipelineError } = await supabase
            .from('pipelines')
            .select('school')
            .eq('athlete_id', userId)

          if (pipelineError) {
            console.error('Error loading pipeline:', pipelineError)
          } else {
            setPipeline(pipelineData?.map(p => p.school) || [])
          }
        }

        // Load user's quiz responses
        if (userId) {
          const { data: quizData, error: quizError } = await supabase
            .from('school_fit_quiz_responses')
            .select('*')
            .eq('user_id', userId)
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

    loadData(user?.id)
  }, [user?.id])

  // Derived: enrich each raw school with a fit score whenever profile/quiz/raw data changes.
  // (Previously a useEffect that called setSchools — derivation is cleaner and avoids an extra render.)
  const schools = useMemo(() => {
    if (rawSchools.length === 0) return []
    return rawSchools.map(school => ({
      ...school,
      fitScore: profile ? calculateFitScore(school, quizResponses, profile) : null,
    }))
  }, [rawSchools, quizResponses, profile])

  // Update a single filter field and reset pagination to page 1
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setDisplayCount(PAGE_SIZE)
  }

  // School search aliases
  const schoolAliases = {
    'ucla': 'University of California, Los Angeles',
    'usc': 'University of Southern California',
    'unc': 'University of North Carolina',
    'usf': 'University of San Francisco',
    'smu': 'Southern Methodist University',
    'tcu': 'Texas Christian University',
    'byu': 'Brigham Young University',
    'cal': 'University of California, Berkeley',
    'pitt': 'University of Pittsburgh',
    'penn': 'University of Pennsylvania'
  }

  // Get unique values for filter dropdowns
  const conferences = [...new Set(schools.map(s => s.conference).filter(Boolean))]
  const regions = [...new Set(schools.map(s => s.region).filter(Boolean))]
  const states = [...new Set(schools.map(s => s.state).filter(Boolean))].sort()

  // Filter schools based on current filters
  const isSearching = filters.search.trim().length > 0
  const filteredSchools = schools
    .filter(school => {
      if (filters.division !== 'All' && school.division !== filters.division) return false
      if (filters.conference !== 'All' && school.conference !== filters.conference) return false
      if (filters.region !== 'All' && school.region !== filters.region) return false
      if (filters.state !== 'All' && school.state !== filters.state) return false

      // Enhanced search with aliases
      if (isSearching) {
        const searchTerm = filters.search.toLowerCase()
        const schoolName = school.name.toLowerCase()
        const aliasMatch = schoolAliases[searchTerm]

        if (!schoolName.includes(searchTerm) &&
            !(aliasMatch && schoolName.includes(aliasMatch.toLowerCase()))) {
          return false
        }
      }

      return true
    })
    // Sort: fit score descending when available, otherwise alphabetical
    .sort((a, b) => {
      if (a.fitScore !== null && b.fitScore !== null) return b.fitScore - a.fitScore
      if (a.fitScore !== null) return -1
      if (b.fitScore !== null) return 1
      return a.name.localeCompare(b.name)
    })

  // When actively searching, cap at 50 most relevant results.
  // Otherwise, show PAGE_SIZE at a time with "Load more".
  const cappedSchools = isSearching ? filteredSchools.slice(0, 50) : filteredSchools
  const visibleSchools = cappedSchools.slice(0, displayCount)
  const hasMore = !isSearching && displayCount < filteredSchools.length

  const handleLoadMore = () => {
    setLoadingMore(true)
    // Small timeout so the skeleton flickers for a frame — feels responsive
    setTimeout(() => {
      setDisplayCount(prev => prev + PAGE_SIZE)
      setLoadingMore(false)
    }, 300)
  }

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

  // Email-status badge / circular fit-score badge — preserved for future re-introduction
  // on the dense list view. Card view (SchoolResultCard) renders its own badge variants,
  // so these helpers are unused right now.
  // const getEmailStatusBadge = (school) => { ... }  (removed to satisfy lint; restore from git history when needed)
  // const getFitScoreCircle = (score) => { ... }

  // Enhanced school object with coach count for SchoolResultCard
  const enhanceSchoolForCard = (school, withCoaches = false) => {
    const coachCounts = withCoaches ? getCoachCounts(school.id) : { total: 0, withEmails: 0 }
    return {
      ...school,
      coaches_count: coachCounts.total
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

        // Log activity
        await logActivity(user.id, 'school_removed', { school_name: school.name })
      } else {
        // Add to pipeline
        await supabase
          .from('pipelines')
          .insert({
            athlete_id: user.id,
            org_id: profile?.org_id,
            school: school.name,
            stage: 'interested'
          })

        setPipeline(prev => [...prev, school.name])

        // Log activity
        await logActivity(user.id, 'school_added', { school_name: school.name })

        // Show success toast
        setShowToast(`Added ${school.name} to your pipeline ✓`)
        setTimeout(() => setShowToast(''), 2000)
      }
    } catch (error) {
      console.error('Error updating pipeline:', error)
    }
  }

  // handleEmailCoach / getVerificationStatus — preserved-but-not-wired helpers for the
  // per-coach action buttons we plan to surface inside the inline coach list. The current
  // UI funnels users into the school modal first, so these aren't called yet.
  // const handleEmailCoach = (coach, school) => navigate(`/outreach?coach_id=${coach.id}&school_id=${school.id}`)
  // const getVerificationStatus = (coach) => { ... }

  // Feature 5: Get recommended schools
  const getRecommendedSchools = () => {
    if (!profile?.athlete?.class_year || !profile?.athlete?.gpa) {
      return []
    }

    return schools
      .filter(school => school.fitScore !== null) // Only show schools with fit scores for recommendations
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 6)
  }

  // Open school modal
  const openSchoolModal = (school) => {
    // Attach coaches to school object
    const schoolWithCoaches = {
      ...school,
      coaches: coaches.filter(c => c.school_id === school.id)
    }
    setModalSchool(schoolWithCoaches)
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
          <div className="text-fg-primary">Loading coach finder...</div>
        </div>
      </AthleteLayout>
    )
  }

  const verifiedCoachCount = coaches.filter(c => c.verified_at).length

  return (
    <AthleteLayout>
      <div className="p-8">
        {/* Toast notification */}
        {showToast && (
          <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg">
            {showToast}
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
              <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>The Database</span>
            </div>
            <h1 className="display-font text-4xl text-fg-primary mb-1">Coach Finder</h1>
            <p className="text-text-secondary text-sm">
              {filteredSchools.length < schools.length
                ? `${filteredSchools.length} of ${schools.length} schools`
                : `${schools.length} schools`
              } · {verifiedCoachCount} verified coaches
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
          <div className="design-card p-6 mb-8 text-center">
            <h2 className="display-font text-xl text-fg-primary mb-4">RECOMMENDED FOR YOU</h2>
            <p className="text-text-tertiary mb-4">
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
          <div className="design-card p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h2 className="display-font text-xl text-fg-primary">RECOMMENDED FOR YOU</h2>
                <span className="text-xs text-eastside-gold font-medium px-2 py-1 rounded bg-eastside-gold bg-opacity-10">
                  Quiz complete
                </span>
              </div>
            </div>
            <div className="flex md:grid md:grid-cols-6 overflow-x-auto md:overflow-x-visible gap-3 snap-x md:snap-none snap-mandatory pb-2">
              {getRecommendedSchools().map((school) => {
                const fitScore = school.fitScore
                const isInPipeline = pipeline.includes(school.name)
                const enhancedSchool = enhanceSchoolForCard(school, true)

                return (
                  <div key={school.id} className="min-w-[280px] md:min-w-0 snap-start">
                    <SchoolResultCard
                      school={enhancedSchool}
                      isInPipeline={isInPipeline}
                      fitScore={fitScore}
                      onAddToPipeline={() => handleAddToPipeline(school)}
                      onViewSchool={() => openSchoolModal(school)}
                      showCoachInfo={true}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="design-card p-6 mb-8 text-center">
            <p className="text-text-tertiary">
              Complete your profile to see personalized recommendations
              <button
                onClick={() => navigate('/profile')}
                className="text-club-primary ml-2 underline hover:text-club-primary"
              >
                → Go to Profile
              </button>
            </p>
          </div>
        )}

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <div>
            <label className="block text-text-tertiary text-sm uppercase tracking-wider mb-2">
              Division
            </label>
            <select
              value={filters.division}
              onChange={(e) => updateFilter('division', e.target.value)}
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
            <label className="block text-text-tertiary text-sm uppercase tracking-wider mb-2">
              Conference
            </label>
            <select
              value={filters.conference}
              onChange={(e) => updateFilter('conference', e.target.value)}
              className="input-field"
            >
              <option value="All">All</option>
              {conferences.map(conf => (
                <option key={conf} value={conf}>{conf}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-text-tertiary text-sm uppercase tracking-wider mb-2">
              Region
            </label>
            <select
              value={filters.region}
              onChange={(e) => updateFilter('region', e.target.value)}
              className="input-field"
            >
              <option value="All">All</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-text-tertiary text-sm uppercase tracking-wider mb-2">
              State
            </label>
            <select
              value={filters.state}
              onChange={(e) => updateFilter('state', e.target.value)}
              className="input-field"
            >
              <option value="All">All</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-text-tertiary text-sm uppercase tracking-wider mb-2">
              Search School Name
            </label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="input-field"
              placeholder="Type to search schools..."
            />
          </div>
        </div>

        {/* Schools Grid */}
        {filteredSchools.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-text-tertiary mb-4">
              {schools.length === 0 ? (
                'No schools in the database yet. Seed data is coming.'
              ) : (
                'No schools match your current filters.'
              )}
            </div>
            {schools.length === 0 && (
              <p className="text-text-muted text-sm">
                The schools database will be populated in the next phase.
              </p>
            )}
          </div>
        ) : (
          <>
            {isSearching && (
              <p className="text-text-secondary text-xs uppercase tracking-widest font-bold mb-4">
                {cappedSchools.length} result{cappedSchools.length !== 1 ? 's' : ''}
                {filteredSchools.length > 50 ? ` (showing top 50)` : ''}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleSchools.map((school) => {
                const fitScore = school.fitScore
                const isInPipeline = pipeline.includes(school.name)
                const enhancedSchool = enhanceSchoolForCard(school, true)

                return (
                  <SchoolResultCard
                    key={school.id}
                    school={enhancedSchool}
                    isInPipeline={isInPipeline}
                    fitScore={fitScore}
                    onAddToPipeline={() => handleAddToPipeline(school)}
                    onViewSchool={() => openSchoolModal(school)}
                    showCoachInfo={true}
                  />
                )
              })}

              {/* Loading skeleton cards */}
              {loadingMore && Array.from({ length: 3 }).map((_, i) => (
                <div key={`skeleton-${i}`} className="design-card p-4 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded mb-3 w-3/4" />
                  <div className="h-3 bg-gray-800 rounded mb-2 w-1/2" />
                  <div className="h-3 bg-gray-800 rounded w-2/3" />
                </div>
              ))}
            </div>

            {/* Load More button */}
            {hasMore && !loadingMore && (
              <div className="flex flex-col items-center gap-2 mt-8">
                <button
                  onClick={handleLoadMore}
                  className="btn-ghost px-8 py-3"
                >
                  Load more schools
                </button>
                <p className="text-text-tertiary text-xs">
                  Showing {visibleSchools.length} of {filteredSchools.length} schools
                </p>
              </div>
            )}
          </>
        )}

        {/* Add Coach Modal */}
        {showAddCoachModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-navy-900 rounded-lg p-6 w-full max-w-md">
              <h2 className="display-font text-xl text-fg-primary mb-6">ADD COACH</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-text-tertiary text-sm uppercase tracking-wider mb-2">
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
                    <p className="text-text-muted text-xs mt-1">
                      No schools available. Schools will be added in seed data.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-text-tertiary text-sm uppercase tracking-wider mb-2">
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
                  <label className="block text-text-tertiary text-sm uppercase tracking-wider mb-2">
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
                  <label className="block text-text-tertiary text-sm uppercase tracking-wider mb-2">
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
                  <label className="block text-text-tertiary text-sm uppercase tracking-wider mb-2">
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
                  <label className="block text-text-tertiary text-sm uppercase tracking-wider mb-2">
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

        {/* School Detail Modal */}
        <SchoolDetailModal
          school={modalSchool}
          isOpen={modalSchool !== null}
          onClose={() => setModalSchool(null)}
          athleteProfile={profile}
          onAddToPipeline={handleAddToPipeline}
          onRemoveFromPipeline={handleAddToPipeline}
          isInPipeline={modalSchool ? pipeline.includes(modalSchool.name) : false}
          fitScore={modalSchool ? calculateFitScore(modalSchool, quizResponses, profile) : null}
        />
      </div>
    </AthleteLayout>
  )
}