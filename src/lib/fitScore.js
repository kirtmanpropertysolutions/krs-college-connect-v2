// Shared fit score calculation for School Fit Quiz and Coach Finder
// Extracted from CoachFinder.jsx to avoid duplication

// Helper function for school size matching
export const getSizeMatch = (sizePreference, enrollment) => {
  if (!enrollment) return 5 // Default when missing data

  if (sizePreference === 'no_preference') return 10

  if (sizePreference === 'small' && enrollment < 5000) return 10
  if (sizePreference === 'medium' && enrollment >= 5000 && enrollment <= 15000) return 10
  if (sizePreference === 'large' && enrollment > 15000) return 10

  // Partial credit for close matches
  if (sizePreference === 'small' && enrollment < 8000) return 7
  if (sizePreference === 'medium' && (enrollment < 20000 && enrollment >= 3000)) return 7
  if (sizePreference === 'large' && enrollment > 12000) return 7

  return 3 // Poor match
}

// Get user's region based on state
export const getUserRegion = (state) => {
  const regionMap = {
    WA: 'Pacific Northwest', OR: 'Pacific Northwest', ID: 'Pacific Northwest',
    CA: 'California',
    CO: 'Mountain West', UT: 'Mountain West', WY: 'Mountain West', MT: 'Mountain West',
    AZ: 'Southwest', NM: 'Southwest', NV: 'Southwest'
  }
  return regionMap[state] || 'Unknown'
}

// Check if regions are adjacent
export const areAdjacentRegions = (region1, region2) => {
  const adjacencies = {
    'Pacific Northwest': ['California', 'Mountain West'],
    'California': ['Pacific Northwest', 'Southwest'],
    'Mountain West': ['Pacific Northwest', 'Southwest', 'Midwest'],
    'Southwest': ['California', 'Mountain West']
  }
  return adjacencies[region1]?.includes(region2) || adjacencies[region2]?.includes(region1)
}

// Comprehensive fit score using quiz responses (100-point algorithm)
export const calculateQuizBasedFitScore = (school, quiz, profile) => {
  let score = 0

  // Division match (20pts)
  if (quiz.division_target && school.division) {
    const divisionMap = {
      'd1_only': ['D1'],
      'd1_d2': ['D1', 'D2'],
      'd2_d3': ['D2', 'D3'],
      'all_divisions': ['D1', 'D2', 'D3', 'NAIA', 'JUCO']
    }
    const acceptedDivisions = divisionMap[quiz.division_target] || []
    if (acceptedDivisions.includes(school.division)) {
      score += 20
    } else {
      score += 5 // Partial credit for close matches
    }
  } else {
    score += 10 // Default when data missing
  }

  // Region match (15pts)
  if (quiz.distance_from_home && school.region) {
    const userState = profile?.athlete?.state || 'WA'
    const userRegion = getUserRegion(userState)

    if (quiz.distance_from_home === 'anywhere') {
      score += 15 // No preference
    } else if (quiz.distance_from_home === 'driving_distance') {
      if (userRegion === school.region) {
        score += 15 // Same region
      } else {
        score += 3 // Far from home
      }
    } else if (quiz.distance_from_home === 'same_region') {
      if (userRegion === school.region) {
        score += 15 // Same region
      } else if (areAdjacentRegions(userRegion, school.region)) {
        score += 10 // Adjacent region
      } else {
        score += 5 // Different region
      }
    }
  } else {
    score += 8 // Default when data missing
  }

  // Academic fit (15pts)
  if (quiz.academic_priority && school.academic_rank) {
    if (quiz.academic_priority === 'ivy_tier' && school.academic_rank <= 25) {
      score += 15
    } else if (quiz.academic_priority === 'strong_academic' && school.academic_rank <= 100) {
      score += 15
    } else if (quiz.academic_priority === 'balanced') {
      score += 12 // Good balance
    } else if (quiz.academic_priority === 'soccer_first') {
      score += 15 // Soccer first, academics less critical
    } else {
      score += 8 // Partial match
    }
  } else {
    score += 10 // Default when data missing
  }

  // School size (10pts)
  if (quiz.school_size && school.enrollment) {
    const sizeMatch = getSizeMatch(quiz.school_size, school.enrollment)
    score += sizeMatch
  } else {
    score += 5 // Default when data missing
  }

  // Program prestige (10pts)
  if (quiz.program_prestige && school.academic_rank) {
    if (quiz.program_prestige === 'top_25' && school.academic_rank <= 25) {
      score += 10
    } else if (quiz.program_prestige === 'top_50' && school.academic_rank <= 50) {
      score += 10
    } else if (quiz.program_prestige === 'competitive_in_conference') {
      score += 8 // Most schools qualify
    } else if (quiz.program_prestige === 'any_program') {
      score += 10 // No preference
    } else {
      score += 5 // Partial match
    }
  } else {
    score += 5 // Default when data missing
  }

  // Cost sensitivity (10pts)
  if (quiz.cost_sensitivity) {
    // This would ideally use school cost data, but we'll use division as proxy
    if (quiz.cost_sensitivity === 'not_a_concern') {
      score += 10
    } else if (quiz.cost_sensitivity === 'some_aid') {
      score += 8
    } else if (quiz.cost_sensitivity === 'significant_aid_needed') {
      // Favor D3 and smaller schools that might offer more aid
      if (school.division === 'D3' || school.enrollment < 10000) {
        score += 10
      } else {
        score += 6
      }
    }
  } else {
    score += 5 // Default when data missing
  }

  // Coach relationship (5pts)
  if (quiz.coach_relationship_priority) {
    // All coach types get points as this is preference-based
    score += 5
  } else {
    score += 3 // Default when data missing
  }

  // Campus culture & support services (15pts)
  let cultureScore = 0
  if (quiz.campus_culture) {
    // Give points based on culture match - simplified scoring
    cultureScore += 8
  } else {
    cultureScore += 4
  }

  if (quiz.support_services_priority) {
    // Support services availability varies by school size/resources
    if (quiz.support_services_priority === 'less_critical') {
      cultureScore += 7
    } else {
      // Favor larger schools with more resources
      if (school.enrollment && school.enrollment > 15000) {
        cultureScore += 7
      } else {
        cultureScore += 5
      }
    }
  } else {
    cultureScore += 3
  }

  score += cultureScore

  return Math.min(score, 100)
}

// Main fit score calculation function
export const calculateFitScore = (school, quizResponses, profile) => {
  if (!profile?.athlete) {
    return null // No profile data
  }

  // If quiz is completed, use the comprehensive 100-point algorithm
  if (quizResponses?.completed_at) {
    return calculateQuizBasedFitScore(school, quizResponses, profile)
  }

  // Fall back to basic scoring, capped at 70 to show it's partial data
  let score = 0

  // Class year match (20 pts) - always give full points for now
  score += 20

  // Academic fit (25 pts)
  if (school.academic_rank && profile.athlete.gpa) {
    if (profile.athlete.gpa >= 3.7 && school.academic_rank <= 50) {
      score += 25 // High GPA matches top 50 schools
    } else if (profile.athlete.gpa >= 3.3 && school.academic_rank <= 100) {
      score += 20 // Good GPA matches top 100
    } else if (profile.athlete.gpa >= 3.0) {
      score += 15 // Decent GPA
    } else {
      score += 10
    }
  } else {
    score += 20 // Default when data missing
  }

  // Region preference (25 pts)
  const userState = profile.athlete?.state || 'WA' // Default to WA for PNW athletes
  const userRegion = getUserRegion(userState)
  if (userRegion === school.region) {
    score += 25 // Perfect region match
  } else if (areAdjacentRegions(userRegion, school.region)) {
    score += 20 // Adjacent region
  } else {
    score += 10 // Different region
  }

  // Cap basic scoring at 70 to indicate incomplete data
  return Math.min(score, 70)
}

// Get fit score badge styling and text
export const getFitScoreBadge = (score, quizCompleted) => {
  if (score === null) {
    return { text: 'Complete Profile', className: 'bg-gray-600 text-gray-300' }
  }

  // Quiz completed scores (0-100)
  if (quizCompleted) {
    if (score >= 85) {
      return { text: 'EXCELLENT FIT', className: 'bg-green-600 text-white' }
    } else if (score >= 70) {
      return { text: 'STRONG FIT', className: 'bg-green-500 text-white' }
    } else if (score >= 55) {
      return { text: 'GOOD FIT', className: 'bg-yellow-600 text-white' }
    } else if (score >= 40) {
      return { text: 'FAIR FIT', className: 'bg-orange-600 text-white' }
    } else {
      return { text: 'STRETCH', className: 'bg-gray-600 text-white' }
    }
  }

  // Basic scores (capped at 70, partial data)
  if (score >= 60) {
    return { text: 'STRONG FIT*', className: 'bg-yellow-600 text-white' }
  } else if (score >= 45) {
    return { text: 'GOOD FIT*', className: 'bg-yellow-500 text-white' }
  } else {
    return { text: 'STRETCH*', className: 'bg-gray-600 text-white' }
  }
}