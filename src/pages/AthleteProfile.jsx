import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import AthleteLayout from '../components/AthleteLayout.jsx'

export default function AthleteProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [athlete, setAthlete] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState({})

  // Load profile and athlete data
  useEffect(() => {
    async function loadData() {
      if (!user?.id) return

      try {
        // Load profile data
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        // Load athlete data
        const { data: athleteData } = await supabase
          .from('athletes')
          .select('*')
          .eq('user_id', user.id)
          .single()

        setProfile(profileData || {})
        setAthlete(athleteData || {})
      } catch (error) {
        console.error('Error loading profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user?.id])

  // Calculate profile completion percentage
  const calculateCompletion = () => {
    const fields = [
      // Core required fields
      profile?.full_name,
      athlete?.position,
      athlete?.class_year,
      athlete?.bio,
      athlete?.highlight_reel_url,

      // Personal info
      athlete?.club_team,
      athlete?.high_school,
      athlete?.city,
      athlete?.height_cm,
      athlete?.weight,

      // Academic
      athlete?.gpa,
      athlete?.intended_major,

      // Soccer stats (key ones)
      athlete?.goals !== null ? athlete?.goals : null,
      athlete?.games_played !== null ? athlete?.games_played : null,

      // Social media (at least one)
      athlete?.instagram_url || athlete?.twitter_url || athlete?.tiktok_url || athlete?.youtube_url ? 'social' : null,
    ]
    const filledFields = fields.filter(field => field != null && field !== '').length
    return Math.round((filledFields / fields.length) * 100)
  }

  // Save field to appropriate table
  const saveField = async (table, field, value) => {
    if (!user?.id) return

    setSaveStatus({ [field]: 'saving' })

    try {
      if (table === 'profiles') {
        await supabase
          .from('profiles')
          .upsert({ id: user.id, org_id: profile?.org_id, [field]: value }, { onConflict: 'id' })

        setProfile(prev => ({ ...prev, [field]: value }))
      } else if (table === 'athletes') {
        await supabase
          .from('athletes')
          .upsert({ user_id: user.id, org_id: profile?.org_id, [field]: value }, { onConflict: 'user_id' })

        setAthlete(prev => ({ ...prev, [field]: value }))
      }

      setSaveStatus({ [field]: 'saved' })
      setTimeout(() => setSaveStatus({}), 2000)
    } catch (error) {
      console.error('Error saving field:', error)
      setSaveStatus({ [field]: 'error' })
      setTimeout(() => setSaveStatus({}), 2000)
    }
  }

  // Save field handlers
  const handleProfileSave = (field, value) => saveField('profiles', field, value)
  const handleAthleteSave = (field, value) => saveField('athletes', field, value)

  if (loading) {
    return (
      <AthleteLayout>
        <div className="p-8">
          <div className="text-white">Loading profile...</div>
        </div>
      </AthleteLayout>
    )
  }

  const completionPercentage = calculateCompletion()

  return (
    <AthleteLayout>
      <div className="p-8">
        {/* Profile Completion Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="display-font text-white text-xl">PROFILE COMPLETION</h2>
            <span className="text-club-secondary font-bold">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-club-secondary h-3 rounded-full transition-all duration-500"
              style={{width: `${completionPercentage}%`}}
            ></div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Personal Info Card */}
          <div className="card">
            <h3 className="display-font text-white text-xl mb-6">PERSONAL INFO</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile?.full_name || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  onBlur={(e) => handleProfileSave('full_name', e.target.value)}
                  className="input-field"
                  placeholder="Enter your full name"
                />
                {saveStatus.full_name && (
                  <span className={`text-xs ${saveStatus.full_name === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.full_name === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Position
                </label>
                <select
                  value={athlete?.position || ''}
                  onChange={(e) => {
                    setAthlete(prev => ({ ...prev, position: e.target.value }))
                    handleAthleteSave('position', e.target.value)
                  }}
                  className="input-field"
                >
                  <option value="">Select position</option>
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Defender">Defender</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Forward">Forward</option>
                </select>
                {saveStatus.position && (
                  <span className={`text-xs ${saveStatus.position === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.position === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Graduation Year
                </label>
                <input
                  type="number"
                  value={athlete?.class_year || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, class_year: parseInt(e.target.value) || null }))}
                  onBlur={(e) => handleAthleteSave('class_year', parseInt(e.target.value) || null)}
                  className="input-field"
                  placeholder="2027"
                  min="2024"
                  max="2035"
                />
                {saveStatus.class_year && (
                  <span className={`text-xs ${saveStatus.class_year === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.class_year === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Club Team
                </label>
                <input
                  type="text"
                  value={athlete?.club_team || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, club_team: e.target.value }))}
                  onBlur={(e) => handleAthleteSave('club_team', e.target.value)}
                  className="input-field"
                  placeholder="Eastside FC Washington"
                />
                {saveStatus.club_team && (
                  <span className={`text-xs ${saveStatus.club_team === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.club_team === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  High School
                </label>
                <input
                  type="text"
                  value={athlete?.high_school || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, high_school: e.target.value }))}
                  onBlur={(e) => handleAthleteSave('high_school', e.target.value)}
                  className="input-field"
                  placeholder="Enter your high school"
                />
                {saveStatus.high_school && (
                  <span className={`text-xs ${saveStatus.high_school === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.high_school === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={athlete?.city || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, city: e.target.value }))}
                  onBlur={(e) => handleAthleteSave('city', e.target.value)}
                  className="input-field"
                  placeholder="Seattle"
                />
                {saveStatus.city && (
                  <span className={`text-xs ${saveStatus.city === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.city === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={athlete?.state || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, state: e.target.value }))}
                  onBlur={(e) => handleAthleteSave('state', e.target.value)}
                  className="input-field"
                  placeholder="WA"
                />
                {saveStatus.state && (
                  <span className={`text-xs ${saveStatus.state === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.state === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Jersey Number
                </label>
                <input
                  type="number"
                  value={athlete?.jersey_number || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, jersey_number: parseInt(e.target.value) || null }))}
                  onBlur={(e) => handleAthleteSave('jersey_number', parseInt(e.target.value) || null)}
                  className="input-field"
                  placeholder="10"
                  min="1"
                  max="99"
                />
                {saveStatus.jersey_number && (
                  <span className={`text-xs ${saveStatus.jersey_number === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.jersey_number === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Dominant Foot
                </label>
                <select
                  value={athlete?.dominant_foot || ''}
                  onChange={(e) => {
                    setAthlete(prev => ({ ...prev, dominant_foot: e.target.value }))
                    handleAthleteSave('dominant_foot', e.target.value)
                  }}
                  className="input-field"
                >
                  <option value="">Select dominant foot</option>
                  <option value="Left">Left</option>
                  <option value="Right">Right</option>
                  <option value="Both">Both</option>
                </select>
                {saveStatus.dominant_foot && (
                  <span className={`text-xs ${saveStatus.dominant_foot === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.dominant_foot === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={athlete?.height_cm || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, height_cm: parseInt(e.target.value) || null }))}
                  onBlur={(e) => handleAthleteSave('height_cm', parseInt(e.target.value) || null)}
                  className="input-field"
                  placeholder="175"
                  min="120"
                  max="220"
                />
                {saveStatus.height_cm && (
                  <span className={`text-xs ${saveStatus.height_cm === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.height_cm === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  value={athlete?.weight || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, weight: parseInt(e.target.value) || null }))}
                  onBlur={(e) => handleAthleteSave('weight', parseInt(e.target.value) || null)}
                  className="input-field"
                  placeholder="150"
                  min="80"
                  max="300"
                />
                {saveStatus.weight && (
                  <span className={`text-xs ${saveStatus.weight === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.weight === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Academic Info Card */}
          <div className="card">
            <h3 className="display-font text-white text-xl mb-6">ACADEMIC INFO</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  GPA
                </label>
                <input
                  type="number"
                  value={athlete?.gpa || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, gpa: parseFloat(e.target.value) || null }))}
                  onBlur={(e) => handleAthleteSave('gpa', parseFloat(e.target.value) || null)}
                  className="input-field"
                  placeholder="3.75"
                  min="0"
                  max="4.0"
                  step="0.01"
                />
                {saveStatus.gpa && (
                  <span className={`text-xs ${saveStatus.gpa === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.gpa === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  SAT Score
                </label>
                <input
                  type="number"
                  value={athlete?.sat_score || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, sat_score: parseInt(e.target.value) || null }))}
                  onBlur={(e) => handleAthleteSave('sat_score', parseInt(e.target.value) || null)}
                  className="input-field"
                  placeholder="1450"
                  min="400"
                  max="1600"
                />
                {saveStatus.sat_score && (
                  <span className={`text-xs ${saveStatus.sat_score === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.sat_score === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  ACT Score
                </label>
                <input
                  type="number"
                  value={athlete?.act_score || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, act_score: parseInt(e.target.value) || null }))}
                  onBlur={(e) => handleAthleteSave('act_score', parseInt(e.target.value) || null)}
                  className="input-field"
                  placeholder="32"
                  min="1"
                  max="36"
                />
                {saveStatus.act_score && (
                  <span className={`text-xs ${saveStatus.act_score === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.act_score === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Intended Major
                </label>
                <input
                  type="text"
                  value={athlete?.intended_major || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, intended_major: e.target.value }))}
                  onBlur={(e) => handleAthleteSave('intended_major', e.target.value)}
                  className="input-field"
                  placeholder="Business Administration"
                />
                {saveStatus.intended_major && (
                  <span className={`text-xs ${saveStatus.intended_major === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.intended_major === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Academic Interests
                </label>
                <input
                  type="text"
                  value={athlete?.academic_interests || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, academic_interests: e.target.value }))}
                  onBlur={(e) => handleAthleteSave('academic_interests', e.target.value)}
                  className="input-field"
                  placeholder="Economics, Marketing, Sports Management"
                />
                {saveStatus.academic_interests && (
                  <span className={`text-xs ${saveStatus.academic_interests === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.academic_interests === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Honors/AP Classes
                </label>
                <textarea
                  value={athlete?.honors_ap_classes || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, honors_ap_classes: e.target.value }))}
                  onBlur={(e) => handleAthleteSave('honors_ap_classes', e.target.value)}
                  className="input-field h-20 resize-none"
                  placeholder="AP Calculus, Honors English, AP Psychology..."
                />
                {saveStatus.honors_ap_classes && (
                  <span className={`text-xs ${saveStatus.honors_ap_classes === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.honors_ap_classes === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Soccer Stats Card */}
          <div className="card">
            <h3 className="display-font text-white text-xl mb-6">SOCCER STATS (SEASON)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Goals
                </label>
                <input
                  type="number"
                  value={athlete?.goals || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, goals: parseInt(e.target.value) || 0 }))}
                  onBlur={(e) => handleAthleteSave('goals', parseInt(e.target.value) || 0)}
                  className="input-field"
                  placeholder="12"
                  min="0"
                />
                {saveStatus.goals && (
                  <span className={`text-xs ${saveStatus.goals === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.goals === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Assists
                </label>
                <input
                  type="number"
                  value={athlete?.assists || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, assists: parseInt(e.target.value) || 0 }))}
                  onBlur={(e) => handleAthleteSave('assists', parseInt(e.target.value) || 0)}
                  className="input-field"
                  placeholder="8"
                  min="0"
                />
                {saveStatus.assists && (
                  <span className={`text-xs ${saveStatus.assists === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.assists === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Minutes Played
                </label>
                <input
                  type="number"
                  value={athlete?.minutes_played || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, minutes_played: parseInt(e.target.value) || 0 }))}
                  onBlur={(e) => handleAthleteSave('minutes_played', parseInt(e.target.value) || 0)}
                  className="input-field"
                  placeholder="1440"
                  min="0"
                />
                {saveStatus.minutes_played && (
                  <span className={`text-xs ${saveStatus.minutes_played === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.minutes_played === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Games Played
                </label>
                <input
                  type="number"
                  value={athlete?.games_played || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, games_played: parseInt(e.target.value) || 0 }))}
                  onBlur={(e) => handleAthleteSave('games_played', parseInt(e.target.value) || 0)}
                  className="input-field"
                  placeholder="18"
                  min="0"
                />
                {saveStatus.games_played && (
                  <span className={`text-xs ${saveStatus.games_played === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.games_played === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Clean Sheets
                </label>
                <input
                  type="number"
                  value={athlete?.clean_sheets || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, clean_sheets: parseInt(e.target.value) || 0 }))}
                  onBlur={(e) => handleAthleteSave('clean_sheets', parseInt(e.target.value) || 0)}
                  className="input-field"
                  placeholder="6"
                  min="0"
                />
                {saveStatus.clean_sheets && (
                  <span className={`text-xs ${saveStatus.clean_sheets === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.clean_sheets === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Shots on Goal
                </label>
                <input
                  type="number"
                  value={athlete?.shots_on_goal || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, shots_on_goal: parseInt(e.target.value) || 0 }))}
                  onBlur={(e) => handleAthleteSave('shots_on_goal', parseInt(e.target.value) || 0)}
                  className="input-field"
                  placeholder="45"
                  min="0"
                />
                {saveStatus.shots_on_goal && (
                  <span className={`text-xs ${saveStatus.shots_on_goal === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.shots_on_goal === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Pass Completion %
                </label>
                <input
                  type="number"
                  value={athlete?.pass_completion_percent || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, pass_completion_percent: parseFloat(e.target.value) || null }))}
                  onBlur={(e) => handleAthleteSave('pass_completion_percent', parseFloat(e.target.value) || null)}
                  className="input-field"
                  placeholder="87"
                  min="0"
                  max="100"
                  step="0.1"
                />
                {saveStatus.pass_completion_percent && (
                  <span className={`text-xs ${saveStatus.pass_completion_percent === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.pass_completion_percent === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Social Media Card */}
          <div className="card">
            <h3 className="display-font text-white text-xl mb-6">SOCIAL MEDIA</h3>
            <p className="text-gray-400 text-sm mb-6">
              These links are auto-included in every email you send to coaches.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 flex items-center justify-center text-lg">
                  📷
                </div>
                <div className="flex-1">
                  <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                    Instagram
                  </label>
                  <input
                    type="url"
                    value={athlete?.instagram_url || ''}
                    onChange={(e) => setAthlete(prev => ({ ...prev, instagram_url: e.target.value }))}
                    onBlur={(e) => handleAthleteSave('instagram_url', e.target.value)}
                    className="input-field"
                    placeholder="https://instagram.com/yourusername"
                  />
                  {saveStatus.instagram_url && (
                    <span className={`text-xs ${saveStatus.instagram_url === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                      {saveStatus.instagram_url === 'saved' ? 'Saved' : 'Error'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-8 h-8 flex items-center justify-center text-lg">
                  🐦
                </div>
                <div className="flex-1">
                  <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                    X (Twitter)
                  </label>
                  <input
                    type="url"
                    value={athlete?.twitter_url || ''}
                    onChange={(e) => setAthlete(prev => ({ ...prev, twitter_url: e.target.value }))}
                    onBlur={(e) => handleAthleteSave('twitter_url', e.target.value)}
                    className="input-field"
                    placeholder="https://x.com/yourusername"
                  />
                  {saveStatus.twitter_url && (
                    <span className={`text-xs ${saveStatus.twitter_url === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                      {saveStatus.twitter_url === 'saved' ? 'Saved' : 'Error'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-8 h-8 flex items-center justify-center text-lg">
                  🎵
                </div>
                <div className="flex-1">
                  <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                    TikTok
                  </label>
                  <input
                    type="url"
                    value={athlete?.tiktok_url || ''}
                    onChange={(e) => setAthlete(prev => ({ ...prev, tiktok_url: e.target.value }))}
                    onBlur={(e) => handleAthleteSave('tiktok_url', e.target.value)}
                    className="input-field"
                    placeholder="https://tiktok.com/@yourusername"
                  />
                  {saveStatus.tiktok_url && (
                    <span className={`text-xs ${saveStatus.tiktok_url === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                      {saveStatus.tiktok_url === 'saved' ? 'Saved' : 'Error'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-8 h-8 flex items-center justify-center text-lg">
                  📺
                </div>
                <div className="flex-1">
                  <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                    YouTube
                  </label>
                  <input
                    type="url"
                    value={athlete?.youtube_url || ''}
                    onChange={(e) => setAthlete(prev => ({ ...prev, youtube_url: e.target.value }))}
                    onBlur={(e) => handleAthleteSave('youtube_url', e.target.value)}
                    className="input-field"
                    placeholder="https://youtube.com/@yourchannel"
                  />
                  {saveStatus.youtube_url && (
                    <span className={`text-xs ${saveStatus.youtube_url === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                      {saveStatus.youtube_url === 'saved' ? 'Saved' : 'Error'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Highlight Reels Card */}
          <div className="card">
            <h3 className="display-font text-white text-xl mb-6">HIGHLIGHT REELS</h3>
            <p className="text-gray-400 text-sm mb-6">
              Tip: Athletes with highlight reels get 3x more coach responses.
            </p>

            {/* Main highlight platforms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-6 bg-orange-900/20 border border-orange-500/20 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center">
                    📹
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Trace Profile URL</h4>
                    <p className="text-orange-200 text-sm">
                      The #1 video platform for club soccer. College coaches actively search Trace profiles.
                    </p>
                  </div>
                </div>
                <input
                  type="url"
                  value={athlete?.highlight_reel_url || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, highlight_reel_url: e.target.value }))}
                  onBlur={(e) => handleAthleteSave('highlight_reel_url', e.target.value)}
                  className="input-field"
                  placeholder="https://trace.com/your-profile"
                />
                {saveStatus.highlight_reel_url && (
                  <span className={`text-xs ${saveStatus.highlight_reel_url === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.highlight_reel_url === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div className="p-6 bg-blue-900/20 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                    ▶️
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Hudl Highlight Reel URL</h4>
                    <p className="text-blue-200 text-sm">
                      Share your Hudl highlight reel directly with college coaches.
                    </p>
                  </div>
                </div>
                <input
                  type="url"
                  value={athlete?.hudl_url || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, hudl_url: e.target.value }))}
                  onBlur={(e) => handleAthleteSave('hudl_url', e.target.value)}
                  className="input-field"
                  placeholder="https://hudl.com/your-highlights"
                />
                {saveStatus.hudl_url && (
                  <span className={`text-xs ${saveStatus.hudl_url === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.hudl_url === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>
            </div>

            {/* Additional highlight fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  YouTube Highlights
                </label>
                <input
                  type="url"
                  value={athlete?.youtube_highlights_url || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, youtube_highlights_url: e.target.value }))}
                  onBlur={(e) => handleAthleteSave('youtube_highlights_url', e.target.value)}
                  className="input-field"
                  placeholder="https://youtube.com/watch?v=..."
                />
                {saveStatus.youtube_highlights_url && (
                  <span className={`text-xs ${saveStatus.youtube_highlights_url === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.youtube_highlights_url === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Veo Link
                </label>
                <input
                  type="url"
                  value={athlete?.veo_link_url || ''}
                  onChange={(e) => setAthlete(prev => ({ ...prev, veo_link_url: e.target.value }))}
                  onBlur={(e) => handleAthleteSave('veo_link_url', e.target.value)}
                  className="input-field"
                  placeholder="https://veo.co/your-video"
                />
                {saveStatus.veo_link_url && (
                  <span className={`text-xs ${saveStatus.veo_link_url === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                    {saveStatus.veo_link_url === 'saved' ? 'Saved' : 'Error'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bio Card */}
          <div className="card">
            <h3 className="display-font text-white text-xl mb-6">BIO / RECRUITING STATEMENT</h3>
            <textarea
              value={athlete?.bio || ''}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  setAthlete(prev => ({ ...prev, bio: e.target.value }))
                }
              }}
              onBlur={(e) => handleAthleteSave('bio', e.target.value)}
              className="input-field h-32 resize-none"
              placeholder="Write a personal statement that coaches will read. Share your passion for soccer, your goals, and what makes you unique as a player…"
              maxLength="500"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-gray-500 text-sm">
                {(athlete?.bio || '').length}/500 characters
              </span>
              {saveStatus.bio && (
                <span className={`text-xs ${saveStatus.bio === 'saved' ? 'text-green-500' : 'text-red-500'}`}>
                  {saveStatus.bio === 'saved' ? 'Saved' : 'Error'}
                </span>
              )}
            </div>
          </div>

          {/* Profile Photo Card */}
          <div className="card">
            <h3 className="display-font text-white text-xl mb-6">PROFILE PHOTO</h3>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                📷
              </div>
              <p className="text-gray-400 mb-4">Upload a professional headshot photo</p>
              <button
                className="btn-secondary"
                disabled
                title="Photo upload requires backend implementation"
              >
                Choose File
              </button>
              <p className="text-gray-500 text-sm mt-2">
                JPG or PNG, max 5MB
              </p>
            </div>
          </div>
        </div>
      </div>
    </AthleteLayout>
  )
}