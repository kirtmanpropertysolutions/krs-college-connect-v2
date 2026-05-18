import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/authContext'
import { supabase } from '../lib/supabase'
import { stripExifAndResize } from '../lib/imageUtils.js'
import AthleteLayout from '../components/AthleteLayout.jsx'

export default function AthleteProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [athlete, setAthlete] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState({})
  // Photo upload state — hidden file input + uploading flag + last error
  const photoInputRef = useRef(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoError, setPhotoError] = useState('')

  // Share-my-profile toast state (used by the Copy/Email row)
  const [shareToast, setShareToast] = useState('')

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

  /**
   * Upload a profile photo to Supabase Storage.
   *
   * Flow:
   *   1. User picks a file → onChange fires this handler
   *   2. Client-side validation (size + mime — the bucket also enforces)
   *   3. Upload to `athlete-photos/{user_id}/{timestamp}.{ext}` using
   *      `upsert: true` so re-uploading replaces the existing file
   *   4. Get the public URL (bucket is public-read, no signed-URL flow)
   *   5. Persist the URL on `athletes.profile_photo_url`
   *   6. Update local state so the new image renders immediately
   *
   * RLS on storage.objects only allows writes to `{user_id}/...` paths,
   * so a malicious client can't upload over another athlete's photo.
   */
  const handlePhotoUpload = async (e) => {
    setPhotoError('')
    const file = e.target.files?.[0]
    if (!file || !user?.id) return

    // Client-side validation — friendlier error than waiting for the bucket
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Use JPG, PNG, or WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Max file size is 5 MB.')
      return
    }

    setPhotoUploading(true)
    try {
      // Strip EXIF + resize BEFORE upload. This removes GPS coordinates,
      // device model, and timestamp metadata that phone cameras embed
      // in every photo (a privacy concern — those coords often point at
      // the athlete's home or training facility). Also resizes huge
      // 12 MP camera output down to a sane 1200px max dimension so we
      // don't burn storage and bandwidth on details no display will use.
      const processed = await stripExifAndResize(file)

      // Mime might change if we re-encoded JPEG→JPEG, but the helper
      // preserves PNG transparency when the input was PNG. Pull from the
      // processed blob directly so the upload contentType matches.
      const ext = processed.type === 'image/png' ? 'png' : 'jpg'
      // Date.now() runs inside an async upload event-handler (not render) —
      // we need a fresh timestamp per upload so the storage path is unique.
      // eslint-disable-next-line react-hooks/purity
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('athlete-photos')
        .upload(path, processed, { upsert: true, contentType: processed.type })
      if (uploadErr) throw uploadErr

      const { data: publicData } = supabase.storage
        .from('athlete-photos')
        .getPublicUrl(path)
      const publicUrl = publicData?.publicUrl
      if (!publicUrl) throw new Error('Could not get public URL')

      // Persist on the athlete row so the recruiting card + public
      // profile page pick it up automatically.
      await saveField('athletes', 'profile_photo_url', publicUrl)
    } catch (err) {
      console.error('Photo upload failed:', err)
      setPhotoError(err.message || 'Upload failed — try again.')
    } finally {
      setPhotoUploading(false)
      // Reset the input so picking the same file again still fires onChange
      if (photoInputRef.current) photoInputRef.current.value = ''
    }
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

              {/* Height in inches — kids in the US think in inches/feet,
                  not cm. We still persist `height_cm` in the database
                  (keeps the recruiting card + public profile + any
                  legacy consumers working), but the input + display
                  are inches and we convert on save/load. */}
              <div>
                <label className="block text-gray-400 text-sm uppercase tracking-wider mb-2">
                  Height (inches)
                </label>
                <input
                  type="number"
                  value={
                    athlete?.height_cm
                      ? Math.round(athlete.height_cm / 2.54)
                      : ''
                  }
                  onChange={(e) => {
                    const inches = parseInt(e.target.value)
                    setAthlete((prev) => ({
                      ...prev,
                      height_cm: Number.isFinite(inches)
                        ? Math.round(inches * 2.54)
                        : null,
                    }))
                  }}
                  onBlur={(e) => {
                    const inches = parseInt(e.target.value)
                    handleAthleteSave(
                      'height_cm',
                      Number.isFinite(inches) ? Math.round(inches * 2.54) : null
                    )
                  }}
                  className="input-field"
                  placeholder={`68  (e.g. 5'8" = 68")`}
                  min="48"
                  max="84"
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

          {/* Profile Photo Card — real upload wired to Supabase Storage
              bucket "athlete-photos". The current photo shows above
              the chooser. Re-uploading replaces the existing image
              (handlePhotoUpload uses a unique timestamped path + upsert
              so the CDN never serves a stale version). */}
          <div className="card">
            <h3 className="display-font text-white text-xl mb-6">PROFILE PHOTO</h3>
            <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
              {athlete?.profile_photo_url ? (
                <img
                  src={athlete.profile_photo_url}
                  alt="Your profile photo"
                  className="w-28 h-28 rounded-full mx-auto mb-4 object-cover border-2 border-red-700/40"
                />
              ) : (
                <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center text-2xl">
                  📷
                </div>
              )}
              <p className="text-gray-400 mb-4 text-sm">
                {athlete?.profile_photo_url
                  ? 'Tap to change your headshot.'
                  : 'Upload a professional headshot — coaches see this on your public profile.'}
              </p>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoUpload}
                className="hidden"
                aria-label="Upload profile photo"
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="btn-secondary disabled:opacity-50"
              >
                {photoUploading
                  ? 'Uploading…'
                  : athlete?.profile_photo_url
                  ? 'Change photo'
                  : 'Choose file'}
              </button>
              <p className="text-gray-500 text-xs mt-3">
                JPG, PNG, or WebP · Max 5 MB
              </p>
              {photoError && (
                <p className="text-red-400 text-xs mt-2">{photoError}</p>
              )}
              {saveStatus.profile_photo_url === 'saved' && (
                <p className="text-green-500 text-xs mt-2">Photo saved ✓</p>
              )}
            </div>
          </div>

          {/* Share-my-profile + Download PDF card. The public profile
              URL (/p/{user_id}) is the link athletes paste into coach
              emails. This is also the answer to Chanyn's "how do I see
              the public profile" question. Copy → clipboard, Email →
              Gmail compose pre-filled, PDF → client-side render of
              the athlete profile for email attachments. */}
          <div className="card">
            <h3 className="display-font text-white text-xl mb-4">SHARE YOUR PROFILE</h3>
            <p className="text-gray-400 text-sm mb-5 leading-relaxed">
              This is the public link coaches see. Paste it into outreach
              emails or share with anyone — no sign-in needed to view.
            </p>

            <div className="bg-navy-950 border border-gray-700 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
              <code className="flex-1 text-xs text-gray-300 truncate">
                {typeof window !== 'undefined'
                  ? `${window.location.origin}/p/${user?.id || ''}`
                  : ''}
              </code>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  const url = `${window.location.origin}/p/${user?.id}`
                  try {
                    await navigator.clipboard.writeText(url)
                    setShareToast('Link copied ✓')
                  } catch {
                    setShareToast('Copy failed — long-press to copy manually.')
                  }
                  setTimeout(() => setShareToast(''), 2500)
                }}
                className="btn-secondary"
              >
                Copy link
              </button>
              <a
                href={`/p/${user?.id || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Preview
              </a>
              <button
                onClick={() => {
                  // Gmail compose pre-filled with the public profile link.
                  // Same mobile/desktop trick we use in Outreach — direct
                  // location.href on mobile, popup on desktop.
                  const url = `${window.location.origin}/p/${user?.id}`
                  const name = profile?.full_name || 'an athlete'
                  const subject = `${name} — recruiting profile`
                  const body = `Hi Coach,\n\nI'd like to introduce you to ${name}. You can see my recruiting profile, highlights, and contact info here:\n\n${url}\n\nThanks for your time.\n\n— ${name}`
                  const isMobile = window.matchMedia?.('(max-width: 768px)').matches
                  const gmailUrl =
                    'https://mail.google.com/mail/?view=cm&tf=cm&to=' +
                    '&su=' + encodeURIComponent(subject) +
                    '&body=' + encodeURIComponent(body)
                  if (isMobile) {
                    window.location.href = gmailUrl
                  } else {
                    window.open(gmailUrl, '_blank')
                  }
                }}
                className="btn-secondary"
              >
                Email it
              </button>
            </div>
            {shareToast && (
              <p className="text-green-400 text-xs mt-3">{shareToast}</p>
            )}
          </div>

          {/* Big crimson "Go to Dashboard" CTA at the bottom — answers
              the question new athletes have after completing onboarding:
              "ok, now what?". Crucial for the first-time experience. */}
          <div className="mt-6">
            <button
              onClick={() => (window.location.href = '/')}
              className="eastside-btn w-full flex items-center justify-center gap-2 py-4"
            >
              Go to your dashboard →
            </button>
            <p className="text-text-tertiary text-xs text-center mt-3">
              Your active quests and recommended schools are waiting there.
            </p>
          </div>
        </div>
      </div>
    </AthleteLayout>
  )
}