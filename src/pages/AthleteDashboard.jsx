import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AthleteLayout from '../components/AthleteLayout.jsx'
import EastsideFCLogo from '../components/EastsideFC_Logo.jsx'
import { calculateFitScore } from '../lib/fitScore.js'
import { calculateRecruitingScore } from '../lib/recruitingScore.js'
import { calculateStreak } from '../lib/streaks.js'
import { getNextAction } from '../lib/nextAction.js'
import { timeAgo } from '../lib/timeAgo.js'
import RecruitingScoreBreakdown from '../components/RecruitingScoreBreakdown.jsx'
import { format } from 'date-fns'
import SchoolBadge from '../components/SchoolBadge.jsx'
import { getSchoolColors, isLightColor } from '../lib/schoolColors'

// Top School Row Component
function TopSchoolRow({ school, profile }) {
  const schoolName = school.schools?.name || school.school
  const schoolColors = getSchoolColors(schoolName)

  const fitScore = calculateFitScore(school.schools, null, profile)

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-card-hover transition-colors group">
      <SchoolBadge schoolName={school.schools?.name || school.school} size="sm" />
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-medium text-[13px] truncate">{school.schools?.name || school.school}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-medium text-white bg-text-muted">
            {school.schools?.division || 'D1'}
          </span>
          {fitScore && (
            <span className="text-text-tertiary text-[10px]">
              {fitScore}% fit
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AthleteDashboard() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)

  // Existing data
  const [pipelineCount, setPipelineCount] = useState(0)
  const [recentSchools, setRecentSchools] = useState([])

  // New dashboard data
  const [activities, setActivities] = useState([])
  const [recruitingScore, setRecruitingScore] = useState({ score: 0, breakdown: {} })
  const [streak, setStreak] = useState(0)
  const [nextAction, setNextAction] = useState({ title: '', cta: '', href: '' })
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [recentEmailsSent, setRecentEmailsSent] = useState(0)
  const [highlightsCount, setHighlightsCount] = useState(0)
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadDashboardData(user.id)
    }
  }, [user?.id])

  const loadDashboardData = async (userId) => {
    if (!userId) return

    try {
      // 1. Load pipeline count and recent schools (existing)
      const { data: countData, error: countError, count } = await supabase
        .from('pipelines')
        .select('id', { count: 'exact' })
        .eq('athlete_id', userId)

      if (countError) throw countError
      setPipelineCount(count || 0)

      // Load recent schools - Step 1: Get pipeline data
      const { data: recentData, error: recentError } = await supabase
        .from('pipelines')
        .select('*')
        .eq('athlete_id', userId)
        .order('updated_at', { ascending: false })
        .limit(3)

      if (recentError) throw recentError

      // Step 2: Lookup school details for each pipeline entry
      const pipelinesWithSchools = []
      for (const pipeline of recentData || []) {
        const { data: schoolData } = await supabase
          .from('schools')
          .select('name, division, primary_color, conference, state')
          .eq('name', pipeline.school)
          .single()

        pipelinesWithSchools.push({
          ...pipeline,
          schools: schoolData || { name: pipeline.school }
        })
      }

      setRecentSchools(pipelinesWithSchools)

      // 2. Load quiz completion status
      const { data: quizData } = await supabase
        .from('school_fit_quiz_responses')
        .select('completed_at')
        .eq('user_id', userId)
        .single()

      setQuizCompleted(!!quizData?.completed_at)

      // 3. Load recent emails
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const { count: emailCount } = await supabase
        .from('outreach')
        .select('id', { count: 'exact' })
        .eq('athlete_id', userId)
        .gte('sent_at', thirtyDaysAgo)

      setRecentEmailsSent(emailCount || 0)

      // 4. Load highlights count
      const { count: hlCount } = await supabase
        .from('highlights')
        .select('id', { count: 'exact' })
        .eq('athlete_id', userId)

      setHighlightsCount(hlCount || 0)

      // 5. Load recent activities
      const { data: activityData } = await supabase
        .from('recruiting_activity')
        .select('*')
        .eq('athlete_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      setActivities(activityData || [])

      // 6. Calculate streak and recruiting score
      const [streakResult, scoreResult] = await Promise.all([
        calculateStreak(userId),
        calculateRecruitingScore(userId)
      ])

      setStreak(streakResult)
      setRecruitingScore(scoreResult)

      // 7. Compute next action
      const action = getNextAction({
        profile,
        pipelineCount: count || 0,
        quizCompleted: !!quizData?.completed_at,
        recentEmailsSent: emailCount || 0,
        openedEmails: [], // TODO: implement opened emails detection
        visitingSchools: [] // TODO: implement visiting schools detection
      })

      setNextAction(action)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStageColor = (stage) => {
    const colors = {
      interested: 'bg-gray-600',
      contacted: 'bg-blue-600',
      visiting: 'bg-club-secondary',
      offer: 'bg-orange-500',
      committed: 'bg-green-600'
    }
    return colors[stage] || 'bg-gray-600'
  }

  // Activity feed helper functions
  function getActivityIcon(type) {
    const icons = {
      school_added: '🎯',
      school_removed: '✖️',
      stage_changed: '➡️',
      note_saved: '📝',
      email_sent: '📧',
      quiz_completed: '✅',
      profile_updated: '👤',
      school_viewed: '👀'
    }
    return icons[type] || '•'
  }

  function formatActivity(a) {
    const d = a.activity_data || {}
    switch (a.activity_type) {
      case 'school_added': return `Added ${d.school_name || 'a school'} to pipeline`
      case 'school_removed': return `Removed ${d.school_name || 'a school'} from pipeline`
      case 'stage_changed': return `Moved ${d.school_name || 'a school'} to ${d.to_stage?.toUpperCase() || 'a new stage'}`
      case 'note_saved': return `Saved notes on ${d.school_name || 'a school'}`
      case 'email_sent': return `Emailed ${d.coach_name || 'a coach'} at ${d.school_name || 'a school'}`
      case 'quiz_completed': return 'Completed School Fit Quiz'
      case 'profile_updated': return 'Updated your athlete profile'
      case 'school_viewed': return `Viewed ${d.school_name || 'a school'}`
      default: return 'Recruiting activity'
    }
  }

  function getActivityIconColor(type) {
    const colors = {
      school_added: 'bg-eastside-crimson',
      school_removed: 'bg-gray-600',
      stage_changed: 'bg-blue-600',
      note_saved: 'bg-gray-600',
      email_sent: 'bg-blue-600',
      quiz_completed: 'bg-green-600',
      profile_updated: 'bg-orange-600',
      school_viewed: 'bg-orange-600'
    }
    return colors[type] || 'bg-gray-600'
  }

  function getActivityIconSymbol(type) {
    const symbols = {
      school_added: '+',
      school_removed: '×',
      stage_changed: '→',
      note_saved: '📝',
      email_sent: '✉',
      quiz_completed: '✓',
      profile_updated: '👤',
      school_viewed: '👀'
    }
    return symbols[type] || '•'
  }


  // Get username from email as fallback
  const displayName = profile?.full_name || (user?.email?.split('@')[0]) || 'Athlete'

  if (loading) {
    return (
      <AthleteLayout>
        <div className="p-4 md:p-8">
          <div className="animate-pulse">
            <div className="bg-navy-800 h-48 rounded-xl mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-navy-800 h-64 rounded-xl mb-6"></div>
                <div className="bg-navy-800 h-32 rounded-xl"></div>
              </div>
              <div className="bg-navy-800 h-96 rounded-xl"></div>
            </div>
          </div>
        </div>
      </AthleteLayout>
    )
  }

  // Get first name for welcome message
  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Maya'

  return (
    <AthleteLayout>
      <div className="px-4 md:px-8 py-8 md:py-8">
        {/* Welcome line */}
        <div className="mb-6">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[13px] text-white">Welcome back, {firstName}</h1>
            <span className="text-[12px] text-text-muted">
              {format(new Date(), 'EEEE, MMMM d')}
            </span>
          </div>
        </div>

        {/* Hero Card */}
        <div className="hero-card px-8 md:px-9 py-8 mb-8 min-h-[200px] relative overflow-hidden">
          {/* Decorative layers */}
          <div className="absolute bottom-[-40px] right-[80px] opacity-[0.08] pointer-events-none">
            <EastsideFCLogo size={280} />
          </div>
          <div className="absolute top-0 right-0 w-[360px] h-[360px] crimson-glow pointer-events-none"></div>

          {/* Content */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:gap-8">

            {/* Left Content */}
            <div className="flex-1 mb-6 md:mb-0">
              {/* Streak pill */}
              <div className="mb-4">
                {streak > 0 ? (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-eastside-gold text-eastside-gold text-[11px] tracking-[0.04em] uppercase">
                    <div className="w-1.5 h-1.5 bg-eastside-gold rounded-full"></div>
                    {streak} DAY STREAK
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-eastside-gold text-eastside-gold text-[11px] tracking-[0.04em] uppercase">
                    <div className="w-1.5 h-1.5 bg-eastside-gold rounded-full"></div>
                    BUILD A STREAK — ANY ACTIVITY TODAY COUNTS
                  </div>
                )}
              </div>

              {/* Headline */}
              <h2 className="text-[26px] font-medium text-white leading-[1.2] tracking-[-0.01em] mb-3">
                {!profile?.athlete?.position || !profile?.athlete?.class_year || !profile?.athlete?.gpa
                  ? "Finish your profile to unlock recommendations"
                  : !quizCompleted
                  ? "Complete your School Fit Quiz to unlock recommendations"
                  : "Your top recommended schools"
                }
              </h2>

              {/* Subtext */}
              <p className="text-[13px] text-text-secondary leading-[1.5] mb-6">
                {!profile?.athlete?.position || !profile?.athlete?.class_year || !profile?.athlete?.gpa
                  ? "Complete your position, graduation year, and GPA to see personalized school matches"
                  : !quizCompleted
                  ? "Answer 6 quick questions to see schools that fit your preferences"
                  : "Based on your profile and school fit quiz responses"
                }
              </p>

              {/* CTAs */}
              <div className="flex gap-3 flex-col sm:flex-row">
                <Link
                  to={!profile?.athlete?.position || !profile?.athlete?.class_year || !profile?.athlete?.gpa ? "/profile" : !quizCompleted ? "/school-fit-quiz" : "/my-schools"}
                  className="eastside-btn"
                >
                  {!profile?.athlete?.position || !profile?.athlete?.class_year || !profile?.athlete?.gpa
                    ? "Complete Profile"
                    : !quizCompleted
                    ? "Take Quiz"
                    : "View Schools"
                  }
                </Link>
                <Link to="/coach-finder" className="secondary-btn">
                  Find Coaches
                </Link>
              </div>
            </div>

            {/* Right - Recruiting Score Ring */}
            <button
              onClick={() => setShowBreakdown(true)}
              className="flex flex-col items-center hover:scale-105 transition-transform cursor-pointer"
            >
              <div className="relative w-[130px] h-[130px] mb-3">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6"/>
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#C8102E" strokeWidth="6"
                          strokeDasharray={`${2 * Math.PI * 42}`}
                          strokeDashoffset={`${2 * Math.PI * 42 * (1 - recruitingScore.score/100)}`}
                          strokeLinecap="round"
                          style={{transition: 'stroke-dashoffset 800ms ease-out'}}/>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-[32px] font-medium text-white">{recruitingScore.score}</span>
                  <span className="text-[11px] text-text-tertiary">/ 100</span>
                </div>
              </div>
              <p className="text-[10px] text-text-secondary text-center tracking-[0.08em] uppercase mb-1">RECRUITING SCORE</p>
              <p className="text-[8px] text-text-tertiary text-center leading-tight">
                Profile {recruitingScore.breakdown?.profile?.score || 0}/40 · Pipeline {recruitingScore.breakdown?.pipeline?.score || 0}/20<br/>
                Email {recruitingScore.breakdown?.outreach?.score || 0}/20 · Active {recruitingScore.breakdown?.engagement?.score || 0}/20
              </p>
            </button>
          </div>
        </div>

        {/* Recent Activity + Top Schools Row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          {/* Recent Activity */}
          <div className="design-card p-5 min-h-[280px]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[14px] font-medium text-white">Recent activity</h3>
              <Link to="#" className="text-[11px] text-text-secondary hover:text-white transition-colors">
                View all →
              </Link>
            </div>

            {activities.length === 0 ? (
              <p className="text-text-secondary text-[13px]">Your recruiting activity will appear here</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-text-muted uppercase tracking-[0.08em] mb-3">TODAY</div>
                  <div className="space-y-3">
                    {activities.slice(0, 2).map(a => {
                      const iconColor = getActivityIconColor(a.activity_type)
                      return (
                        <div key={a.id} className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-lg ${iconColor} flex items-center justify-center text-white text-xs flex-shrink-0`}>
                            {getActivityIconSymbol(a.activity_type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] text-white">{formatActivity(a)}</p>
                            <p className="text-[11px] text-text-tertiary">{timeAgo(a.created_at)}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {activities.length > 2 && (
                  <div>
                    <div className="text-[10px] text-text-muted uppercase tracking-[0.08em] mb-3">EARLIER</div>
                    <div className="space-y-3">
                      {activities.slice(2, 5).map(a => {
                        const iconColor = getActivityIconColor(a.activity_type)
                        return (
                          <div key={a.id} className="flex items-start gap-3">
                            <div className={`w-7 h-7 rounded-lg ${iconColor} flex items-center justify-center text-white text-xs flex-shrink-0`}>
                              {getActivityIconSymbol(a.activity_type)}
                            </div>
                            <div className="flex-1">
                              <p className="text-[13px] text-white">{formatActivity(a)}</p>
                              <p className="text-[11px] text-text-tertiary">{timeAgo(a.created_at)}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top Schools */}
          <div className="design-card p-5 min-h-[280px] relative">
            {/* Small EFC logo watermark in top-right */}
            <div className="absolute top-4 right-4 opacity-[0.05]">
              <EastsideFCLogo size={40} />
            </div>

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <h3 className="text-[14px] font-medium text-white">Top schools</h3>
                <span className="px-2 py-1 rounded text-[9px] tracking-[0.05em] uppercase text-eastside-crimson bg-eastside-crimson bg-opacity-10">
                  EFC PIPELINE
                </span>
              </div>
              <Link to="/my-schools" className="text-[11px] text-text-secondary hover:text-white transition-colors">
                All {pipelineCount} →
              </Link>
            </div>

            {loading ? (
              <div className="text-text-secondary text-center py-8">Loading...</div>
            ) : recentSchools.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-secondary mb-4 text-[13px]">No schools in pipeline yet.</p>
                <Link
                  to="/coach-finder"
                  className="text-eastside-gold text-[11px] hover:text-white transition-colors"
                >
                  FIND SCHOOLS →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSchools.slice(0, 3).map((school) => (
                  <TopSchoolRow key={school.id} school={school} profile={profile} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-[10px] mb-4">
          {[
            {
              label: 'SCHOOLS',
              value: loading ? '...' : pipelineCount.toString(),
              context: pipelineCount > 0 ? '+3 this week' : 'Add schools →',
              contextColor: pipelineCount > 0 ? 'text-success' : 'text-eastside-gold',
              link: '/my-schools'
            },
            {
              label: 'HIGHLIGHTS',
              value: highlightsCount.toString(),
              context: highlightsCount > 0 ? 'Updated 2d ago' : 'Upload first →',
              contextColor: highlightsCount > 0 ? 'text-text-tertiary' : 'text-eastside-crimson',
              link: '/highlights'
            },
            {
              label: 'EMAILS SENT',
              value: recentEmailsSent.toString(),
              context: recentEmailsSent > 0 ? `${recentEmailsSent} this month` : 'Send first →',
              contextColor: recentEmailsSent > 0 ? 'text-success' : 'text-eastside-crimson',
              link: '/outreach'
            },
            {
              label: 'DAYS ACTIVE',
              value: '8',
              context: '12-day avg',
              contextColor: 'text-success',
              link: '#'
            }
          ].map((stat) => (
            <Link
              key={stat.label}
              to={stat.link}
              className="design-card p-[14px] hover:bg-card-hover transition-colors"
            >
              <div className="text-[10px] text-text-tertiary uppercase tracking-[0.06em] mb-2">{stat.label}</div>
              <div className={`text-[22px] font-medium mb-1 ${stat.value === '0' ? 'text-text-muted' : 'text-white'}`}>
                {stat.value}
              </div>
              <div className={`text-[10px] ${stat.contextColor}`}>
                {stat.context}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recruiting Score Breakdown Modal */}
      {showBreakdown && (
        <RecruitingScoreBreakdown
          score={recruitingScore.score}
          breakdown={recruitingScore.breakdown}
          onClose={() => setShowBreakdown(false)}
        />
      )}
    </AthleteLayout>
  )
}