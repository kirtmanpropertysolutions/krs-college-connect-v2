import { useAuth } from '../hooks/useAuth'
import AthleteLayout from '../components/AthleteLayout.jsx'
import EastsideFCLogo from '../components/EastsideFC_Logo.jsx'

export default function AthleteDashboard() {
  const { user, profile } = useAuth()

  // Get username from email as fallback
  const displayName = profile?.full_name || (user?.email?.split('@')[0]) || 'Athlete'

  // Build subtitle parts conditionally
  const subtitleParts = []
  if (profile?.athlete?.position) subtitleParts.push(profile.athlete.position)
  if (profile?.athlete?.class_year) subtitleParts.push(`Class of ${profile.athlete.class_year}`)
  subtitleParts.push('Eastside FC Washington')

  return (
    <AthleteLayout>
      <div className="p-8">
        {/* Crimson banner with athlete name */}
        <div className="bg-crimson-600 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <EastsideFCLogo size={64} />
            <div>
              <h1 className="display-font text-white text-3xl">
                {displayName.toUpperCase()}
              </h1>
              <p className="text-crimson-100">
                {subtitleParts.join(' · ')}
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Stats row */}
          <div className="lg:col-span-3 grid grid-cols-5 gap-4">
            {[
              { label: 'Schools Targeted', value: '0' },
              { label: 'Coach Outreach', value: '0' },
              { label: 'Social Posts Pending', value: '0' },
              { label: 'NIL Deals', value: '0' },
              { label: 'Recruiting Events', value: '0' },
            ].map((stat) => (
              <div key={stat.label} className="stat-card text-center">
                <div className="display-font text-4xl text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Main content cards */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <h3 className="display-font text-white text-xl mb-4">NEXT ACTIONS</h3>
              <p className="text-gray-400">
                Complete your athlete profile to get started with recruiting.
              </p>
            </div>

            <div className="card">
              <h3 className="display-font text-white text-xl mb-4">GAME SCHEDULE</h3>
              <p className="text-gray-400 mb-4">
                No upcoming games — Add your schedule so coaches know when to watch you play.
              </p>
              <button className="btn-secondary">+ Add Game</button>
            </div>
          </div>

          {/* Right sidebar cards */}
          <div className="space-y-6">
            <div className="card">
              <h3 className="display-font text-white text-xl mb-4">PROFILE STRENGTH</h3>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-warning mb-2">25%</div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{width: '25%'}}></div>
                </div>
              </div>
              <p className="text-crimson-600 text-sm">
                Complete your profile to improve recruiting visibility.
              </p>
            </div>

            <div className="card">
              <h3 className="display-font text-white text-xl mb-4">RECRUITING PIPELINE</h3>
              <p className="text-gray-400 text-center py-8">
                No schools in pipeline yet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AthleteLayout>
  )
}