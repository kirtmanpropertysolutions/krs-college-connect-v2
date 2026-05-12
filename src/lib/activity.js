import { supabase } from './supabase'

export async function logActivity(athleteId, type, data = {}) {
  if (!athleteId || !type) return
  try {
    await supabase.from('recruiting_activity').insert({
      athlete_id: athleteId,
      activity_type: type,
      activity_data: data
    })
  } catch (err) {
    console.error('logActivity failed:', err)
  }
}