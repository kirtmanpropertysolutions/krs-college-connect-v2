import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/activity'
import { Plus, ChevronLeft, ChevronRight, ExternalLink, Edit, Trash2, X } from 'lucide-react'
import AthleteLayout from '../components/AthleteLayout.jsx'
import SchoolBadge from '../components/SchoolBadge.jsx'
import { getSchoolColors, isLightColor } from '../lib/schoolColors'

const VERIFIED_ATHLETICS_URLS = {
  "University of Southern California": "https://usctrojans.com/sports/womens-soccer",
  "USC": "https://usctrojans.com/sports/womens-soccer",
  "University of Washington": "https://gohuskies.com/sports/womens-soccer",
  "University of California, Los Angeles": "https://uclabruins.com/sports/womens-soccer",
  "UCLA": "https://uclabruins.com/sports/womens-soccer",
  "Oregon State University": "https://osubeavers.com/sports/womens-soccer",
  "Washington State University": "https://wsucougars.com/sports/womens-soccer",
  "Northwestern University": "https://nusports.com/sports/womens-soccer",
  "Pennsylvania State University": "https://gopsusports.com/sports/womens-soccer",
  "Penn State": "https://gopsusports.com/sports/womens-soccer",
  "Adams State University": "https://gogrizzlies.com/sports/womens-soccer",
  "Adams State": "https://gogrizzlies.com/sports/womens-soccer",
  "Seattle Pacific University": "https://spufalcons.com/sports/womens-soccer",
  "Seattle Pacific": "https://spufalcons.com/sports/womens-soccer",
  "Academy of Art University": "https://academyartathletics.com",
  "Simon Fraser University": "https://sfuathletics.ca/sports/womens-soccer",
  "Portland Community College": "https://athletics.pcc.edu",
  "University of Colorado Boulder": "https://cubuffs.com/sports/womens-soccer",
  "University of Arizona": "https://arizonawildcats.com/sports/womens-soccer",
  "Arizona State University": "https://thesundevils.com/sports/womens-soccer",
  "University of Oregon": "https://goducks.com/sports/womens-soccer",
  "Rutgers University": "https://scarletknights.com/sports/womens-soccer",
  "University of Maryland": "https://umterps.com/sports/womens-soccer",
  "University of Michigan": "https://mgoblue.com/sports/womens-soccer"
}

// Helper functions
const getAthleticsUrl = (schoolName) => {
  // Try exact match first
  if (VERIFIED_ATHLETICS_URLS[schoolName]) {
    return VERIFIED_ATHLETICS_URLS[schoolName]
  }

  // Fall back to Google search
  return `https://www.google.com/search?q=${encodeURIComponent(schoolName + ' women\'s soccer athletics')}`
}

const getDivisionColor = (schoolName) => {
  // Simple heuristic - could be enhanced with actual division data
  if (schoolName.includes('CC') || schoolName === 'Portland CC') return 'bg-green-700'
  return 'bg-blue-600' // Default to D1
}

// Pipeline School Card Component
function PipelineSchoolCard({ school }) {
  const schoolColors = getSchoolColors(school.school)

  // Use secondary color for light primaries
  const accentColor = isLightColor(schoolColors.primary) ? schoolColors.secondary : schoolColors.primary
  const tintColor = isLightColor(schoolColors.primary) ? schoolColors.secondary : schoolColors.primary

  const athleticsUrl = getAthleticsUrl(school.school)

  return (
    <div
      className="border border-card-border rounded-lg p-4 border-l-0"
      style={{
        borderLeft: `3px solid ${accentColor}`,
        background: `linear-gradient(135deg, ${tintColor}10 0%, ${tintColor}05 50%, transparent 100%), #111827`
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <SchoolBadge schoolName={school.school} size="md" />
        <div className="flex items-start justify-between flex-1">
          <h3 className="font-medium text-white">{school.school}</h3>
          <span className={`px-2 py-1 rounded text-xs font-bold text-white ${getDivisionColor(school.school)}`}>
            D1
          </span>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-4">Division I · NCAA</p>

      <a
        href={athleticsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full bg-club-primary hover:bg-club-primary-dark text-white text-sm py-2 px-3 rounded font-bold text-center"
      >
        SCHOOL ATHLETICS →
      </a>
    </div>
  )
}

export default function RecruitingEvents() {
  const { user } = useAuth()

  // State
  const [loading, setLoading] = useState(true)
  const [pipelineSchools, setPipelineSchools] = useState([])
  const [scheduledCamps, setScheduledCamps] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCamp, setEditingCamp] = useState(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showPastCamps, setShowPastCamps] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    camp_date: '',
    school_name: '',
    cost: '',
    registration_url: '',
    notes: ''
  })

  // Load data
  useEffect(() => {
    if (user?.id) {
      loadData()
    }
  }, [user?.id])

  const loadData = async () => {
    try {
      const [pipelineRes, campsRes] = await Promise.all([
        // Get pipeline schools
        supabase
          .from('pipelines')
          .select('school, stage')
          .eq('athlete_id', user.id)
          .not('stage', 'is', null),

        // Get scheduled camps
        supabase
          .from('scheduled_camps')
          .select('*')
          .eq('athlete_id', user.id)
          .order('camp_date')
      ])

      setPipelineSchools(pipelineRes.data || [])
      setScheduledCamps(campsRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const openAddModal = (prefilledDate = '') => {
    setFormData({
      camp_date: prefilledDate,
      school_name: '',
      cost: '',
      registration_url: '',
      notes: ''
    })
    setEditingCamp(null)
    setShowAddModal(true)
  }

  const openEditModal = (camp) => {
    setFormData({
      camp_date: camp.camp_date,
      school_name: camp.school_name,
      cost: camp.cost || '',
      registration_url: camp.registration_url || '',
      notes: camp.notes || ''
    })
    setEditingCamp(camp)
    setShowAddModal(true)
  }

  const saveCamp = async () => {
    if (!formData.camp_date || !formData.school_name) return

    try {
      const campData = {
        athlete_id: user.id,
        camp_date: formData.camp_date,
        school_name: formData.school_name,
        cost: formData.cost ? parseInt(formData.cost) : null,
        registration_url: formData.registration_url || null,
        notes: formData.notes || null
      }

      if (editingCamp) {
        // Update existing camp
        const { error } = await supabase
          .from('scheduled_camps')
          .update(campData)
          .eq('id', editingCamp.id)

        if (error) throw error
      } else {
        // Create new camp
        const { error } = await supabase
          .from('scheduled_camps')
          .insert([campData])

        if (error) throw error

        // Log activity for new camps
        await logActivity(user.id, 'camp_scheduled', {
          school_name: formData.school_name,
          camp_date: formData.camp_date
        })
      }

      setShowAddModal(false)
      loadData()
    } catch (error) {
      console.error('Error saving camp:', error)
    }
  }

  const deleteCamp = async (campId) => {
    if (!confirm('Delete this camp?')) return

    try {
      const { error } = await supabase
        .from('scheduled_camps')
        .delete()
        .eq('id', campId)

      if (error) throw error

      loadData()
    } catch (error) {
      console.error('Error deleting camp:', error)
    }
  }

  // Calendar helpers
  const getCalendarDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    const days = []
    for (let i = 0; i < 42; i++) { // 6 weeks
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      days.push(date)
    }
    return days
  }

  const getCampsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0]
    return scheduledCamps.filter(camp => camp.camp_date === dateStr)
  }

  const isToday = (date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth.getMonth()
  }

  const isPastDate = (date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const upcomingCamps = scheduledCamps.filter(camp =>
    new Date(camp.camp_date) >= new Date()
  )
  const pastCamps = scheduledCamps.filter(camp =>
    new Date(camp.camp_date) < new Date()
  )

  if (loading) {
    return (
      <AthleteLayout>
        <div className="p-4 md:p-8">
          <div className="text-white">Loading ID camps...</div>
        </div>
      </AthleteLayout>
    )
  }

  return (
    <AthleteLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="display-font text-3xl text-white mb-2">ID CAMPS</h1>
          <p className="text-gray-400">Track camps for your target schools</p>
        </div>

        {/* Pipeline Schools Section */}
        <div className="mb-12">
          <div className="mb-6">
            <h2 className="display-font text-xl text-white mb-2">MY PIPELINE SCHOOLS</h2>
            <p className="text-gray-400">View athletics info for the schools you're tracking. Look for 'Camps' in each school's navigation.</p>
          </div>

          {pipelineSchools.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pipelineSchools.map((school, index) => (
                <PipelineSchoolCard key={index} school={school} />
              ))}
            </div>
          ) : (
            <div className="bg-navy-800 border border-gray-600 rounded-lg p-6 text-center">
              <p className="text-gray-400 mb-3">Add schools to your pipeline first</p>
              <a
                href="/coach-finder"
                className="text-club-primary hover:text-club-primary font-medium"
              >
                Find Schools →
              </a>
            </div>
          )}
        </div>

        {/* Camp Calendar Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="display-font text-xl text-white mb-2">MY CAMP CALENDAR</h2>
              <p className="text-gray-400">Track ID camps you're planning, registered for, or attended</p>
            </div>
            <button
              onClick={() => openAddModal()}
              className="bg-club-primary hover:bg-club-primary-dark text-white px-4 py-2 rounded font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              ADD CAMP
            </button>
          </div>

          {/* Calendar Header */}
          <div className="bg-navy-800 border border-navy-700 rounded-lg">
            <div className="flex items-center justify-between p-4 border-b border-navy-700">
              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="p-2 hover:bg-navy-700 rounded"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>

              <h3 className="text-lg font-medium text-white">
                {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>

              <button
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="p-2 hover:bg-navy-700 rounded"
              >
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-xs font-medium text-gray-400">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {getCalendarDays().map((date, index) => {
                  const camps = getCampsForDate(date)
                  const isPast = isPastDate(date)

                  return (
                    <button
                      key={index}
                      onClick={() => openAddModal(date.toISOString().split('T')[0])}
                      className={`
                        min-h-[60px] p-1 text-left border rounded transition-colors
                        ${isCurrentMonth(date) ? 'border-navy-600' : 'border-navy-700 opacity-40'}
                        ${isToday(date) ? 'border-club-primary' : ''}
                        hover:bg-navy-700
                      `}
                    >
                      <div className={`text-xs mb-1 ${isPast ? 'text-gray-500' : 'text-gray-300'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {camps.map(camp => (
                          <button
                            key={camp.id}
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal(camp)
                            }}
                            className={`block w-full text-left px-1 py-0.5 rounded text-xs font-medium truncate ${
                              isPast ? 'bg-gray-700 text-gray-400' : 'bg-club-secondary text-black'
                            }`}
                          >
                            {camp.school_name.length > 12 ? camp.school_name.substring(0, 12) + '...' : camp.school_name}
                          </button>
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Camps List */}
        <div className="mb-8">
          <h3 className="display-font text-lg text-white mb-4">UPCOMING CAMPS</h3>
          {upcomingCamps.length > 0 ? (
            <div className="bg-navy-800 border border-navy-700 rounded-lg">
              {upcomingCamps.map((camp, index) => (
                <div key={camp.id} className={`p-4 flex items-center justify-between ${index > 0 ? 'border-t border-navy-700' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <span className="text-white font-medium">{formatDate(camp.camp_date)}</span>
                      <span className="text-white">{camp.school_name}</span>
                      {camp.cost && <span className="text-gray-400">${camp.cost}</span>}
                    </div>
                    {camp.notes && (
                      <p className="text-sm text-gray-400 mt-1">{camp.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {camp.registration_url && (
                      <a
                        href={camp.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-club-primary hover:text-club-primary flex items-center gap-1"
                      >
                        Register → <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      onClick={() => openEditModal(camp)}
                      className="p-2 text-gray-400 hover:text-white"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCamp(camp.id)}
                      className="p-2 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No upcoming camps scheduled</p>
          )}
        </div>

        {/* Past Camps Section */}
        {pastCamps.length > 0 && (
          <div>
            <button
              onClick={() => setShowPastCamps(!showPastCamps)}
              className="display-font text-lg text-white mb-4 hover:text-gray-300"
            >
              PAST CAMPS ({pastCamps.length}) {showPastCamps ? '▼' : '▶'}
            </button>

            {showPastCamps && (
              <div className="bg-navy-800 border border-navy-700 rounded-lg opacity-75">
                {pastCamps.map((camp, index) => (
                  <div key={camp.id} className={`p-4 flex items-center justify-between ${index > 0 ? 'border-t border-navy-700' : ''}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400 font-medium">{formatDate(camp.camp_date)}</span>
                        <span className="text-gray-300">{camp.school_name}</span>
                        {camp.cost && <span className="text-gray-500">${camp.cost}</span>}
                      </div>
                      {camp.notes && (
                        <p className="text-sm text-gray-500 mt-1">{camp.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => deleteCamp(camp.id)}
                      className="p-2 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Camp Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="bg-navy-900 border border-gray-700 rounded-2xl max-w-md w-full p-6">
              <div className="flex items-start justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  {editingCamp ? 'Edit Camp' : 'Add Camp'}
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-navy-800 hover:bg-navy-700 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-400"/>
                </button>
              </div>

              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); saveCamp(); }}>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.camp_date}
                    onChange={(e) => setFormData({...formData, camp_date: e.target.value})}
                    className="w-full bg-navy-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-club-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">School Name *</label>
                  <input
                    type="text"
                    value={formData.school_name}
                    onChange={(e) => setFormData({...formData, school_name: e.target.value})}
                    className="w-full bg-navy-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-club-primary"
                    list="pipeline-schools"
                    required
                  />
                  <datalist id="pipeline-schools">
                    {pipelineSchools.map(school => (
                      <option key={school.school} value={school.school} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Cost ($)</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                    className="w-full bg-navy-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-club-primary"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Registration URL</label>
                  <input
                    type="url"
                    value={formData.registration_url}
                    onChange={(e) => setFormData({...formData, registration_url: e.target.value})}
                    className="w-full bg-navy-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-club-primary"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full bg-navy-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-club-primary resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="text-xs text-gray-500 mt-1">{formData.notes.length}/200</div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-club-primary hover:bg-club-primary-dark text-white py-2 px-4 rounded font-bold"
                  >
                    {editingCamp ? 'UPDATE' : 'SAVE'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 border border-gray-600 hover:border-gray-500 text-white py-2 px-4 rounded font-bold"
                  >
                    CANCEL
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AthleteLayout>
  )
}