import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/authContext'
import { Eye, Calendar, Users, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export default function AdminAnnouncements() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    body: '',
    audience: 'All Athletes',
    priority: 'Normal',
    send_now: true,
    scheduled_date: '',
    scheduled_time: ''
  })

  const loadAnnouncements = useCallback(async () => {
    try {
      // Get Eastside FC org ID
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'eastside-fc-wa')
        .single()

      if (!orgs) {
        console.error('Eastside FC organization not found')
        setLoading(false)
        return
      }

      const { data: announcementData } = await supabase
        .from('announcements')
        .select('*')
        .eq('org_id', orgs.id)
        .order('created_at', { ascending: false })

      setAnnouncements(announcementData || [])
    } catch (error) {
      console.error('Error loading announcements:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Sync-with-external-state: load announcement history from Supabase on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAnnouncements()
  }, [loadAnnouncements])

  const sendAnnouncement = async () => {
    if (!newAnnouncement.title.trim() || !newAnnouncement.body.trim()) {
      alert('Please fill in both title and message')
      return
    }

    setSending(true)
    try {
      // Get Eastside FC org ID
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'eastside-fc-wa')
        .single()

      if (!orgs) {
        throw new Error('Organization not found')
      }

      const { error } = await supabase
        .from('announcements')
        .insert({
          org_id: orgs.id,
          title: newAnnouncement.title,
          body: newAnnouncement.body,
          priority: newAnnouncement.priority,
          created_by: user.id,
          audience: newAnnouncement.audience
        })
        .select()

      if (error) throw error

      // Reset form
      setNewAnnouncement({
        title: '',
        body: '',
        audience: 'All Athletes',
        priority: 'Normal',
        send_now: true,
        scheduled_date: '',
        scheduled_time: ''
      })

      // Reload announcements
      await loadAnnouncements()

      alert('Announcement sent successfully!')
    } catch (error) {
      console.error('Error sending announcement:', error)
      alert('Failed to send announcement: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'Urgent':
        return <AlertCircle className="text-red-500" size={16} />
      case 'Important':
        return <AlertTriangle className="text-yellow-500" size={16} />
      default:
        return <Info className="text-blue-500" size={16} />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-900 text-red-300'
      case 'Important':
        return 'bg-yellow-900 text-yellow-300'
      default:
        return 'bg-blue-900 text-blue-300'
    }
  }

  const audiences = ['All Athletes', 'By Class Year', 'By Position']
  const priorities = ['Normal', 'Important', 'Urgent']
  // Preserved for future "By Class Year" / "By Position" audience filtering — UI selectors not yet wired.
  // const classYears = ['2025', '2026', '2027', '2028', '2029', '2030', '2031']
  // const positions = ['Forward', 'Midfielder', 'Defender', 'Goalkeeper']

  return (
    <div className="space-y-6">
      {/* Editorial header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
          <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>
            Broadcasts
          </span>
        </div>
        <h1 className="display-font text-4xl text-white">Announcements</h1>
        <p className="text-text-secondary text-sm mt-1">Send updates to your athletes and parents.</p>
      </div>

      {/* Compose Announcement */}
      <div className="design-card p-6">
        <h2 className="display-font text-lg text-white mb-1">Compose announcement</h2>
        <p className="text-[11px] uppercase tracking-widest text-text-tertiary mb-5">Reaches every athlete in your club</p>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Title</label>
              <input
                type="text"
                placeholder="Weekly Update"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-eastside-crimson"
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-gray-400 text-sm mb-2">Message</label>
              <textarea
                placeholder="Your announcement message..."
                rows={4}
                value={newAnnouncement.body}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, body: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-eastside-crimson resize-vertical"
              />
            </div>

            {/* Options Row */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Audience */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Audience</label>
                <select
                  value={newAnnouncement.audience}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, audience: e.target.value })}
                  className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white focus:outline-none focus:border-eastside-crimson"
                >
                  {audiences.map(audience => (
                    <option key={audience} value={audience}>{audience}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Priority</label>
                <select
                  value={newAnnouncement.priority}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value })}
                  className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white focus:outline-none focus:border-eastside-crimson"
                >
                  {priorities.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>

              {/* Send Timing */}
              <div>
                <label className="block text-gray-400 text-sm mb-2">Timing</label>
                <select
                  value={newAnnouncement.send_now ? 'now' : 'later'}
                  onChange={(e) => setNewAnnouncement({ ...newAnnouncement, send_now: e.target.value === 'now' })}
                  className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white focus:outline-none focus:border-eastside-crimson"
                >
                  <option value="now">Send Now</option>
                  <option value="later">Schedule for Later</option>
                </select>
              </div>
            </div>

            {/* Schedule Date/Time (if not sending now) */}
            {!newAnnouncement.send_now && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Date</label>
                  <input
                    type="date"
                    value={newAnnouncement.scheduled_date}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white focus:outline-none focus:border-eastside-crimson"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Time</label>
                  <input
                    type="time"
                    value={newAnnouncement.scheduled_time}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, scheduled_time: e.target.value })}
                    className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white focus:outline-none focus:border-eastside-crimson"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={sendAnnouncement}
                disabled={sending || !newAnnouncement.title.trim() || !newAnnouncement.body.trim()}
                className="bg-eastside-crimson text-white px-6 py-2 rounded font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : (newAnnouncement.send_now ? 'Send Announcement' : 'Schedule Announcement')}
              </button>
              <button className="border border-gray-600 text-white px-6 py-2 rounded font-medium hover:border-eastside-crimson hover:text-eastside-crimson transition-colors">
                <Eye size={16} className="inline mr-2" />
                Preview
              </button>
            </div>
          </div>
        </div>

        {/* Announcement History */}
        <div className="space-y-4">
          <h2 className="text-white text-lg font-medium">ANNOUNCEMENT HISTORY</h2>

          {loading ? (
            <div className="design-card p-8 text-center text-gray-400">Loading announcements...</div>
          ) : announcements.length === 0 ? (
            <div className="design-card p-8 text-center">
              <p className="text-gray-400 text-sm">No announcements yet. Compose your first above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="design-card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-white font-medium">{announcement.title}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getPriorityColor(announcement.priority)}`}>
                          {getPriorityIcon(announcement.priority)}
                          {announcement.priority}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{announcement.body}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(announcement.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {announcement.audience || 'All Athletes'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-sm">Read: 0 of 0</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  )
}