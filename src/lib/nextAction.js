export function getNextAction({ profile, pipelineCount, quizCompleted, recentEmailsSent, openedEmails, visitingSchools }) {
  const profileComplete = profile && profile.full_name && profile.graduation_year && profile.position && profile.gpa

  // Priority order — first match wins
  if (!profileComplete) {
    return {
      title: 'Finish your profile to unlock recommendations',
      cta: 'Complete profile',
      href: '/profile'
    }
  }
  if (!quizCompleted) {
    return {
      title: 'Take the 2-minute School Fit Quiz',
      cta: 'Start quiz',
      href: '/school-fit-quiz'
    }
  }
  if (pipelineCount === 0) {
    return {
      title: 'Pick 5 schools that interest you',
      cta: 'Find schools',
      href: '/coach-finder'
    }
  }
  if (recentEmailsSent === 0) {
    return {
      title: 'Send your first outreach email',
      cta: 'Write to coaches',
      href: '/outreach'
    }
  }
  if (openedEmails && openedEmails.length > 0) {
    const e = openedEmails[0]
    return {
      title: `Coach ${e.coach_name} at ${e.school_name} opened your email — follow up now`,
      cta: 'Send follow-up',
      href: `/outreach?coach_id=${e.coach_id}`
    }
  }
  if (visitingSchools && visitingSchools.length > 0) {
    const s = visitingSchools[0]
    return {
      title: `Schedule your visit to ${s.school_name}`,
      cta: 'Plan visit',
      href: '/my-schools'
    }
  }
  return {
    title: 'Add 1 new school to your list today',
    cta: 'Find schools',
    href: '/coach-finder'
  }
}