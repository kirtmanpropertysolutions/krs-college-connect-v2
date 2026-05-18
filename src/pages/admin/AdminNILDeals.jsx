import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/authContext'
import {
  Plus, Tag, DollarSign, Calendar, Sparkles, X,
  Pencil, Trash2, Star, StarOff, CheckCircle2, Clock, AlertCircle
} from 'lucide-react'

const DEAL_TYPES = ['gear', 'camps', 'coaching', 'apparel', 'cash', 'product', 'cash+product', 'other']
const CATEGORIES  = ['Apparel', 'Food & Bev', 'Tech', 'Local biz', 'Camps', 'Services', 'Other']
const CLASS_YEARS = [2025, 2026, 2027, 2028, 2029, 2030, 2031]

const BLANK_FORM = {
  brand:          '',
  logo_abbrev:    '',
  logo_color:     '#1F2937',
  category:       'Apparel',
  deal_type:      'gear',
  value:          '',
  payout_display: '',
  description:    '',
  requirements:   '',
  expiration_date:'',
  applies_to:     'all',
  grad_years:     [],
  status:         'Open',
  featured:       false,
}

export default function AdminNILDeals() {
  const { user } = useAuth()
  const [deals, setDeals]     = useState([])
  const [loading, setLoading] = useState(true)
  const [orgId, setOrgId]     = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm]       = useState(BLANK_FORM)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const loadDeals = useCallback(async () => {
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'eastside-fc-wa')
        .single()

      if (!org) { setLoading(false); return }
      setOrgId(org.id)

      const { data, error: fetchErr } = await supabase
        .from('org_nil_deals')
        .select('*')
        .eq('org_id', org.id)
        .order('created_at', { ascending: false })

      if (fetchErr) throw fetchErr
      setDeals(data || [])
    } catch (err) {
      console.error('Error loading NIL deals:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Sync-with-external-state: load NIL deals from Supabase on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDeals()
  }, [loadDeals])

  // ── Form helpers ───────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null)
    setForm(BLANK_FORM)
    setError('')
    setShowModal(true)
  }

  const openEdit = (deal) => {
    setEditingId(deal.id)
    setForm({
      brand:           deal.brand           || '',
      logo_abbrev:     deal.logo_abbrev     || '',
      logo_color:      deal.logo_color      || '#1F2937',
      category:        deal.category        || 'Apparel',
      deal_type:       deal.deal_type       || 'gear',
      value:           deal.value           != null ? String(deal.value) : '',
      payout_display:  deal.payout_display  || '',
      description:     deal.description     || '',
      requirements:    deal.requirements    || '',
      expiration_date: deal.expiration_date || '',
      applies_to:      deal.applies_to      || 'all',
      grad_years:      deal.grad_years      || [],
      status:          deal.status          || 'Open',
      featured:        deal.featured        || false,
    })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(BLANK_FORM)
    setError('')
  }

  const toggleGradYear = (year) => {
    setForm(f => ({
      ...f,
      grad_years: f.grad_years.includes(year)
        ? f.grad_years.filter(y => y !== year)
        : [...f.grad_years, year]
    }))
  }

  // ── Save ────────────────────────────────────────────────────────
  const saveDeal = async () => {
    if (!form.brand.trim()) { setError('Sponsor name is required.'); return }
    if (!orgId)             { setError('Could not determine organization.'); return }

    setSaving(true)
    setError('')

    const payload = {
      org_id:          orgId,
      created_by:      user.id,
      brand:           form.brand.trim(),
      logo_abbrev:     form.logo_abbrev.trim() || form.brand.slice(0, 4).toUpperCase(),
      logo_color:      form.logo_color,
      category:        form.category,
      deal_type:       form.deal_type,
      value:           form.value !== '' ? parseFloat(form.value) : null,
      payout_display:  form.payout_display.trim() || null,
      description:     form.description.trim()    || null,
      requirements:    form.requirements.trim()   || null,
      expiration_date: form.expiration_date        || null,
      applies_to:      form.applies_to,
      grad_years:      form.applies_to === 'grad_year' ? form.grad_years : null,
      status:          form.status,
      featured:        form.featured,
      updated_at:      new Date().toISOString(),
    }

    try {
      let err
      if (editingId) {
        ;({ error: err } = await supabase
          .from('org_nil_deals')
          .update(payload)
          .eq('id', editingId))
      } else {
        ;({ error: err } = await supabase
          .from('org_nil_deals')
          .insert(payload))
      }
      if (err) throw err

      await loadDeals()
      closeModal()
    } catch (err) {
      console.error('Error saving deal:', err)
      setError(err.message || 'Failed to save deal.')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──────────────────────────────────────────────────────
  const deleteDeal = async (id) => {
    try {
      const { error: err } = await supabase
        .from('org_nil_deals')
        .delete()
        .eq('id', id)
      if (err) throw err
      setDeals(d => d.filter(x => x.id !== id))
    } catch (err) {
      console.error('Error deleting deal:', err)
      alert('Failed to delete: ' + err.message)
    } finally {
      setDeleteConfirm(null)
    }
  }

  // ── Toggle featured ─────────────────────────────────────────────
  const toggleFeatured = async (deal) => {
    const { error: err } = await supabase
      .from('org_nil_deals')
      .update({ featured: !deal.featured, updated_at: new Date().toISOString() })
      .eq('id', deal.id)
    if (!err) setDeals(d => d.map(x => x.id === deal.id ? { ...x, featured: !x.featured } : x))
  }

  // ── Helpers ─────────────────────────────────────────────────────
  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const openCount  = deals.filter(d => d.status === 'Open').length
  const closedCount = deals.filter(d => d.status === 'Closed').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>
              Sponsor Partnerships
            </span>
          </div>
          <h1 className="display-font text-4xl text-white">NIL Deals</h1>
          <p className="text-text-secondary text-sm mt-1">
            Manage sponsor deals visible to your athletes.
          </p>
        </div>
        <button onClick={openCreate} className="eastside-btn inline-flex items-center gap-2">
          <Plus size={14} /> Add NIL Deal
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total deals', value: deals.length,  Icon: Tag },
          { label: 'Open',        value: openCount,     Icon: Sparkles },
          { label: 'Closed',      value: closedCount,   Icon: CheckCircle2 },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="design-card p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} style={{ color: 'var(--crimson-3)' }} />
              <span className="text-[10px] uppercase tracking-widest font-bold text-text-tertiary">{label}</span>
            </div>
            <div className="display-font text-3xl text-white">{loading ? '—' : value}</div>
          </div>
        ))}
      </div>

      {/* Deal list */}
      {loading ? (
        <div className="design-card p-10 text-center text-text-secondary text-sm">Loading deals…</div>
      ) : deals.length === 0 ? (
        <div className="design-card p-14 text-center">
          <Tag size={32} className="mx-auto mb-4 text-text-tertiary" />
          <p className="text-text-secondary text-sm mb-5">No deals yet. Add your first sponsor partnership.</p>
          <button onClick={openCreate} className="eastside-btn inline-flex items-center gap-2">
            <Plus size={14} /> Add NIL Deal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <div
              key={deal.id}
              className="design-card p-5 flex items-start gap-4"
              style={deal.featured ? { borderColor: 'rgba(200,16,46,0.45)' } : undefined}
            >
              {/* Brand avatar */}
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-[11px] flex-shrink-0"
                style={{ background: deal.logo_color || '#1F2937', letterSpacing: '0.05em' }}
              >
                {deal.logo_abbrev || deal.brand.slice(0, 4).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="display-font text-white text-[15px]">{deal.brand}</span>
                      {deal.featured && (
                        <span
                          className="text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(200,16,46,0.18)', color: '#ff6b7a' }}
                        >
                          Featured
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold">
                        {deal.category}
                      </span>
                      {deal.deal_type && (
                        <>
                          <span className="text-text-tertiary">·</span>
                          <span className="text-[10px] text-text-tertiary">{deal.deal_type}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`chip ${deal.status === 'Open' ? 'chip-green' : 'chip-slate'} inline-flex items-center gap-1`}>
                    {deal.status === 'Open' ? <Sparkles size={10} /> : <CheckCircle2 size={10} />}
                    {deal.status}
                  </span>
                </div>

                {deal.description && (
                  <p className="text-sm text-text-secondary mt-2 leading-relaxed line-clamp-2">
                    {deal.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-2 text-sm">
                  {deal.payout_display && (
                    <span className="flex items-center gap-1.5 font-semibold" style={{ color: 'var(--gold)' }}>
                      <DollarSign size={13} /> {deal.payout_display}
                    </span>
                  )}
                  {deal.expiration_date && (
                    <span className="flex items-center gap-1.5 text-text-tertiary">
                      <Calendar size={13} /> {formatDate(deal.expiration_date)}
                    </span>
                  )}
                  <span className="text-text-tertiary text-[11px]">
                    {deal.applies_to === 'all'
                      ? 'All athletes'
                      : deal.applies_to === 'grad_year'
                      ? `Class of ${(deal.grad_years || []).join(', ')}`
                      : 'Specific athletes'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => toggleFeatured(deal)}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-white hover:bg-navy-800 transition-colors"
                  title={deal.featured ? 'Unfeature' : 'Feature'}
                >
                  {deal.featured ? <Star size={14} style={{ color: 'var(--gold)' }} /> : <StarOff size={14} />}
                </button>
                <button
                  onClick={() => openEdit(deal)}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-white hover:bg-navy-800 transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setDeleteConfirm(deal.id)}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-text-tertiary hover:text-red-400 hover:bg-red-950 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
          style={{ background: 'rgba(5,8,18,0.82)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div
            className="design-card w-full max-w-2xl p-7 my-auto"
            style={{ background: 'var(--surface-1, #0d1323)', border: '1px solid var(--card-border)' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="display-font text-2xl text-white">
                  {editingId ? 'Edit NIL Deal' : 'Add NIL Deal'}
                </h2>
                <p className="text-text-tertiary text-sm mt-0.5">
                  {editingId ? 'Update sponsor deal details.' : 'This deal will be visible to your athletes.'}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-white hover:bg-navy-800 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-lg mb-5 text-sm"
                style={{ background: 'rgba(220,38,38,0.1)', borderLeft: '3px solid #dc2626', color: '#fca5a5' }}>
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="space-y-5">

              {/* Sponsor name + logo abbrev */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                    Sponsor Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Nike Soccer NW"
                    value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-eastside-crimson text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                    Logo Abbreviation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NIKE (auto-fills from name)"
                    maxLength={6}
                    value={form.logo_abbrev}
                    onChange={e => setForm(f => ({ ...f, logo_abbrev: e.target.value.toUpperCase() }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-eastside-crimson text-sm"
                  />
                </div>
              </div>

              {/* Category + deal type + logo color */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white focus:outline-none focus:border-eastside-crimson text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                    Deal Type
                  </label>
                  <select
                    value={form.deal_type}
                    onChange={e => setForm(f => ({ ...f, deal_type: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white focus:outline-none focus:border-eastside-crimson text-sm"
                  >
                    {DEAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                    Logo Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.logo_color}
                      onChange={e => setForm(f => ({ ...f, logo_color: e.target.value }))}
                      className="w-10 h-9 rounded cursor-pointer border border-gray-600 bg-navy-800 p-0.5"
                    />
                    <div
                      className="flex-1 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold tracking-wide"
                      style={{ background: form.logo_color }}
                    >
                      {(form.logo_abbrev || form.brand.slice(0, 4)).toUpperCase() || 'LOGO'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payout display + numeric value */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                    Payout (display text)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. $500 – $1,500 or Free membership"
                    value={form.payout_display}
                    onChange={e => setForm(f => ({ ...f, payout_display: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-eastside-crimson text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                    Value (numeric, for sorting)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    min="0"
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-eastside-crimson text-sm"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="What's involved? What will athletes be expected to do?"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-eastside-crimson text-sm resize-vertical"
                />
              </div>

              {/* Eligibility requirements */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                  Eligibility Requirements
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. D1-committed athletes · 2K+ Instagram followers"
                  value={form.requirements}
                  onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                  className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-eastside-crimson text-sm resize-vertical"
                />
              </div>

              {/* Expiration date + Status */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={form.expiration_date}
                    onChange={e => setForm(f => ({ ...f, expiration_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white focus:outline-none focus:border-eastside-crimson text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-navy-800 border border-gray-600 rounded text-white focus:outline-none focus:border-eastside-crimson text-sm"
                  >
                    <option value="Open">Open</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Applies to */}
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-text-tertiary font-bold mb-2">
                  Applies To
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { value: 'all',       label: 'All athletes' },
                    { value: 'grad_year', label: 'Specific graduation years' },
                    { value: 'specific',  label: 'Specific athletes' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, applies_to: opt.value }))}
                      className={`pill ${form.applies_to === opt.value ? 'active' : ''}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {form.applies_to === 'grad_year' && (
                  <div className="flex flex-wrap gap-2">
                    {CLASS_YEARS.map(yr => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => toggleGradYear(yr)}
                        className={`pill ${form.grad_years.includes(yr) ? 'active' : ''}`}
                      >
                        Class of {yr}
                      </button>
                    ))}
                  </div>
                )}

                {form.applies_to === 'specific' && (
                  <p className="text-text-tertiary text-[12px] mt-1">
                    Individual athlete targeting coming soon — for now, contact athletes directly after publishing.
                  </p>
                )}
              </div>

              {/* Featured toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, featured: !f.featured }))}
                  className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                    form.featured ? 'bg-eastside-crimson' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${
                      form.featured ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <div>
                  <div className="text-white text-sm font-medium">Featured deal</div>
                  <div className="text-text-tertiary text-[11px]">Highlighted at the top of the athlete view</div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 mt-7 pt-5 border-t border-card-border">
              <button
                onClick={closeModal}
                className="secondary-btn"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={saveDeal}
                disabled={saving || !form.brand.trim()}
                className="eastside-btn inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? <><Clock size={14} className="animate-spin" /> Saving…</>
                  : <><Plus size={14} /> {editingId ? 'Save Changes' : 'Add Deal'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(5,8,18,0.82)', backdropFilter: 'blur(4px)' }}
        >
          <div className="design-card p-7 w-full max-w-sm" style={{ background: 'var(--surface-1, #0d1323)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ background: 'rgba(220,38,38,0.12)' }}>
              <Trash2 size={20} style={{ color: '#f87171' }} />
            </div>
            <h3 className="display-font text-xl text-white mb-2">Delete this deal?</h3>
            <p className="text-text-secondary text-sm mb-6">
              This will remove the deal from your athletes' NIL Deals view. This action can't be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 secondary-btn"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDeal(deleteConfirm)}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
                style={{ background: '#dc2626' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
