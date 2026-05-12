import { supabase } from './supabase'

export async function calculateStreak(athleteId) {
  try {
    const { data } = await supabase
      .from('recruiting_activity')
      .select('created_at')
      .eq('athlete_id', athleteId)
      .gte('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (!data || data.length === 0) return 0

    const days = new Set(data.map(r => r.created_at.split('T')[0]))

    let streak = 0
    let cursor = new Date()
    cursor.setHours(0, 0, 0, 0)

    for (let i = 0; i < 60; i++) {
      const dayStr = cursor.toISOString().split('T')[0]
      if (days.has(dayStr)) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else if (i === 0) {
        // No activity today — check yesterday before resetting
        cursor.setDate(cursor.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  } catch (error) {
    console.error('Error calculating streak:', error)
    return 0
  }
}