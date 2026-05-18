import { X, Mail, MapPin, Phone, ExternalLink } from 'lucide-react'

export default function CoachPopover({ coach, school, onClose, onEmailCoach }) {
  if (!coach) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-surface-card border border-border-default rounded-2xl max-w-md w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-fg-primary">{coach.full_name || coach.name}</h3>
            <p className="text-sm text-text-secondary">{coach.title || 'Coach'} · {school.name || school.school}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-surface-card-hover hover:bg-surface-page flex items-center justify-center">
            <X className="w-4 h-4 text-text-tertiary"/>
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {coach.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-text-tertiary"/>
              <span className="text-text-secondary">{coach.email}</span>
              <span className="ml-auto text-xs text-green-500">✓ Verified</span>
            </div>
          )}
          {coach.recruiting_region && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-text-tertiary"/>
              <span className="text-text-secondary">Recruits: {coach.recruiting_region}</span>
            </div>
          )}
          {coach.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-text-tertiary"/>
              <span className="text-text-secondary">{coach.phone}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEmailCoach(coach)}
            className="flex-1 px-4 py-3 bg-club-primary hover:bg-club-primary-dark text-white font-semibold rounded-lg"
          >
            EMAIL COACH
          </button>
          {coach.bio_url && (
            <a
              href={coach.bio_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 border border-border-default hover:border-club-primary text-fg-primary font-semibold rounded-lg flex items-center gap-1"
            >
              VIEW PROFILE <ExternalLink className="w-4 h-4"/>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
