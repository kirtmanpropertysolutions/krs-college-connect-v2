import { useAuth } from '../hooks/useAuth'
import { NavLink } from 'react-router-dom'
import EastsideFCLogo from './EastsideFC_Logo.jsx'

export default function AthleteLayout({ children }) {
  const { user, profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Left Sidebar - based on product spec */}
      <aside className="bg-navy-900 border-r border-gray-700" style={{width: '260px'}}>
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <EastsideFCLogo size={48} />
            <div>
              <div className="text-white font-semibold">KRS College Connect</div>
              <div className="text-gray-400 text-sm">Recruiting Platform</div>
            </div>
          </div>

          {/* Navigation sections */}
          <nav className="space-y-6">
            <div>
              <h3 className="text-gray-400 text-xs uppercase font-medium tracking-wider mb-3">
                Recruiting
              </h3>
              <div className="space-y-1">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? 'nav-active'
                        : 'text-gray-300 hover:text-white hover:bg-navy-800'
                    }`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? 'nav-active'
                        : 'text-gray-300 hover:text-white hover:bg-navy-800'
                    }`
                  }
                >
                  My Profile
                </NavLink>
                <NavLink
                  to="/school-fit-quiz"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? 'nav-active'
                        : 'text-gray-300 hover:text-white hover:bg-navy-800'
                    }`
                  }
                >
                  School Fit Quiz
                </NavLink>
                <NavLink
                  to="/coach-finder"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? 'nav-active'
                        : 'text-gray-300 hover:text-white hover:bg-navy-800'
                    }`
                  }
                >
                  Coach Finder
                </NavLink>
                <NavLink
                  to="/my-schools"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? 'nav-active'
                        : 'text-gray-300 hover:text-white hover:bg-navy-800'
                    }`
                  }
                >
                  My Schools
                </NavLink>
                <NavLink
                  to="/outreach"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? 'nav-active'
                        : 'text-gray-300 hover:text-white hover:bg-navy-800'
                    }`
                  }
                >
                  Outreach
                </NavLink>
                <NavLink
                  to="/recruiting-events"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? 'nav-active'
                        : 'text-gray-300 hover:text-white hover:bg-navy-800'
                    }`
                  }
                >
                  Recruiting Events
                </NavLink>
              </div>
            </div>

            <div>
              <h3 className="text-gray-400 text-xs uppercase font-medium tracking-wider mb-3">
                Highlights
              </h3>
              <div className="space-y-1">
                <NavLink
                  to="/highlights"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? 'nav-active'
                        : 'text-gray-300 hover:text-white hover:bg-navy-800'
                    }`
                  }
                >
                  Highlights
                </NavLink>
                <NavLink
                  to="/video-editor"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? 'nav-active'
                        : 'text-gray-300 hover:text-white hover:bg-navy-800'
                    }`
                  }
                >
                  Video Editor
                </NavLink>
              </div>
            </div>

            <div>
              <h3 className="text-gray-400 text-xs uppercase font-medium tracking-wider mb-3">
                NIL
              </h3>
              <div className="space-y-1">
                <NavLink
                  to="/nil-deals"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? 'nav-active'
                        : 'text-gray-300 hover:text-white hover:bg-navy-800'
                    }`
                  }
                >
                  NIL Deals
                </NavLink>
              </div>
            </div>

            <div>
              <h3 className="text-gray-400 text-xs uppercase font-medium tracking-wider mb-3">
                Social
              </h3>
              <div className="space-y-1">
                <NavLink
                  to="/social-planner"
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-lg text-sm ${
                      isActive
                        ? 'nav-active'
                        : 'text-gray-300 hover:text-white hover:bg-navy-800'
                    }`
                  }
                >
                  Social Planner
                </NavLink>
              </div>
            </div>
          </nav>
        </div>

        {/* Athlete mini-card at bottom */}
        <div className="absolute bottom-6 left-6" style={{right: '24px', width: 'calc(260px - 48px)'}}>
          <div className="bg-navy-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.email?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <div>
                <div className="text-white text-sm font-medium">
                  {profile?.full_name || (user?.email?.split('@')[0]) || 'Athlete'}
                </div>
                <div className="text-gray-400 text-xs">
                  Class of {new Date().getFullYear() + 4}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-full btn-ghost text-xs py-2"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}