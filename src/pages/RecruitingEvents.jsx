/**
 * RecruitingEvents — athlete-facing ID camp browser.
 *
 * Two sections:
 *   1. "Your director's picks" — curated camps from `id_camps`
 *      (admin-managed via /admin/camps). Each has an Add-to-schedule
 *      button.
 *   2. "My schedule" — camps the athlete has registered for, from
 *      `scheduled_camps`. Past camps shown as "Attended".
 *
 * Adding to the schedule is what awards the first_id_camp_registered
 * milestone. Once camp_date passes, the milestone engine flips it to
 * first_id_camp_attended on the next dashboard load.
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Calendar,
  MapPin,
  DollarSign,
  ExternalLink,
  Star,
  Plus,
  Check,
  Trash2,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useAuth } from '../hooks/authContext'
import { supabase } from '../lib/supabase'
import AthleteLayout from '../components/AthleteLayout.jsx'

export default function RecruitingEvents() {
  const { user, profile } = useAuth()
  const userId = user?.id
  const [curated, setCurated] = useState([])
  const [scheduled, setScheduled] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState('')

  const loadData = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const [curatedRes, schedRes] = await Promise.all([
      supabase
        .from('id_camps')
        .select('*')
        .order('featured', { ascending: false })
        .order('start_date'),
      supabase
        .from('scheduled_camps')
        .select('*')
        .eq('athlete_id', userId)
        .order('camp_date'),
    ])
    setCurated(curatedRes.data || [])
    setScheduled(schedRes.data || [])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    // Sync-with-external-state: load curated + scheduled ID camps from Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (userId) loadData()
  }, [userId, loadData])

  // Track which curated camps the athlete already has on their schedule
  // (by id_camp_id back-reference). Used to flip the "Add" button to
  // "On your schedule" so the user can't double-register.
  const scheduledCampIds = useMemo(
    () => new Set(scheduled.map((s) => s.id_camp_id).filter(Boolean)),
    [scheduled]
  )

  const handleRegister = async (camp) => {
    setBusyId(camp.id)
    try {
      const { error } = await supabase.from('scheduled_camps').insert({
        athlete_id: user.id,
        id_camp_id: camp.id,
        school_name: camp.school_name,
        camp_date: camp.start_date,
        cost: camp.cost,
        registration_url: camp.registration_url,
        notes: camp.name,
      })
      if (error) throw error
      await loadData()
      setToast(`Added "${camp.name}" to your schedule.`)
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      console.error('register camp error:', err)
      setToast(err.message || 'Could not add to schedule.')
      setTimeout(() => setToast(''), 3500)
    } finally {
      setBusyId(null)
    }
  }

  const handleRemove = async (sched) => {
    if (!confirm(`Remove "${sched.notes || sched.school_name}" from your schedule?`)) return
    const { error } = await supabase
      .from('scheduled_camps')
      .delete()
      .eq('id', sched.id)
    if (error) {
      setToast(error.message)
      setTimeout(() => setToast(''), 3000)
      return
    }
    await loadData()
    setToast('Removed.')
    setTimeout(() => setToast(''), 2000)
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <AthleteLayout>
      <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto">
        {/* Editorial header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
          <span
            className="text-[10px] uppercase tracking-[0.22em] font-bold"
            style={{ color: 'var(--crimson)' }}
          >
            Director-curated
          </span>
        </div>
        <h1 className="display-font text-4xl text-white">ID Camps</h1>
        <p className="text-text-secondary text-sm mt-1 mb-6">
          Camps {profile?.organization?.name || 'your club'} recommends.
          Add to your schedule to track, then register on the school's site.
        </p>

        {/* My schedule (only if there's something on it) */}
        {scheduled.length > 0 && (
          <div className="mb-7">
            <h2 className="display-font text-sm tracking-[0.06em] text-white uppercase mb-3">
              Your schedule
            </h2>
            <div className="space-y-2">
              {scheduled.map((s) => {
                const past = s.camp_date && s.camp_date <= today
                return (
                  <div key={s.id} className="design-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {past ? (
                            <span className="chip chip-green inline-flex items-center gap-1">
                              <Check size={11} /> Attended
                            </span>
                          ) : (
                            <span className="chip chip-amber">Registered</span>
                          )}
                        </div>
                        <h3 className="text-white font-semibold text-[14px] leading-tight">
                          {s.notes || s.school_name}
                        </h3>
                        <div className="text-[12px] text-text-secondary mt-1 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={12} />
                            {format(parseISO(s.camp_date), 'MMM d, yyyy')}
                          </span>
                          {s.cost != null && (
                            <span className="inline-flex items-center gap-1">
                              <DollarSign size={12} />
                              {s.cost}
                            </span>
                          )}
                          {s.registration_url && (
                            <a
                              href={s.registration_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                            >
                              <ExternalLink size={12} /> Register on school site
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(s)}
                        className="tap-target text-text-tertiary hover:text-red-500"
                        aria-label="Remove from schedule"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Curated picks */}
        <h2 className="display-font text-sm tracking-[0.06em] text-white uppercase mb-3">
          Director's picks
        </h2>

        {loading ? (
          <div className="design-card p-8 text-center text-text-secondary">Loading camps…</div>
        ) : curated.length === 0 ? (
          <div className="design-card p-10 text-center">
            <Calendar className="mx-auto mb-3 text-text-tertiary" size={28} />
            <p className="text-text-secondary text-sm">
              No camps yet. Your director will add curated picks here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {curated.map((c) => {
              const onSchedule = scheduledCampIds.has(c.id)
              return (
                <div
                  key={c.id}
                  className="design-card p-5"
                  style={c.featured ? { borderColor: 'rgba(200,16,46,0.45)' } : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {c.featured && (
                          <span className="chip chip-crimson inline-flex items-center gap-1">
                            <Star size={11} /> Featured
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold">
                          {c.school_name}
                        </span>
                      </div>
                      <h3 className="display-font text-lg text-white leading-tight">{c.name}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px] text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={12} />
                          {format(parseISO(c.start_date), 'MMM d, yyyy')}
                          {c.end_date && ` – ${format(parseISO(c.end_date), 'MMM d')}`}
                        </span>
                        {c.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} />
                            {c.location}
                          </span>
                        )}
                        {c.cost != null && (
                          <span className="inline-flex items-center gap-1">
                            <DollarSign size={12} />
                            {c.cost}
                          </span>
                        )}
                      </div>
                      {c.description && (
                        <p className="text-[13px] text-text-secondary mt-3 leading-relaxed">
                          {c.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {onSchedule ? (
                        <span className="chip chip-green inline-flex items-center gap-1">
                          <Check size={11} /> On schedule
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRegister(c)}
                          disabled={busyId === c.id}
                          className="eastside-btn inline-flex items-center gap-1 disabled:opacity-50"
                          style={{ padding: '7px 12px', fontSize: '12px' }}
                        >
                          <Plus size={12} />
                          {busyId === c.id ? 'Adding…' : 'Add'}
                        </button>
                      )}
                      {c.registration_url && (
                        <a
                          href={c.registration_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-red-400 hover:text-red-300 inline-flex items-center gap-1 justify-center"
                        >
                          <ExternalLink size={11} /> Register
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 design-card px-4 py-3 text-sm text-white shadow-2xl animate-slide-up-soft">
          {toast}
        </div>
      )}
    </AthleteLayout>
  )
}
