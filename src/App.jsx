import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AthleteDashboard from './pages/AthleteDashboard'
import AdminDashboard from './pages/AdminDashboard'
import AthleteProfile from './pages/AthleteProfile'
import SchoolFitQuiz from './pages/SchoolFitQuiz'
import CoachFinder from './pages/CoachFinder'
import MySchools from './pages/MySchools'
import Outreach from './pages/Outreach'
import RecruitingEvents from './pages/RecruitingEvents'
import Highlights from './pages/Highlights'
import VideoEditor from './pages/VideoEditor'
import NILDeals from './pages/NILDeals'
import SocialPlanner from './pages/SocialPlanner'
import LoadingSpinner from './components/LoadingSpinner'

function App() {
  const { user, profile, loading, isAdmin } = useAuth()

  // Show loading spinner while auth state is initializing
  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <Routes>
      {/* Public routes - only accessible when not logged in */}
      {!user ? (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        /* Protected routes - only accessible when logged in with profile */
        profile ? (
          <>
            {/* Route based on user role */}
            {isAdmin ? (
              <>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<AthleteDashboard />} />
                <Route path="/profile" element={<AthleteProfile />} />
                <Route path="/school-fit-quiz" element={<SchoolFitQuiz />} />
                <Route path="/coach-finder" element={<CoachFinder />} />
                <Route path="/my-schools" element={<MySchools />} />
                <Route path="/outreach" element={<Outreach />} />
                <Route path="/recruiting-events" element={<RecruitingEvents />} />
                <Route path="/highlights" element={<Highlights />} />
                <Route path="/video-editor" element={<VideoEditor />} />
                <Route path="/nil-deals" element={<NILDeals />} />
                <Route path="/social-planner" element={<SocialPlanner />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </>
        ) : (
          /* User is logged in but profile not loaded - show loading */
          <Route path="*" element={<LoadingSpinner />} />
        )
      )}
    </Routes>
  )
}

export default App
