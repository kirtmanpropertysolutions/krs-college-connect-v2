import { supabase } from './supabase'

export async function calculateRecruitingScore(athleteId) {
  try {
    // Profile completeness — 40 pts
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', athleteId)
      .single()

    // Check if athlete has highlights in highlights table
    const { count: hlCount } = await supabase
      .from('highlights')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', athleteId)

    const profileFields = ['full_name', 'graduation_year', 'position', 'gpa', 'jersey_number', 'highlight_url', 'bio', 'club_team']
    const filled = profile ? profileFields.filter(f => {
      // For highlight_url, count as filled if either profile.highlight_url exists OR athlete has highlights
      if (f === 'highlight_url') {
        return profile[f] || (hlCount && hlCount > 0)
      }
      return profile[f]
    }).length : 0
    const profileScore = Math.round((filled / profileFields.length) * 40)

    // Pipeline depth — 20 pts (5+ schools = full)
    const { count: pipelineCount } = await supabase
      .from('pipelines')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', athleteId)
    const pipelineScore = Math.min(Math.round(((pipelineCount || 0) / 5) * 20), 20)

    // Outreach activity — 20 pts (3+ emails in 30d = full)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { count: emailCount } = await supabase
      .from('outreach')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_id', athleteId)
      .gte('sent_at', thirtyDaysAgo)
    const outreachScore = Math.min(Math.round(((emailCount || 0) / 3) * 20), 20)

    // Recent engagement — 20 pts (activity on 5+ days in last 7 = full)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('recruiting_activity')
      .select('created_at')
      .eq('athlete_id', athleteId)
      .gte('created_at', sevenDaysAgo)
    const uniqueDays = new Set((recent || []).map(r => r.created_at.split('T')[0])).size
    const engagementScore = Math.min(Math.round((uniqueDays / 5) * 20), 20)

    return {
      score: profileScore + pipelineScore + outreachScore + engagementScore,
      breakdown: {
        profile: { score: profileScore, max: 40 },
        pipeline: { score: pipelineScore, max: 20 },
        outreach: { score: outreachScore, max: 20 },
        engagement: { score: engagementScore, max: 20 }
      }
    }
  } catch (error) {
    console.error('Error calculating recruiting score:', error)
    return {
      score: 0,
      breakdown: {
        profile: { score: 0, max: 40 },
        pipeline: { score: 0, max: 20 },
        outreach: { score: 0, max: 20 },
        engagement: { score: 0, max: 20 }
      }
    }
  }
}