import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { NavLink } from 'react-router-dom'
import { Home, Building2, Mail, Video, User, Menu, X, Moon, Sun, Monitor } from 'lucide-react'
import EastsideFCLogo from './EastsideFC_Logo.jsx'
import ColorModeToggle from './ColorModeToggle.jsx'

export default function AthleteLayout({ children }) {
  const { user, profile, signOut } = useAuth()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  // Close drawer on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setMobileDrawerOpen(false)
      }
    }

    if (mobileDrawerOpen) {
      document.addEventListener('keydown', handleEsc)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [mobileDrawerOpen])

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Left Sidebar - hidden on mobile */}
      <aside className="hidden md:flex flex-col bg-navy-900 border-r border-gray-700 h-screen" style={{width: '260px'}}>
        {/* Logo Section */}
        <div className="text-center p-6 pb-4 border-b border-card-border">
          <div className="px-4 pt-4 pb-3">
            <EastsideFCLogo size={84} className="mx-auto mb-3" />
          </div>
          <div className="text-white font-medium text-[13px] mb-1">
            {profile?.organization?.name || 'Eastside FC'}
          </div>
          <div className="text-eastside-gold text-[9px] tracking-[0.15em] uppercase">
            EST. 1970 · WASHINGTON
          </div>
        </div>

        {/* Navigation sections - scrollable */}
        <nav className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            <div>
              <h3 className="text-gray-400 text-xs uppercase font-medium tracking-wider mb-3">
                Recruiting
              </h3>
              <div className="space-y-1">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `block text-[13px] transition-all ${
                      isActive
                        ? 'nav-item-active pl-[14px] py-[9px] pr-3'
                        : 'text-text-secondary hover:text-white px-4 py-[9px] hover:bg-navy-800 rounded-lg'
                    }`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `block text-[13px] transition-all ${
                      isActive
                        ? 'nav-item-active pl-[14px] py-[9px] pr-3'
                        : 'text-text-secondary hover:text-white px-4 py-[9px] hover:bg-navy-800 rounded-lg'
                    }`
                  }
                >
                  My Profile
                </NavLink>
                <NavLink
                  to="/school-fit-quiz"
                  className={({ isActive }) =>
                    `block text-[13px] transition-all ${
                      isActive
                        ? 'nav-item-active pl-[14px] py-[9px] pr-3'
                        : 'text-text-secondary hover:text-white px-4 py-[9px] hover:bg-navy-800 rounded-lg'
                    }`
                  }
                >
                  School Fit Quiz
                </NavLink>
                <NavLink
                  to="/coach-finder"
                  className={({ isActive }) =>
                    `block text-[13px] transition-all ${
                      isActive
                        ? 'nav-item-active pl-[14px] py-[9px] pr-3'
                        : 'text-text-secondary hover:text-white px-4 py-[9px] hover:bg-navy-800 rounded-lg'
                    }`
                  }
                >
                  Coach Finder
                </NavLink>
                <NavLink
                  to="/my-schools"
                  className={({ isActive }) =>
                    `block text-[13px] transition-all ${
                      isActive
                        ? 'nav-item-active pl-[14px] py-[9px] pr-3'
                        : 'text-text-secondary hover:text-white px-4 py-[9px] hover:bg-navy-800 rounded-lg'
                    }`
                  }
                >
                  My Schools
                </NavLink>
                <NavLink
                  to="/outreach"
                  className={({ isActive }) =>
                    `block text-[13px] transition-all ${
                      isActive
                        ? 'nav-item-active pl-[14px] py-[9px] pr-3'
                        : 'text-text-secondary hover:text-white px-4 py-[9px] hover:bg-navy-800 rounded-lg'
                    }`
                  }
                >
                  Outreach
                </NavLink>
                <NavLink
                  to="/recruiting-events"
                  className={({ isActive }) =>
                    `block text-[13px] transition-all ${
                      isActive
                        ? 'nav-item-active pl-[14px] py-[9px] pr-3'
                        : 'text-text-secondary hover:text-white px-4 py-[9px] hover:bg-navy-800 rounded-lg'
                    }`
                  }
                >
                  ID Camps
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
                    `block text-[13px] transition-all ${
                      isActive
                        ? 'nav-item-active pl-[14px] py-[9px] pr-3'
                        : 'text-text-secondary hover:text-white px-4 py-[9px] hover:bg-navy-800 rounded-lg'
                    }`
                  }
                >
                  Highlights
                </NavLink>
                <NavLink
                  to="/video-editor"
                  className={({ isActive }) =>
                    `block text-[13px] transition-all ${
                      isActive
                        ? 'nav-item-active pl-[14px] py-[9px] pr-3'
                        : 'text-text-secondary hover:text-white px-4 py-[9px] hover:bg-navy-800 rounded-lg'
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
                    `block text-[13px] transition-all ${
                      isActive
                        ? 'nav-item-active pl-[14px] py-[9px] pr-3'
                        : 'text-text-secondary hover:text-white px-4 py-[9px] hover:bg-navy-800 rounded-lg'
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
                    `block text-[13px] transition-all ${
                      isActive
                        ? 'nav-item-active pl-[14px] py-[9px] pr-3'
                        : 'text-text-secondary hover:text-white px-4 py-[9px] hover:bg-navy-800 rounded-lg'
                    }`
                  }
                >
                  Social Planner
                </NavLink>
              </div>
            </div>
        </nav>

        {/* Bottom section with color mode toggle and profile card */}
        <div className="mt-auto px-6 pb-6">
          <div className="mb-3">
            <ColorModeToggle />
          </div>
          <div className="design-card p-[14px]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-eastside-crimson to-eastside-navy rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.email?.[0]?.toUpperCase() || 'M'}
                </span>
              </div>
              <div>
                <div className="text-white text-sm font-medium">
                  {profile?.full_name || (user?.email?.split('@')[0]) || 'Maya'}
                </div>
                <div className="text-text-secondary text-xs">
                  {profile?.athlete?.class_year ? `${profile.athlete.class_year} · ` : '2031 · '}
                  {profile?.athlete?.position || 'Forward'}
                </div>
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-full text-xs py-2 px-3 text-text-secondary hover:text-white transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-0">
        {/* Mobile hamburger menu */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="fixed top-4 left-4 z-40 md:hidden bg-navy-900 p-2 rounded-lg text-white"
        >
          <Menu size={20} />
        </button>

        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-navy-950 border-t border-gray-800 md:hidden z-50 flex">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center ${
              isActive ? 'text-red-600' : 'text-gray-400'
            }`
          }
        >
          <Home size={20} />
          <span className="text-[10px] uppercase mt-1">Home</span>
        </NavLink>

        <NavLink
          to="/my-schools"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center ${
              isActive ? 'text-red-600' : 'text-gray-400'
            }`
          }
        >
          <Building2 size={20} />
          <span className="text-[10px] uppercase mt-1">Schools</span>
        </NavLink>

        <NavLink
          to="/outreach"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center ${
              isActive ? 'text-red-600' : 'text-gray-400'
            }`
          }
        >
          <Mail size={20} />
          <span className="text-[10px] uppercase mt-1">Outreach</span>
        </NavLink>

        <NavLink
          to="/highlights"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center ${
              isActive ? 'text-red-600' : 'text-gray-400'
            }`
          }
        >
          <Video size={20} />
          <span className="text-[10px] uppercase mt-1">Highlights</span>
        </NavLink>

        <NavLink
          to="/my-profile"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center ${
              isActive ? 'text-red-600' : 'text-gray-400'
            }`
          }
        >
          <User size={20} />
          <span className="text-[10px] uppercase mt-1">Profile</span>
        </NavLink>
      </nav>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-70"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-navy-900 border-r border-gray-700 overflow-y-auto">
            <div className="p-6">
              {/* Close button */}
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>

              {/* Logo */}
              <div className="flex items-center gap-3 mb-8">
                <EastsideFCLogo size={48} />
                <div>
                  <div className="text-white font-semibold">KRS College Connect</div>
                  <div className="text-gray-400 text-sm">Recruiting Platform</div>
                </div>
              </div>

              {/* Additional Nav Items */}
              <nav className="space-y-6">
                <div>
                  <h3 className="text-gray-400 text-xs uppercase font-medium tracking-wider mb-3">
                    Discover
                  </h3>
                  <div className="space-y-1">
                    <NavLink
                      to="/school-fit-quiz"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-navy-800"
                    >
                      School Fit Quiz
                    </NavLink>
                    <NavLink
                      to="/coach-finder"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-navy-800"
                    >
                      Coach Finder
                    </NavLink>
                    <NavLink
                      to="/recruiting-events"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-navy-800"
                    >
                      ID Camps
                    </NavLink>
                  </div>
                </div>

                <div>
                  <h3 className="text-gray-400 text-xs uppercase font-medium tracking-wider mb-3">
                    Content
                  </h3>
                  <div className="space-y-1">
                    <NavLink
                      to="/video-editor"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-navy-800"
                    >
                      Video Editor
                    </NavLink>
                    <NavLink
                      to="/nil-deals"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-navy-800"
                    >
                      NIL Deals
                    </NavLink>
                    <NavLink
                      to="/social-planner"
                      onClick={() => setMobileDrawerOpen(false)}
                      className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-navy-800"
                    >
                      Social Planner
                    </NavLink>
                  </div>
                </div>
              </nav>

              {/* User card */}
              <div className="mt-8 bg-navy-800 rounded-lg p-4">
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
                    {profile?.athlete?.class_year && (
                      <div className="text-gray-400 text-xs">
                        Class of {profile.athlete.class_year}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    signOut()
                    setMobileDrawerOpen(false)
                  }}
                  className="w-full btn-ghost text-xs py-2"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}