import { useAuth } from '../hooks/authContext'

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-zinc-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/20 via-zinc-950 to-black">
      {/* Elite Sports Editorial Header */}
      <header className="bg-black/40 backdrop-blur-xl border-b border-zinc-800/50 shadow-2xl">
        <div className="px-8 py-5">
          <div className="flex items-center justify-between">
            {/* Premium Logo Section */}
            <div className="flex items-center gap-12">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-gradient-to-br from-red-600 via-red-700 to-red-800 rounded-xl flex items-center justify-center shadow-xl ring-1 ring-red-500/30">
                  <span className="text-white font-black text-base tracking-wider">EFC</span>
                </div>
                <div className="border-l border-zinc-700/50 pl-4">
                  <div className="text-white font-black text-lg tracking-tight">EASTSIDE FC</div>
                  <div className="text-red-500 font-bold text-xs uppercase tracking-[0.2em]">Command Center</div>
                </div>
              </div>

              {/* Sharp Navigation */}
              <nav className="flex items-center">
                <a
                  href="#"
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-sm tracking-wide border-l-4 border-red-400 shadow-lg shadow-red-900/30"
                >
                  DASHBOARD
                </a>
                <div className="w-px h-8 bg-zinc-700"></div>
                <a
                  href="#"
                  className="px-6 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800/50 font-semibold text-sm tracking-wide transition-all duration-200"
                >
                  ATHLETES
                </a>
                <div className="w-px h-8 bg-zinc-700"></div>
                <a
                  href="#"
                  className="px-6 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800/50 font-semibold text-sm tracking-wide transition-all duration-200"
                >
                  INVITES
                </a>
                <div className="w-px h-8 bg-zinc-700"></div>
                <a
                  href="#"
                  className="px-6 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800/50 font-semibold text-sm tracking-wide transition-all duration-200"
                >
                  ANNOUNCEMENTS
                </a>
                <div className="w-px h-8 bg-zinc-700"></div>
                <a
                  href="#"
                  className="px-6 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800/50 font-semibold text-sm tracking-wide transition-all duration-200"
                >
                  CONTENT
                </a>
                <div className="w-px h-8 bg-zinc-700"></div>
                <a
                  href="#"
                  className="px-6 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800/50 font-semibold text-sm tracking-wide transition-all duration-200"
                >
                  SETTINGS
                </a>
              </nav>
            </div>

            {/* Elite Admin Profile */}
            <div className="flex items-center gap-6">
              <div className="text-right border-r border-zinc-700 pr-6">
                <div className="text-white font-bold text-sm tracking-wide">
                  {profile?.full_name || user?.email}
                </div>
                <div className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">CLUB ADMINISTRATOR</div>
              </div>
              <button
                onClick={signOut}
                className="px-4 py-2 border border-zinc-600 text-zinc-300 hover:text-white hover:border-red-500 hover:bg-red-900/20 font-semibold text-sm tracking-wide transition-all duration-200 rounded-lg"
              >
                SIGN OUT
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Championship Data Center */}
      <main className="p-8 max-w-7xl mx-auto">
        {/* Elite Club Banner */}
        <div className="relative mb-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-900 via-red-800 to-red-900"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/5 via-transparent to-red-900/5 opacity-30"></div>
          <div className="relative px-8 py-8 border-l-8 border-red-400 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white/95 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl ring-4 ring-white/20">
                <span className="text-red-700 font-black text-3xl tracking-tight">E</span>
              </div>
              <div>
                <h1 className="display-font text-white text-4xl font-black tracking-tight mb-2 drop-shadow-lg">
                  EASTSIDE FC WASHINGTON
                </h1>
                <p className="text-red-200 text-lg font-semibold tracking-wide">ELITE ATHLETE DEVELOPMENT PLATFORM</p>
              </div>
            </div>
          </div>
        </div>

        {/* Championship Statistics Grid */}
        <div className="grid grid-cols-4 gap-6 mb-12">
          <div className="group relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-xl p-6 shadow-2xl hover:shadow-red-900/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white via-zinc-300 to-white"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-50"></div>
            <div className="relative text-center">
              <div className="display-font text-5xl font-black text-white mb-3 tracking-tight">0</div>
              <div className="text-zinc-400 text-xs font-bold uppercase tracking-[0.15em]">Total Athletes</div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-xl p-6 shadow-2xl hover:shadow-emerald-900/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-50"></div>
            <div className="relative text-center">
              <div className="display-font text-5xl font-black text-emerald-400 mb-3 tracking-tight drop-shadow-lg">0</div>
              <div className="text-zinc-400 text-xs font-bold uppercase tracking-[0.15em]">Active This Week</div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-xl p-6 shadow-2xl hover:shadow-blue-900/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-cyan-500 to-blue-400"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent opacity-50"></div>
            <div className="relative text-center">
              <div className="display-font text-5xl font-black text-blue-400 mb-3 tracking-tight drop-shadow-lg">0</div>
              <div className="text-zinc-400 text-xs font-bold uppercase tracking-[0.15em]">Announcements Sent</div>
            </div>
          </div>

          <div className="group relative bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border border-zinc-700/50 rounded-xl p-6 shadow-2xl hover:shadow-purple-900/20 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-violet-500 to-purple-400"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.02] to-transparent opacity-50"></div>
            <div className="relative text-center">
              <div className="display-font text-5xl font-black text-purple-400 mb-3 tracking-tight drop-shadow-lg">0</div>
              <div className="text-zinc-400 text-xs font-bold uppercase tracking-[0.15em]">Content Items</div>
            </div>
          </div>
        </div>

        {/* Elite Command Actions */}
        <div className="mb-12 flex gap-4">
          <button className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white font-bold text-sm tracking-wider uppercase rounded-lg shadow-lg shadow-red-900/30 hover:from-red-700 hover:to-red-800 transition-all duration-200 border-l-4 border-red-400">
            Send Announcement
          </button>
          <button className="px-8 py-4 bg-transparent border-2 border-red-600 text-red-400 hover:bg-red-600 hover:text-white font-bold text-sm tracking-wider uppercase rounded-lg transition-all duration-200">
            Upload Content
          </button>
          <button className="px-8 py-4 bg-transparent border border-zinc-600 text-zinc-300 hover:text-white hover:border-white hover:bg-zinc-800/50 font-semibold text-sm tracking-wider uppercase rounded-lg transition-all duration-200">
            View All Athletes
          </button>
        </div>

        {/* Championship Data Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Elite Athlete Analytics */}
          <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-900 to-zinc-800/90 border border-zinc-700/50 rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-zinc-800 to-zinc-700 p-6 border-b border-zinc-600/50">
              <h3 className="display-font text-white text-xl font-black tracking-wide uppercase">Athlete Activity</h3>
              <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-red-600 mt-2 rounded-full"></div>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="text-left text-zinc-400 font-bold text-xs uppercase tracking-wider py-4">Athlete</th>
                      <th className="text-left text-zinc-400 font-bold text-xs uppercase tracking-wider py-4">Position</th>
                      <th className="text-left text-zinc-400 font-bold text-xs uppercase tracking-wider py-4">Class</th>
                      <th className="text-left text-zinc-400 font-bold text-xs uppercase tracking-wider py-4">Last Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-16 text-center text-zinc-500" colSpan="4">
                        <div className="space-y-2">
                          <div className="text-lg font-semibold">No athletes registered yet</div>
                          <div className="text-sm">Deploy invite codes to begin recruitment</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Elite Communications Hub */}
          <div className="bg-gradient-to-br from-zinc-900/90 via-zinc-900 to-zinc-800/90 border border-zinc-700/50 rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-zinc-800 to-zinc-700 p-6 border-b border-zinc-600/50">
              <h3 className="display-font text-white text-xl font-black tracking-wide uppercase">Recent Announcements</h3>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-blue-600 mt-2 rounded-full"></div>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                <div className="space-y-4">
                  <div className="text-zinc-400 text-lg font-semibold">No announcements broadcast yet</div>
                  <button className="px-6 py-3 bg-transparent border-2 border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white font-bold text-sm tracking-wider uppercase rounded-lg transition-all duration-200">
                    Initiate Broadcast
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Elite Debug Terminal */}
        <div className="mt-12 bg-black/60 backdrop-blur-sm border border-zinc-700/50 rounded-xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-zinc-800 to-zinc-700 p-4 border-b border-zinc-600/50">
            <h4 className="text-white font-bold text-sm uppercase tracking-wider">System Diagnostics (Phase 3)</h4>
          </div>
          <div className="p-6 font-mono">
            <div className="text-zinc-400 text-xs space-y-2 tracking-wide">
              <div className="flex"><span className="text-zinc-500 mr-4">USER_ID:</span> {user?.id}</div>
              <div className="flex"><span className="text-zinc-500 mr-4">EMAIL:</span> {user?.email}</div>
              <div className="flex"><span className="text-zinc-500 mr-4">PROFILE:</span> {profile ? 'LOADED' : 'NULL'}</div>
              <div className="flex"><span className="text-zinc-500 mr-4">ROLE:</span> {profile?.org_members?.role || 'UNDEFINED'}</div>
              <div className="flex"><span className="text-zinc-500 mr-4">ORG_ID:</span> {profile?.org_id || 'UNDEFINED'}</div>
              <div className="flex"><span className="text-zinc-500 mr-4">ADMIN:</span> {profile?.org_members?.role === 'admin' ? 'TRUE' : 'FALSE'}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}