import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './hooks/authContext'
import LoadingSpinner from './components/LoadingSpinner'
import AdminLayout from './components/AdminLayout'

// Route components are lazy-loaded so each page ships as its own JS
// chunk instead of being bundled into one 800KB+ blob. Before this
// change the entire app's code was parsed on first load and every
// tab switch felt sluggish on mobile. With code-splitting:
//   - Initial load only pulls the dashboard the user actually lands on
//   - Subsequent tab clicks fetch their own ~40-80KB chunk in parallel
//     with rendering, and stay cached for future visits
//   - The Suspense fallback shows our existing LoadingSpinner so the
//     UI never goes blank during the chunk fetch
const PublicAthleteProfile = lazy(() => import('./pages/PublicAthleteProfile'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const AthleteDashboard = lazy(() => import('./pages/AthleteDashboard'))
const AthleteProfile = lazy(() => import('./pages/AthleteProfile'))
const SchoolFitQuiz = lazy(() => import('./pages/SchoolFitQuiz'))
const CoachFinder = lazy(() => import('./pages/CoachFinder'))
const MySchools = lazy(() => import('./pages/MySchools'))
const Outreach = lazy(() => import('./pages/Outreach'))
const RecruitingEvents = lazy(() => import('./pages/RecruitingEvents'))
const Highlights = lazy(() => import('./pages/Highlights'))
const VideoStudio = lazy(() => import('./pages/VideoStudio'))
const NILDeals = lazy(() => import('./pages/NILDeals'))
const Milestones = lazy(() => import('./pages/Milestones'))
const Budget = lazy(() => import('./pages/Budget'))
const AdminDashboardNew = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminAthletes = lazy(() => import('./pages/admin/AdminAthletes'))
const AdminInviteCodes = lazy(() => import('./pages/admin/AdminInviteCodes'))
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'))
const AdminNILDeals = lazy(() => import('./pages/admin/AdminNILDeals'))
const AdminCamps = lazy(() => import('./pages/admin/AdminCamps'))

function App() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  // Public profile pages (/p/:id) bypass all auth — they're the coach-facing
  // recruiting profiles linked in every outreach email. Always render them
  // first regardless of auth state.
  const isPublicProfilePath = location.pathname.startsWith('/p/')
  if (isPublicProfilePath) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/p/:athleteId" element={<PublicAthleteProfile />} />
        </Routes>
      </Suspense>
    )
  }

  // Password-reset landing page is also auth-bypass — the user clicks
  // a link in their email and Supabase puts them in a special signed-in
  // recovery state where the only thing they can do is set a new password.
  // Routing here BEFORE the auth-loading gate prevents an infinite-loading
  // race condition during the OAuth-style URL hash exchange.
  const isResetPasswordPath = location.pathname === '/reset-password'
  if (isResetPasswordPath) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Routes>
      </Suspense>
    )
  }

  // Show loading spinner while auth state is initializing
  if (loading) {
    return <LoadingSpinner />
  }

  // Show loading screen when user is signed in but profile is still loading
  if (user && !profile) {
    return <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e1a', color: '#94a3b8'}}>Loading…</div>
  }

  // All authenticated routes are wrapped in a single Suspense boundary
  // so React shows the LoadingSpinner while the next page's chunk is
  // being fetched. Each lazy() component above ships its own JS chunk.
  return (
    <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      {/* Public routes - only accessible when not logged in */}
      {!user ? (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        /* Protected routes - only accessible when logged in with profile */
        profile ? (
          <>
            {/* Route based on user role */}
            {profile?.role === 'admin' && (
              <>
                <Route path="/" element={<Navigate to="/admin" replace />} />
                <Route path="/admin" element={<AdminLayout><AdminDashboardNew /></AdminLayout>} />
                <Route path="/admin/athletes" element={<AdminLayout><AdminAthletes /></AdminLayout>} />
                <Route path="/admin/invites" element={<AdminLayout><AdminInviteCodes /></AdminLayout>} />
                <Route path="/admin/announcements" element={<AdminLayout><AdminAnnouncements /></AdminLayout>} />
                <Route path="/admin/nil-deals" element={<AdminLayout><AdminNILDeals /></AdminLayout>} />
                <Route path="/admin/camps" element={<AdminLayout><AdminCamps /></AdminLayout>} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </>
            )}
            {profile?.role === 'athlete' && (
              <>
                <Route path="/" element={<AthleteDashboard />} />
                <Route path="/profile" element={<AthleteProfile />} />
                <Route path="/school-fit-quiz" element={<SchoolFitQuiz />} />
                <Route path="/coach-finder" element={<CoachFinder />} />
                <Route path="/my-schools" element={<MySchools />} />
                <Route path="/outreach" element={<Outreach />} />
                <Route path="/recruiting-events" element={<RecruitingEvents />} />
                <Route path="/highlights" element={<Highlights />} />
                <Route path="/video-studio" element={<VideoStudio />} />
                <Route path="/nil-deals" element={<NILDeals />} />
                <Route path="/milestones" element={<Milestones />} />
                <Route path="/budget" element={<Budget />} />
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
    </Suspense>
  )
}

export default App
