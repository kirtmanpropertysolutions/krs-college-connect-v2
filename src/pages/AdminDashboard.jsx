import { useAuth } from '../hooks/useAuth'

export default function AdminDashboard() {
  const { user, profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Top Navigation Bar */}
      <header className="bg-navy-900 border-b border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and nav */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-crimson-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">KRS</span>
                </div>
                <div>
                  <span className="text-white font-semibold">KRS </span>
                  <span className="text-accent font-semibold">Admin</span>
                </div>
              </div>

              {/* Nav items */}
              <nav className="flex items-center gap-1">
                <a
                  href="#"
                  className="px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-medium"
                >
                  Dashboard
                </a>
                <a
                  href="#"
                  className="px-4 py-2 text-gray-300 hover:text-white hover:bg-navy-800 rounded-lg text-sm font-medium"
                >
                  Athletes
                </a>
                <a
                  href="#"
                  className="px-4 py-2 text-gray-300 hover:text-white hover:bg-navy-800 rounded-lg text-sm font-medium"
                >
                  Invite Codes
                </a>
                <a
                  href="#"
                  className="px-4 py-2 text-gray-300 hover:text-white hover:bg-navy-800 rounded-lg text-sm font-medium"
                >
                  Announcements
                </a>
                <a
                  href="#"
                  className="px-4 py-2 text-gray-300 hover:text-white hover:bg-navy-800 rounded-lg text-sm font-medium"
                >
                  Content Library
                </a>
                <a
                  href="#"
                  className="px-4 py-2 text-gray-300 hover:text-white hover:bg-navy-800 rounded-lg text-sm font-medium"
                >
                  Settings
                </a>
              </nav>
            </div>

            {/* Admin info and sign out */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-white text-sm font-medium">
                  {profile?.full_name || user?.email}
                </div>
                <div className="text-gray-400 text-xs">Club Admin</div>
              </div>
              <button onClick={signOut} className="btn-ghost text-sm py-2 px-4">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8">
        {/* Club banner */}
        <div className="bg-crimson-600 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center">
              <span className="text-crimson-600 font-bold text-xl">E</span>
            </div>
            <div>
              <h1 className="display-font text-white text-3xl">
                EASTSIDE FC WASHINGTON
              </h1>
              <p className="text-crimson-100">Club Admin Command Center</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="stat-card text-center">
            <div className="display-font text-4xl text-white mb-2">0</div>
            <div className="text-gray-400 text-sm">Total Athletes</div>
          </div>
          <div className="stat-card text-center">
            <div className="display-font text-4xl text-success mb-2">0</div>
            <div className="text-gray-400 text-sm">Active This Week</div>
          </div>
          <div className="stat-card text-center">
            <div className="display-font text-4xl text-blue-500 mb-2">0</div>
            <div className="text-gray-400 text-sm">Announcements Sent</div>
          </div>
          <div className="stat-card text-center">
            <div className="display-font text-4xl text-purple-500 mb-2">0</div>
            <div className="text-gray-400 text-sm">Content Items</div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mb-8 flex gap-4">
          <button className="btn-primary">Send Announcement</button>
          <button className="btn-secondary">Upload Content</button>
          <button className="btn-ghost">View All Athletes</button>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Athlete Activity */}
          <div className="card">
            <h3 className="display-font text-white text-xl mb-6">ATHLETE ACTIVITY</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 font-medium py-3">Athlete</th>
                    <th className="text-left text-gray-400 font-medium py-3">Position</th>
                    <th className="text-left text-gray-400 font-medium py-3">Class</th>
                    <th className="text-left text-gray-400 font-medium py-3">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-8 text-center text-gray-400" colSpan="4">
                      No athletes yet. Send invite codes to get started.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Announcements */}
          <div className="card">
            <h3 className="display-font text-white text-xl mb-6">RECENT ANNOUNCEMENTS</h3>
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">No announcements yet.</p>
              <button className="btn-secondary">Send One Now</button>
            </div>
          </div>
        </div>

        {/* Debug info for Phase 3 testing */}
        <div className="mt-8 p-4 bg-navy-900 rounded-lg border border-gray-700">
          <h4 className="text-white font-medium mb-2">Debug Info (Phase 3)</h4>
          <div className="text-gray-400 text-sm space-y-1">
            <p>User ID: {user?.id}</p>
            <p>Email: {user?.email}</p>
            <p>Profile loaded: {profile ? 'Yes' : 'No'}</p>
            <p>Role: {profile?.org_members?.role || 'Unknown'}</p>
            <p>Org ID: {profile?.org_id || 'Unknown'}</p>
            <p>Is Admin: {profile?.org_members?.role === 'admin' ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </main>
    </div>
  )
}