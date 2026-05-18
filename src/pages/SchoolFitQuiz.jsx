import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/authContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AthleteLayout from '../components/AthleteLayout.jsx'
import SchoolDetailModal from '../components/SchoolDetailModal.jsx'
import SchoolResultCard from '../components/SchoolResultCard.jsx'
import { calculateFitScore } from '../lib/fitScore.js'
import { logActivity } from '../lib/activity.js'

const QUESTIONS = [
  {
    id: 1,
    question: "What size school fits you best?",
    field: "school_size",
    answers: [
      { value: "small", label: "Small", description: "under 5,000 students" },
      { value: "medium", label: "Medium", description: "5,000–15,000" },
      { value: "large", label: "Large", description: "15,000+" },
      { value: "no_preference", label: "No preference", description: "" }
    ]
  },
  {
    id: 2,
    question: "How far from home are you willing to go?",
    field: "distance_from_home",
    answers: [
      { value: "driving_distance", label: "Within driving distance", description: "" },
      { value: "same_region", label: "Same region of the country", description: "" },
      { value: "anywhere", label: "Anywhere in the US", description: "" }
    ]
  },
  {
    id: 3,
    question: "What's your academic priority?",
    field: "academic_priority",
    answers: [
      { value: "ivy_tier", label: "Ivy-tier academics", description: "" },
      { value: "strong_academic", label: "Strong academic reputation", description: "" },
      { value: "balanced", label: "Balanced academics and soccer", description: "" },
      { value: "soccer_first", label: "Soccer first, academics secondary", description: "" }
    ]
  },
  {
    id: 4,
    question: "Which NCAA divisions are you targeting?",
    field: "division_target",
    answers: [
      { value: "d1_only", label: "D1 only", description: "" },
      { value: "d1_d2", label: "D1 and D2", description: "" },
      { value: "d2_d3", label: "D2 and D3", description: "" },
      { value: "all_divisions", label: "Open to all divisions", description: "" }
    ]
  },
  {
    id: 5,
    question: "What's your playing time expectation?",
    field: "playing_time",
    answers: [
      { value: "start_freshman", label: "Start as a freshman", description: "" },
      { value: "bench_contributor", label: "Contribute off the bench", description: "" },
      { value: "develop_four_years", label: "Develop over 4 years", description: "" },
      { value: "happy_anywhere", label: "Happy anywhere I'm wanted", description: "" }
    ]
  },
  {
    id: 6,
    question: "How important is cost and financial aid?",
    field: "cost_sensitivity",
    answers: [
      { value: "significant_aid_needed", label: "I need significant aid to attend", description: "" },
      { value: "some_aid", label: "Some aid would help", description: "" },
      { value: "not_a_concern", label: "Cost is not a concern", description: "" }
    ]
  },
  {
    id: 7,
    question: "Which campus culture appeals most to you?",
    field: "campus_culture",
    answers: [
      { value: "rah_rah_sports", label: "Rah-rah sports school", description: "" },
      { value: "academic_focused", label: "Academic-focused", description: "" },
      { value: "artsy_creative", label: "Artsy / creative", description: "" },
      { value: "diverse_inclusive", label: "Diverse / inclusive", description: "" },
      { value: "chill_low_key", label: "Chill / low-key", description: "" }
    ]
  },
  {
    id: 8,
    question: "What do you want from your coach?",
    field: "coach_relationship_priority",
    answers: [
      { value: "high_trust", label: "A coach who believes in me and I can trust", description: "" },
      { value: "developmental", label: "A coach focused on developing my game", description: "" },
      { value: "balanced", label: "A balance of trust and development", description: "" },
      { value: "results_focused", label: "A results-driven, competitive coach", description: "" }
    ]
  },
  {
    id: 9,
    question: "What program prestige are you aiming for?",
    field: "program_prestige",
    answers: [
      { value: "top_25", label: "Top 25 nationally ranked", description: "" },
      { value: "top_50", label: "Top 50 nationally ranked", description: "" },
      { value: "competitive_in_conference", label: "Competitive in a good conference", description: "" },
      { value: "any_program", label: "Any strong program", description: "" }
    ]
  },
  {
    id: 10,
    question: "Which athlete support services matter most?",
    field: "support_services_priority",
    answers: [
      { value: "strong_academic_support", label: "Strong academic tutoring / support", description: "" },
      { value: "sports_psych", label: "Sports psychology / mental health", description: "" },
      { value: "dietitian_medical", label: "Dietitian / medical / injury care", description: "" },
      { value: "less_critical", label: "Less critical for me", description: "" }
    ]
  }
]

export default function SchoolFitQuiz() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [currentQuestion, setCurrentQuestion] = useState(1)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [isComplete, setIsComplete] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [schools, setSchools] = useState([])
  const [pipeline, setPipeline] = useState([])
  const [modalSchool, setModalSchool] = useState(null)
  const [showToast, setShowToast] = useState('')

  // Load existing quiz responses on mount
  useEffect(() => {
    async function loadData(userId) {
      if (!userId) return

      try {
        // Load quiz responses
        const { data, error } = await supabase
          .from('school_fit_quiz_responses')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (error && error.code !== 'PGRST116') { // Not found is ok
          console.error('Error loading quiz responses:', error)
        } else if (data) {
          // Load existing responses
          const existingAnswers = {}
          QUESTIONS.forEach(q => {
            if (data[q.field]) {
              existingAnswers[q.field] = data[q.field]
            }
          })
          setAnswers(existingAnswers)

          // If quiz was completed, show completion screen
          if (data.completed_at) {
            setIsComplete(true)
          }
        }

        // Load schools for completion screen recommendations
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('schools')
          .select('*')
          .order('name')

        if (schoolsError) {
          console.error('Error loading schools:', schoolsError)
        } else {
          setSchools(schoolsData || [])
        }

        // Load user's pipeline
        const { data: pipelineData, error: pipelineError } = await supabase
          .from('pipelines')
          .select('school')
          .eq('athlete_id', userId)

        if (pipelineError) {
          console.error('Error loading pipeline:', pipelineError)
        } else {
          setPipeline(pipelineData?.map(p => p.school) || [])
        }
      } catch (error) {
        console.error('Error loading quiz data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData(user?.id)
  }, [user?.id])

  // Pipeline management
  const handleAddToPipeline = async (school) => {
    if (!user?.id || !profile?.org_id) return

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
            org_id: profile.org_id,
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

  // Open school modal
  const openSchoolModal = (school) => {
    setModalSchool(school)
  }

  // Save answer and move to next question
  const handleAnswerSelect = async (questionField, answerValue) => {
    if (isAnimating) return

    setIsAnimating(true)

    // Update local state
    const newAnswers = { ...answers, [questionField]: answerValue }
    setAnswers(newAnswers)

    // Save to database silently
    try {
      const isLastQuestion = currentQuestion === QUESTIONS.length
      const saveData = {
        user_id: user.id,
        [questionField]: answerValue,
        completed_at: isLastQuestion ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }

      await supabase
        .from('school_fit_quiz_responses')
        .upsert(saveData, { onConflict: 'user_id' })

      // Log quiz completion
      if (isLastQuestion) {
        await logActivity(user.id, 'quiz_completed')
      }

    } catch (error) {
      console.error('Error saving quiz response:', error)
    }

    // Auto-advance after delay
    setTimeout(() => {
      if (currentQuestion === QUESTIONS.length) {
        setIsComplete(true)
      } else {
        setCurrentQuestion(prev => prev + 1)
      }
      setIsAnimating(false)
    }, 300)
  }

  // Navigate between questions
  const handlePrevious = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleNext = () => {
    if (currentQuestion < QUESTIONS.length) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  // Start over
  const handleRetake = async () => {
    try {
      await supabase
        .from('school_fit_quiz_responses')
        .delete()
        .eq('user_id', user.id)
    } catch (error) {
      console.error('Error clearing quiz responses:', error)
    }

    setAnswers({})
    setCurrentQuestion(1)
    setIsComplete(false)
  }

  // Get top 10 school matches using completed quiz responses.
  // Previously short-circuited to [] when profile.athlete was missing —
  // breaking the quiz for athletes who hadn't completed onboarding. Now
  // we always compute scores; calculateFitScore handles missing athlete
  // data with sensible defaults (region falls back to WA, GPA component
  // gets a neutral score).
  const getTopMatches = () => {
    const quizResponses = {
      ...answers,
      completed_at: new Date().toISOString()
    }

    return schools
      .map(school => ({
        ...school,
        fitScore: calculateFitScore(school, quizResponses, profile)
      }))
      .sort((a, b) => {
        // Sort by fitScore descending, but put null scores at the end
        if (a.fitScore === null && b.fitScore === null) return 0
        if (a.fitScore === null) return 1
        if (b.fitScore === null) return -1
        return b.fitScore - a.fitScore
      })
      .slice(0, 10)
  }


  if (loading) {
    return (
      <AthleteLayout>
        <div className="p-8">
          <div className="text-white">Loading quiz...</div>
        </div>
      </AthleteLayout>
    )
  }

  // Completion screen
  if (isComplete) {
    const topMatches = getTopMatches()

    return (
      <AthleteLayout>
        <div className="p-8 max-w-6xl mx-auto">
          {/* Toast notification */}
          {showToast && (
            <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg">
              {showToast}
            </div>
          )}

          <div style={{ marginBottom: '28px' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
              <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>Quiz complete</span>
            </div>
            <h1 className="display-font text-white" style={{ fontSize: '36px', margin: 0 }}>Your top matches</h1>
            <p className="text-text-secondary text-sm mt-1">Schools recommended based on your quiz responses</p>
          </div>

          {/* TOP 10 RESULTS */}
          {topMatches.length > 0 && (
            <div className="mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topMatches.map((school) => {
                  const fitScore = school.fitScore
                  const isInPipeline = pipeline.includes(school.name)

                  return (
                    <SchoolResultCard
                      key={school.id}
                      school={school}
                      isInPipeline={isInPipeline}
                      fitScore={fitScore}
                      onAddToPipeline={() => handleAddToPipeline(school)}
                      onViewSchool={() => openSchoolModal(school)}
                      showCoachInfo={true}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="text-center space-y-4">
            <button
              onClick={() => navigate('/coach-finder')}
              className="btn-primary text-lg px-8 py-3"
            >
              SEE ALL SCHOOLS →
            </button>

            <button
              onClick={handleRetake}
              className="btn-secondary block mx-auto"
            >
              Retake Quiz
            </button>
          </div>
        </div>

        {/* School Detail Modal */}
        <SchoolDetailModal
          school={modalSchool}
          isOpen={modalSchool !== null}
          onClose={() => setModalSchool(null)}
          athleteProfile={profile}
          onAddToPipeline={handleAddToPipeline}
          onRemoveFromPipeline={handleAddToPipeline}
          isInPipeline={modalSchool ? pipeline.includes(modalSchool.name) : false}
          fitScore={modalSchool ? calculateFitScore(modalSchool, answers, profile) : null}
        />
      </AthleteLayout>
    )
  }

  const currentQ = QUESTIONS[currentQuestion - 1]
  const progress = (currentQuestion / QUESTIONS.length) * 100

  return (
    <AthleteLayout>
      <div className="p-8 max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>Find Your Fit</span>
            <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
          </div>
          <h1 className="display-font text-4xl text-white mb-1">School Fit Quiz</h1>
          <p className="text-text-secondary text-sm">
            10 questions. Tap to answer. Powers your personalized recommendations.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-white text-sm">{currentQuestion} of {QUESTIONS.length}</span>
            <span className="text-club-secondary font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-club-secondary h-3 rounded-full transition-all duration-500"
              style={{width: `${progress}%`}}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="text-center mb-8">
          <h2 className="display-font text-2xl text-white mb-8">
            {currentQ.question}
          </h2>

          {/* Answer Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {currentQ.answers.map((answer) => {
              const isSelected = answers[currentQ.field] === answer.value

              return (
                <button
                  key={answer.value}
                  onClick={() => handleAnswerSelect(currentQ.field, answer.value)}
                  disabled={isAnimating}
                  className={`p-6 rounded-lg border-2 transition-all duration-200 text-left min-h-[56px] ${
                    isSelected
                      ? 'bg-club-primary border-club-primary text-white'
                      : 'bg-navy-900 border-gray-600 text-gray-300 hover:border-club-primary hover:text-white'
                  }`}
                >
                  <div className="font-bold text-lg mb-1">{answer.label}</div>
                  {answer.description && (
                    <div className="text-sm opacity-80">{answer.description}</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between max-w-3xl mx-auto">
          <button
            onClick={handlePrevious}
            className={`btn-ghost ${currentQuestion === 1 ? 'invisible' : ''}`}
            disabled={currentQuestion === 1}
          >
            ← Previous
          </button>

          <button
            onClick={handleNext}
            className={`btn-secondary ${
              !answers[currentQ.field] || currentQuestion === QUESTIONS.length ? 'invisible' : ''
            }`}
            disabled={!answers[currentQ.field] || currentQuestion === QUESTIONS.length}
          >
            Next →
          </button>
        </div>
      </div>

      {/* School Detail Modal */}
      <SchoolDetailModal
        school={modalSchool}
        isOpen={modalSchool !== null}
        onClose={() => setModalSchool(null)}
        athleteProfile={profile}
        onAddToPipeline={handleAddToPipeline}
        onRemoveFromPipeline={handleAddToPipeline}
        isInPipeline={modalSchool ? pipeline.includes(modalSchool.name) : false}
        fitScore={modalSchool ? calculateFitScore(modalSchool, answers, profile) : null}
      />
    </AthleteLayout>
  )
}