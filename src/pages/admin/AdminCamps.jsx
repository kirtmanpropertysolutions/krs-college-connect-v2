/**
 * AdminCamps — director-curated ID camp catalog.
 *
 * Directors manage the camps they want to recommend to their club's
 * athletes. Add a camp here → it shows up on every athlete's
 * /recruiting-events page with a "Register" button. Athletes still
 * decide individually whether to register.
 */

import { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Calendar,
  MapPin,
  DollarSign,
  ExternalLink,
  Edit2,
  Trash2,
  X,
  Star,
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../../hooks/authContext'
import { supabase } from '../../lib/supabase'

const EMPTY_CAMP = {
  name: '',
  school_name: '',
  start_date: '',
  end_date: '',
  location: '',
  cost: '',
  registration_url: '',
  description: '',
  featured: false,
}

export default function AdminCamps() {
  const { user, profile } = useAuth()
  const orgId = profile?.org_id
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | EMPTY_CAMP | existing row
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const loadCamps = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('id_camps')
      .select('*')
      .eq('org_id', orgId)
      .order('start_date')
    if (error) {
      console.error('loadCamps error:', error)
    }
    setCamps(data || [])
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    // Sync-with-external-state: pull the org's camp catalog from Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (orgId) loadCamps()
  }, [orgId, loadCamps])

  const handleSave = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const payload = {
        org_id: profile.org_id,
        school_name: editing.school_name?.trim(),
        name: editing.name?.trim(),
        start_date: editing.start_date,
        end_date: editing.end_date || null,
        location: editing.location?.trim() || null,
        cost: editing.cost ? parseInt(editing.cost, 10) : null,
        registration_url: editing.registration_url?.trim() || null,
        description: editing.description?.trim() || null,
        featured: !!editing.featured,
        updated_at: new Date().toISOString(),
      }
      if (!payload.name || !payload.school_name || !payload.start_date) {
        setToast('Name, school, and start date are required.')
        setTimeout(() => setToast(''), 3000)
        return
      }
      if (editing.id) {
        const { error } = await supabase
          .from('id_camps')
          .update(payload)
          .eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('id_camps')
          .insert({ ...payload, created_by: user?.id })
        if (error) throw error
      }
      setEditing(null)
      await loadCamps()
      setToast(editing.id ? 'Camp updated.' : 'Camp added.')
      setTimeout(() => setToast(''), 2500)
    } catch (err) {
      console.error('save camp error:', err)
      setToast(err.message || 'Could not save camp.')
      setTimeout(() => setToast(''), 4000)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (camp) => {
    if (!confirm(`Remove "${camp.name}" from your club's camp list?`)) return
    const { error } = await supabase.from('id_camps').delete().eq('id', camp.id)
    if (error) {
      setToast(error.message)
      setTimeout(() => setToast(''), 3000)
      return
    }
    await loadCamps()
    setToast('Camp removed.')
    setTimeout(() => setToast(''), 2500)
  }

  return (
    <div className="space-y-6">
      {/* Editorial header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
          <span
            className="text-[10px] uppercase tracking-[0.22em] font-bold"
            style={{ color: 'var(--crimson)' }}
          >
            Curated camp list
          </span>
        </div>
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="display-font text-4xl text-white">ID Camps</h1>
            <p className="text-text-secondary text-sm mt-1">
              The camps you recommend to your athletes. They see this list under Recruiting Events.
            </p>
          </div>
          <button
            onClick={() => setEditing({ ...EMPTY_CAMP })}
            className="eastside-btn inline-flex items-center gap-2"
          >
            <Plus size={14} /> Add camp
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="design-card p-8 text-center text-text-secondary">Loading camps…</div>
      ) : camps.length === 0 ? (
        <div className="design-card p-12 text-center">
          <Calendar className="mx-auto mb-3 text-text-tertiary" size={32} />
          <p className="text-text-secondary text-sm mb-4">No camps yet.</p>
          <button
            onClick={() => setEditing({ ...EMPTY_CAMP })}
            className="eastside-btn inline-flex items-center gap-2"
          >
            <Plus size={14} /> Add your first camp
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {camps.map((c) => (
            <div
              key={c.id}
              className="design-card p-5"
              style={c.featured ? { borderColor: 'rgba(200,16,46,0.45)' } : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {c.featured && (
                      <span className="chip chip-crimson inline-flex items-center gap-1">
                        <Star size={11} /> Featured
                      </span>
                    )}
                    <span className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold">
                      {c.school_name}
                    </span>
                  </div>
                  <h3 className="display-font text-xl text-white leading-tight">{c.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px] text-text-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} />
                      {format(new Date(c.start_date + 'T00:00:00'), 'MMM d, yyyy')}
                      {c.end_date && ` – ${format(new Date(c.end_date + 'T00:00:00'), 'MMM d')}`}
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
                    {c.registration_url && (
                      <a
                        href={c.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"
                      >
                        <ExternalLink size={12} /> Registration link
                      </a>
                    )}
                  </div>
                  {c.description && (
                    <p className="text-[13px] text-text-secondary mt-3 leading-relaxed">
                      {c.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditing(c)}
                    className="tap-target text-text-tertiary hover:text-white"
                    aria-label="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="tap-target text-text-tertiary hover:text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 p-4 animate-fadeIn"
          onClick={() => !saving && setEditing(null)}
        >
          <div
            className="design-card max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-slide-up-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="display-font text-xl text-white">
                {editing.id ? 'Edit camp' : 'Add a camp'}
              </h3>
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="text-text-tertiary hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="form-label">Camp name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="form-input w-full"
                  placeholder="Stanford ID Camp"
                />
              </div>

              <div>
                <label className="form-label">School / host</label>
                <input
                  type="text"
                  value={editing.school_name}
                  onChange={(e) => setEditing({ ...editing, school_name: e.target.value })}
                  className="form-input w-full"
                  placeholder="Stanford University"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Start date</label>
                  <input
                    type="date"
                    value={editing.start_date}
                    onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
                <div>
                  <label className="form-label">End date (optional)</label>
                  <input
                    type="date"
                    value={editing.end_date}
                    onChange={(e) => setEditing({ ...editing, end_date: e.target.value })}
                    className="form-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    value={editing.location}
                    onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                    className="form-input w-full"
                    placeholder="Stanford, CA"
                  />
                </div>
                <div>
                  <label className="form-label">Cost ($)</label>
                  <input
                    type="number"
                    value={editing.cost}
                    onChange={(e) => setEditing({ ...editing, cost: e.target.value })}
                    className="form-input w-full"
                    placeholder="475"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Registration URL</label>
                <input
                  type="url"
                  value={editing.registration_url}
                  onChange={(e) => setEditing({ ...editing, registration_url: e.target.value })}
                  className="form-input w-full"
                  placeholder="https://stanfordcamps.com/..."
                />
              </div>

              <div>
                <label className="form-label">Notes (optional)</label>
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="form-input w-full min-h-[80px]"
                  placeholder="Why this camp matters for your athletes."
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.featured}
                  onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                  className="w-4 h-4"
                />
                Feature this camp (shows up first on athlete page)
              </label>
            </div>

            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="secondary-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="eastside-btn disabled:opacity-50"
              >
                {saving ? 'Saving…' : editing.id ? 'Save changes' : 'Add camp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 design-card px-4 py-3 text-sm text-white shadow-2xl animate-slide-up-soft">
          {toast}
        </div>
      )}
    </div>
  )
}
