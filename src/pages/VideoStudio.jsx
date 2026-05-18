/**
 * VideoStudio.jsx — Mux-powered video studio for athletes
 *
 * Tabs:
 *   1. Video Studio — upload, manage clips, build highlight reel
 *   2. Recruiting Card — SVG/PNG recruiting card generator (unchanged)
 *
 * Requires:
 *   npm install @mux/mux-player-react @mux/mux-uploader-react
 *   Supabase Edge Function deployed: supabase/functions/mux-upload/index.ts
 *   highlight_videos table (migration 034)
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/authContext'
import AthleteLayout from '../components/AthleteLayout.jsx'
import { supabase } from '../lib/supabase'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Film,
  Download,
  Upload,
  Play,
  Scissors,
  GripVertical,
  Trash2,
  Copy,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Save,
  User,
  Hash,
  Shield,
  ChevronRight,
  Share2,
  Film as YoutubeIcon,  // lucide-react in this version doesn't export Youtube
} from 'lucide-react'

/* ============================================================
   Constants
   ============================================================ */

const MUX_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mux-upload`
const POLL_INTERVAL_MS = 3000

/* ============================================================
   Helpers
   ============================================================ */

function fmtDuration(secs) {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function statusColor(status) {
  if (status === 'ready') return 'var(--crimson-3)'
  if (status === 'processing') return '#f59e0b'
  if (status === 'errored') return '#ef4444'
  return '#64748b'
}

function statusLabel(status) {
  if (status === 'ready') return 'Ready'
  if (status === 'processing') return 'Processing…'
  if (status === 'errored') return 'Error'
  return 'Uploading…'
}

/* ============================================================
   Sub-components
   ============================================================ */

/** Single sortable row in the Reel Builder */
function SortableClipRow({ clip, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: clip.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 rounded-lg border border-card-border bg-navy-900"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 rounded text-text-tertiary hover:text-white cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>

      {/* Order number */}
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center display-font text-sm text-white flex-shrink-0"
        style={{ background: 'rgba(200,16,46,0.15)' }}
      >
        {String(index + 1).padStart(2, '0')}
      </div>

      {/* Thumbnail preview */}
      <div
        className="w-14 h-9 rounded flex items-center justify-center flex-shrink-0 overflow-hidden border border-card-border"
        style={{ background: '#0a0e1a' }}
      >
        {clip.mux_playback_id ? (
          <img
            src={`https://image.mux.com/${clip.mux_playback_id}/thumbnail.jpg?width=56&height=36&fit_mode=smartcrop&time=${clip.start_time || 1}`}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <Film size={14} className="text-text-tertiary" />
        )}
      </div>

      {/* Title + duration */}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white truncate">{clip.title}</div>
        <div className="text-[11px] text-text-tertiary mt-0.5">
          {fmtDuration(clip.duration)}
          {clip.start_time > 0 || clip.end_time
            ? ` · trim ${fmtDuration(clip.start_time)}–${clip.end_time ? fmtDuration(clip.end_time) : 'end'}`
            : ''}
        </div>
      </div>

      {/* Download */}
      {clip.mux_playback_id && (
        <ClipDownloadMenu clip={clip} />
      )}

      {/* Remove */}
      <button
        onClick={() => onRemove(clip.id)}
        className="p-1.5 rounded hover:bg-navy-800 text-text-tertiary hover:text-red-400"
        title="Remove from reel"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

/** Trim + overlay metadata modal */
function ClipEditModal({ clip, onSave, onClose }) {
  const [startTime, setStartTime] = useState(String(clip.start_time ?? 0))
  const [endTime, setEndTime] = useState(String(clip.end_time ?? ''))
  const [overlayName, setOverlayName] = useState(clip.overlay_name ?? '')
  const [overlayPosition, setOverlayPosition] = useState(clip.overlay_position ?? '')
  const [overlayJersey, setOverlayJersey] = useState(clip.overlay_jersey ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(clip.id, {
      start_time: parseFloat(startTime) || 0,
      end_time: endTime ? parseFloat(endTime) : null,
      overlay_name: overlayName.trim() || null,
      overlay_position: overlayPosition.trim() || null,
      overlay_jersey: overlayJersey.trim() || null,
    })
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="design-card w-full max-w-lg p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded hover:bg-navy-800 text-text-tertiary hover:text-white">
          <X size={16} />
        </button>

        <h3 className="display-font text-lg text-white mb-1">{clip.title}</h3>
        <p className="text-[11px] text-text-tertiary uppercase tracking-widest mb-5">Trim & overlay settings</p>

        {/* Mux player preview */}
        {clip.mux_playback_id && (
          <div className="rounded-lg overflow-hidden mb-5 relative border border-card-border">
            {/* CSS overlay preview */}
            {(overlayName || overlayPosition || overlayJersey) && (
              <div className="absolute bottom-0 left-0 right-0 z-10 px-3 py-2 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}>
                <div className="text-white font-bold text-sm leading-tight">
                  {overlayName || clip.overlay_name || ''}
                  {(overlayJersey || clip.overlay_jersey) &&
                    <span className="ml-1 opacity-70">#{overlayJersey || clip.overlay_jersey}</span>}
                </div>
                {(overlayPosition || clip.overlay_position) && (
                  <div className="text-[11px] text-white/70 uppercase tracking-widest">
                    {overlayPosition || clip.overlay_position}
                  </div>
                )}
              </div>
            )}
            {/* We import MuxPlayer dynamically to avoid breaking if not yet installed */}
            <MuxPlayerEmbed
              playbackId={clip.mux_playback_id}
              startTime={parseFloat(startTime) || 0}
            />
          </div>
        )}

        {/* Trim controls */}
        <div className="mb-5">
          <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold mb-3 flex items-center gap-2">
            <Scissors size={11} /> Trim clip
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-text-tertiary mb-1">Start time (seconds)</label>
              <input
                type="number"
                min="0"
                max={clip.duration || undefined}
                step="0.1"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="form-input w-full text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-tertiary mb-1">End time (seconds, blank = play to end)</label>
              <input
                type="number"
                min="0"
                max={clip.duration || undefined}
                step="0.1"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="form-input w-full text-sm"
                placeholder={clip.duration ? String(Math.floor(clip.duration)) : ''}
              />
            </div>
          </div>
          {clip.duration && (
            <div className="text-[11px] text-text-tertiary mt-1.5">
              Full duration: {fmtDuration(clip.duration)}
            </div>
          )}
        </div>

        {/* Overlay metadata */}
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold mb-3 flex items-center gap-2">
            <User size={11} /> Overlay (shown on player)
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-3 mb-2">
            <div>
              <label className="block text-[10px] text-text-tertiary mb-1">Athlete name</label>
              <input
                type="text"
                value={overlayName}
                onChange={e => setOverlayName(e.target.value)}
                className="form-input w-full text-sm"
                placeholder="Sofia Kirtman"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-tertiary mb-1">Jersey #</label>
              <input
                type="text"
                value={overlayJersey}
                onChange={e => setOverlayJersey(e.target.value)}
                className="form-input w-full text-sm"
                placeholder="9"
                style={{ width: '72px' }}
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-text-tertiary mb-1">Position</label>
            <input
              type="text"
              value={overlayPosition}
              onChange={e => setOverlayPosition(e.target.value)}
              className="form-input w-full text-sm"
              placeholder="Forward"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className="eastside-btn inline-flex items-center gap-2 flex-1 justify-center">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save changes
          </button>
          <button onClick={onClose} className="secondary-btn px-4">Cancel</button>
        </div>
      </div>
    </div>
  )
}

/** Download dropdown — two format options for each clip */
function ClipDownloadMenu({ clip }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!clip.mux_playback_id) return null

  const mp4Url = `https://stream.mux.com/${clip.mux_playback_id}/medium.mp4`
  const filename = (clip.title || 'clip').replace(/[^a-z0-9]/gi, '-').toLowerCase()

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="p-1 rounded hover:bg-navy-800 text-text-tertiary hover:text-white"
        title="Download clip"
      >
        <Download size={12} />
      </button>
      {open && (
        <div
          className="absolute right-0 bottom-full mb-1.5 z-30 rounded-lg shadow-xl overflow-hidden"
          style={{ minWidth: '240px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-text-tertiary font-bold"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            Download format
          </div>
          <a
            href={mp4Url}
            download={`${filename}-tiktok.mp4`}
            onClick={() => setOpen(false)}
            className="flex flex-col px-3 py-2.5 hover:bg-navy-800 transition no-underline"
          >
            <span className="text-sm text-white font-medium">TikTok / Instagram</span>
            <span className="text-[10px] text-text-tertiary mt-0.5">Crop to 9:16 in CapCut or Instagram's editor</span>
          </a>
          <a
            href={mp4Url}
            download={`${filename}-landscape.mp4`}
            onClick={() => setOpen(false)}
            className="flex flex-col px-3 py-2.5 hover:bg-navy-800 transition no-underline"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span className="text-sm text-white font-medium">YouTube / Twitter</span>
            <span className="text-[10px] text-text-tertiary mt-0.5">Standard 16:9 landscape</span>
          </a>
        </div>
      )}
    </div>
  )
}

/** Load the Mux player web component via CDN — no npm install needed */
function useMuxPlayerCDN() {
  useEffect(() => {
    const id = 'mux-player-cdn'
    if (document.getElementById(id)) return
    const script = document.createElement('script')
    script.id = id
    script.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player'
    script.type = 'module'
    document.head.appendChild(script)
  }, [])
}

/** Mux player — renders the official `<mux-player>` web component loaded
 *  from the Mux CDN in useMuxPlayerCDN. We previously tried to
 *  conditionally `require('@mux/mux-player-react')` and fall back to
 *  the web component on import error, but `require` doesn't exist in
 *  Vite's ESM browser bundle, so the React-package branch never ran in
 *  practice. The CDN web component IS the production path. */
function MuxPlayerEmbed({ playbackId, startTime = 0, style = {} }) {
  useMuxPlayerCDN()

  return (
    <div style={{ aspectRatio: '16/9', ...style }}>
      <mux-player
        playback-id={playbackId}
        start-time={String(startTime)}
        style={{ width: '100%', height: '100%' }}
        preload="metadata"
      />
    </div>
  )
}

/** Single clip card in the library */
function ClipCard({ clip, onEdit, onDelete, onAddToReel, inReel }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="rounded-lg overflow-hidden border border-card-border transition hover:border-slate-600 flex flex-col"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail / player area */}
      <div className="aspect-video relative overflow-hidden" style={{ background: '#0a0e1a' }}>
        {clip.mux_playback_id ? (
          <>
            <img
              src={`https://image.mux.com/${clip.mux_playback_id}/thumbnail.jpg?width=480&height=270&fit_mode=smartcrop&time=${clip.start_time || 1}`}
              alt={clip.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.target.style.display = 'none' }}
            />
            {/* Overlay preview on hover */}
            {(clip.overlay_name || clip.overlay_position) && hovered && (
              <div
                className="absolute bottom-0 left-0 right-0 px-2.5 py-2 pointer-events-none"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}
              >
                <div className="text-white font-semibold text-xs leading-tight">
                  {clip.overlay_name}{clip.overlay_jersey ? ` #${clip.overlay_jersey}` : ''}
                </div>
                {clip.overlay_position && (
                  <div className="text-[10px] text-white/70 uppercase tracking-widest">{clip.overlay_position}</div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
            {(clip.status === 'uploading' || clip.status === 'processing') ? (
              <>
                <Loader2 size={20} className="animate-spin text-text-tertiary" />
                <span className="text-[11px] text-text-tertiary">{statusLabel(clip.status)}</span>
              </>
            ) : clip.status === 'errored' ? (
              <>
                <AlertCircle size={20} className="text-red-400" />
                <span className="text-[11px] text-red-400">Upload failed</span>
              </>
            ) : (
              <Film size={20} className="text-text-tertiary" />
            )}
          </div>
        )}

        {/* Status badge */}
        <div
          className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
          style={{ background: 'rgba(0,0,0,0.65)', color: statusColor(clip.status) }}
        >
          {clip.status === 'ready' && <CheckCircle2 size={9} />}
          {(clip.status === 'uploading' || clip.status === 'processing') && <Loader2 size={9} className="animate-spin" />}
          {clip.status === 'errored' && <AlertCircle size={9} />}
          {statusLabel(clip.status)}
        </div>

        {/* Duration badge */}
        {clip.duration && (
          <div className="absolute bottom-2 right-2 text-[10px] text-white/80 bg-black/50 px-1.5 py-0.5 rounded">
            {fmtDuration(clip.duration)}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="p-3 bg-navy-900 flex-1 flex flex-col gap-2">
        <div className="text-sm font-medium text-white truncate">{clip.title}</div>

        <div className="flex items-center gap-2 mt-auto">
          {clip.status === 'ready' && (
            <>
              <button
                onClick={() => onEdit(clip)}
                className="text-[11px] text-text-tertiary hover:text-white flex items-center gap-1 flex-1"
              >
                <Scissors size={10} /> Trim / overlay
              </button>
              <button
                onClick={() => onAddToReel(clip.id)}
                disabled={inReel}
                className={`text-[11px] font-semibold flex items-center gap-1 ${inReel ? 'text-text-tertiary cursor-not-allowed' : 'hover:text-white'}`}
                style={{ color: inReel ? undefined : 'var(--crimson-3)' }}
              >
                {inReel ? '✓ In reel' : '+ Reel'}
              </button>
            </>
          )}
          {clip.status === 'ready' && clip.mux_playback_id && (
            <ClipDownloadMenu clip={clip} />
          )}
          <button
            onClick={() => onDelete(clip.id)}
            className="p-1 rounded hover:bg-navy-800 text-text-tertiary hover:text-red-400 ml-auto"
            title="Delete clip"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Coming Soon screen — shown when the MUX upload pipeline isn't
   wired up yet. Editorial polish to match the rest of the app
   (Oswald display, Manrope body, crimson accent, subtle gradient
   crest). NOT a generic "Under construction" message.
   ============================================================ */
function VideoStudioComingSoon() {
  return (
    <AthleteLayout>
      <div className="px-4 py-8 md:px-8 md:py-12">
        {/* Editorial eyebrow */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px w-12 bg-red-600" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-red-600 font-semibold">
            Video Studio
          </span>
        </div>

        {/* Hero card */}
        <div className="hero-card crimson-glow-bg p-8 md:p-12 max-w-3xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-red-600/15 border border-red-600/30 flex items-center justify-center flex-shrink-0">
              <Film className="text-red-500" size={26} strokeWidth={2} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="chip chip-amber">Coming Soon</span>
              </div>
              <h1 className="display-font text-4xl md:text-5xl text-white leading-none">
                Highlight Reels
              </h1>
            </div>
          </div>

          <p className="text-gray-300 text-base md:text-lg leading-relaxed mb-6">
            Upload game footage directly from your phone, trim the moments
            that matter, and build a recruiting reel college coaches can
            stream from anywhere — all without leaving the app.
          </p>

          {/* What's coming */}
          <div className="space-y-3 mb-8">
            <FeatureRow
              icon={<Upload size={16} strokeWidth={2.2} />}
              title="One-tap upload from camera roll"
              detail="Drop in a full game or a quick highlight — we handle the encoding."
            />
            <FeatureRow
              icon={<Scissors size={16} strokeWidth={2.2} />}
              title="Trim each clip inline"
              detail="Mark the in/out for the moment that shows your best touch."
            />
            <FeatureRow
              icon={<Sparkles size={16} strokeWidth={2.2} />}
              title="Reorder into a recruiting reel"
              detail="Drag clips into the order that tells the right story."
            />
            <FeatureRow
              icon={<Play size={16} strokeWidth={2.2} />}
              title="Share a single streamable link"
              detail="One URL coaches can open on any device — no downloads, no logins."
            />
          </div>

          {/* CTA — direct people to outreach in the meantime */}
          <div className="border-t border-gray-800 pt-6">
            <p className="text-sm text-gray-400 mb-3">
              In the meantime, you can still add YouTube or external video
              links — they'll show up on your public recruiting profile.
            </p>
            <a
              href="/highlights"
              className="eastside-btn inline-flex items-center gap-2"
            >
              Add a video link
            </a>
          </div>
        </div>

        {/* Quiet note for admins / testers */}
        <p className="text-[11px] text-gray-600 mt-6 max-w-3xl">
          Admin note: append <code className="text-gray-500">?preview=1</code>
          {' '}to the URL to preview the upload flow before launch.
        </p>
      </div>
    </AthleteLayout>
  )
}

/**
 * Single feature row inside the coming-soon hero card. Icon in a
 * crimson-tinted square, headline + one-line detail beside it.
 */
function FeatureRow({ icon, title, detail }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-600/20 text-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <div className="text-white text-sm font-semibold">{title}</div>
        <div className="text-gray-400 text-sm leading-snug">{detail}</div>
      </div>
    </div>
  )
}

/* ============================================================
   Main VideoStudio component
   ============================================================ */

// ── Coming-soon gate ────────────────────────────────────────────────
// Flip to `true` once MUX env vars (MUX_TOKEN_ID, MUX_TOKEN_SECRET,
// VITE_MUX_ENV_KEY) are added to Vercel and the upload flow tests
// clean. Until then, athletes see a polished "Coming Soon" screen
// instead of a half-working uploader. Admin/preview access is still
// available via `?preview=1` in the URL so Chanyn can test with her
// daughter without flipping the flag for everyone.
const VIDEO_STUDIO_ENABLED = false

// The route component is split into an outer gate + inner studio so the
// 20+ hooks inside the studio are only ever called when the feature is
// on. Putting the early `return <VideoStudioComingSoon />` above the
// hooks would violate rules-of-hooks; below them would mean every
// gated user still pays the cost of the upload state setup. An inner
// component is the React-idiomatic split.
export default function VideoStudio() {
  // Preview bypass — anyone with `?preview=1` in the URL bypasses
  // the gate. Useful for testing the upload flow with one athlete
  // before opening it up to the whole roster.
  const previewBypass =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('preview') === '1'

  if (!VIDEO_STUDIO_ENABLED && !previewBypass) {
    return <VideoStudioComingSoon />
  }
  return <VideoStudioInner />
}

function VideoStudioInner() {
  const { user, profile } = useAuth()
  const userId = user?.id

  // ── Profile data for the recruiting card ────────────────────────────
  const athlete = profile?.athlete || {}
  const orgName = profile?.organization?.name || 'Eastside FC'
  const fullName = profile?.full_name || user?.email?.split('@')[0] || 'Athlete Name'
  const position = athlete.position || 'Forward'
  const gradYear = athlete.class_year || '2027'
  const jersey = athlete.jersey_number || '9'
  const gpa = athlete.gpa || '3.85'
  const heightCm = athlete.height_cm
  const heightStr = heightCm
    ? `${Math.floor(heightCm / 2.54 / 12)}'${Math.round((heightCm / 2.54) % 12)}"`
    : `5'6"`
  const foot = athlete.dominant_foot || 'R'

  // ── UI state ─────────────────────────────────────────────────────────
  const [mainTab, setMainTab] = useState('studio')  // 'studio' | 'card'
  const [studioTab, setStudioTab] = useState('upload')  // 'upload' | 'library' | 'reel'
  const [toast, setToast] = useState('')
  const [clips, setClips] = useState([])
  const [loadingClips, setLoadingClips] = useState(true)
  const [reelOrder, setReelOrder] = useState([])
  const [editingClip, setEditingClip] = useState(null)
  const [savingReel, setSavingReel] = useState(false)

  // Upload state
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadState, setUploadState] = useState('idle')  // idle | fetching | uploading | polling | done | error
  const [uploadProgress, setUploadProgress] = useState(0)
  // Setter-only — used by the upload poll loop to track in-flight Mux jobs.
  // We don't render anything off the value (UI consumes uploadState instead),
  // so the value side of the tuple is discarded.
  const [, setPendingUpload] = useState(null)  // { upload_id, db_id }
  const pollingRef = useRef(null)

  // Recruiting card state
  const [card, setCard] = useState({
    name: fullName,
    position,
    grad: String(gradYear),
    jersey: String(jersey),
    height: heightStr,
    foot,
    gpa: String(gpa),
    goals: '21',
    assists: '11',
    games: '24',
    school1: 'Stanford',
    school2: 'UCLA',
    school3: 'Portland',
    reelUrl: `krs.app/p/${user?.id?.slice(0, 8) || 'demo'}`,
  })
  const cardRef = useRef(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2400)
  }, [])

  // ── Load clips from Supabase ─────────────────────────────────────────
  const loadClips = useCallback(async () => {
    if (!userId) return
    setLoadingClips(true)
    const { data, error } = await supabase
      .from('highlight_videos')
      .select('*')
      .eq('athlete_id', userId)
      .order('reel_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!error && data) {
      setClips(data)
      // Derive reel order from DB
      const reelIds = data
        .filter(c => c.reel_order != null && c.reel_order > 0)
        .sort((a, b) => a.reel_order - b.reel_order)
        .map(c => c.id)
      setReelOrder(reelIds)
    }
    setLoadingClips(false)
  }, [userId])

  useEffect(() => {
    // Sync-with-external-state: load clips/reel from Supabase.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadClips()
  }, [loadClips])

  // ── Upload flow ──────────────────────────────────────────────────────
  const startUpload = async (file) => {
    if (!file) return
    setUploadState('fetching')
    setUploadProgress(0)

    try {
      // 1. Get session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      // 2. Create Mux upload via edge function
      const res = await fetch(MUX_FUNCTION_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: uploadTitle.trim() || file.name.replace(/\.[^.]+$/, '') }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${res.status}`)
      }

      const { upload_url, upload_id, db_id } = await res.json()
      setPendingUpload({ upload_id, db_id })
      setUploadState('uploading')

      // 3. Upload file directly to Mux via XMLHttpRequest (for progress)
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: HTTP ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Upload network error'))
        xhr.open('PUT', upload_url)
        xhr.send(file)
      })

      setUploadProgress(100)
      setUploadState('polling')
      showToast('Upload complete — Mux is processing your clip…')
      startPolling(upload_id, db_id)

    } catch (err) {
      console.error('Upload error:', err)
      setUploadState('error')
      showToast(`Upload failed: ${err.message}`)
    }
  }

  const startPolling = useCallback((uploadId, dbId) => {
    if (pollingRef.current) clearInterval(pollingRef.current)

    pollingRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch(`${MUX_FUNCTION_URL}?upload_id=${uploadId}&db_id=${dbId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) return

        const result = await res.json()

        if (result.status === 'ready') {
          clearInterval(pollingRef.current)
          pollingRef.current = null
          setUploadState('done')
          setPendingUpload(null)
          setUploadTitle('')
          showToast('Clip is ready! Switch to My Clips to view it.')
          await loadClips()
          // Auto-switch to library tab
          setStudioTab('library')
        }
      } catch (e) {
        console.error('Polling error:', e)
      }
    }, POLL_INTERVAL_MS)
  }, [loadClips, showToast])

  // Clean up polling on unmount
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current) }, [])

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) startUpload(file)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('video/')) startUpload(file)
  }

  // ── Clip management ──────────────────────────────────────────────────
  const handleDeleteClip = async (clipId) => {
    if (!confirm('Delete this clip? This cannot be undone.')) return
    const { error } = await supabase
      .from('highlight_videos')
      .delete()
      .eq('id', clipId)
      .eq('athlete_id', user.id)
    if (error) { showToast('Delete failed.'); return }
    setClips(prev => prev.filter(c => c.id !== clipId))
    setReelOrder(prev => prev.filter(id => id !== clipId))
    showToast('Clip deleted.')
  }

  const handleSaveClipEdit = async (clipId, updates) => {
    const { error } = await supabase
      .from('highlight_videos')
      .update(updates)
      .eq('id', clipId)
      .eq('athlete_id', user.id)
    if (error) { showToast('Save failed.'); return }
    setClips(prev => prev.map(c => c.id === clipId ? { ...c, ...updates } : c))
    showToast('Changes saved.')
  }

  const addToReel = (clipId) => {
    if (reelOrder.includes(clipId)) return
    setReelOrder(prev => [...prev, clipId])
    showToast('Added to reel.')
  }

  const removeFromReel = (clipId) => {
    setReelOrder(prev => prev.filter(id => id !== clipId))
  }

  // ── dnd-kit drag handlers ────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setReelOrder(prev => {
        const oldIdx = prev.indexOf(active.id)
        const newIdx = prev.indexOf(over.id)
        return arrayMove(prev, oldIdx, newIdx)
      })
    }
  }

  // Save reel order to Supabase
  const saveReelOrder = async () => {
    setSavingReel(true)
    try {
      // Update reel_order for clips IN the reel
      const updates = reelOrder.map((id, i) =>
        supabase
          .from('highlight_videos')
          .update({ reel_order: i + 1 })
          .eq('id', id)
          .eq('athlete_id', user.id)
      )
      // Reset reel_order for clips NOT in the reel
      const notInReel = clips
        .filter(c => !reelOrder.includes(c.id))
        .map(c => supabase
          .from('highlight_videos')
          .update({ reel_order: 0 })
          .eq('id', c.id)
          .eq('athlete_id', user.id)
        )
      await Promise.all([...updates, ...notInReel])
      showToast('Reel order saved — coaches will see your clips in this order.')
      await loadClips()
    } catch {
      showToast('Failed to save reel order.')
    } finally {
      setSavingReel(false)
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────
  const reelClips = useMemo(
    () => reelOrder.map(id => clips.find(c => c.id === id)).filter(Boolean),
    [reelOrder, clips]
  )

  const readyClips = clips.filter(c => c.status === 'ready')
  const pendingClips = clips.filter(c => c.status !== 'ready')

  // ── Recruiting Card helpers ──────────────────────────────────────────
  const buildCardSVG = () => {
    const W = 1080, H = 1350
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0e1a"/>
      <stop offset="100%" stop-color="#131b2c"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.18" cy="0.05" r="0.55">
      <stop offset="0%" stop-color="rgba(200,16,46,0.35)"/>
      <stop offset="100%" stop-color="rgba(200,16,46,0)"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="80" y="80" width="40" height="3" fill="#C8102E"/>
  <text x="140" y="92" font-family="Manrope, Inter, sans-serif" font-size="22" font-weight="700" fill="#C8102E" letter-spacing="6">${escapeSvg(orgName.toUpperCase())} · ECNL</text>
  <text x="80" y="180" font-family="Manrope, sans-serif" font-size="32" fill="#94a3b8" font-weight="500" letter-spacing="2">CLASS OF ${escapeSvg(card.grad)}</text>
  <text x="80" y="290" font-family="Oswald, Impact, sans-serif" font-size="100" font-weight="700" fill="#ffffff" letter-spacing="-1">${escapeSvg(card.name.toUpperCase())}</text>
  <text x="80" y="360" font-family="Oswald, Impact, sans-serif" font-size="52" font-weight="600" fill="#C8102E" letter-spacing="2">${escapeSvg(card.position.toUpperCase())} · #${escapeSvg(card.jersey)}</text>
  <text x="80" y="425" font-family="Manrope, sans-serif" font-size="28" fill="#cbd5e1" font-weight="500">${escapeSvg(card.height)} · ${escapeSvg(card.foot)}-footed · GPA ${escapeSvg(card.gpa)}</text>
  <g transform="translate(80, 510)">${statBox(0, 'GOALS', card.goals)}${statBox(320, 'ASSISTS', card.assists)}${statBox(640, 'GAMES', card.games)}</g>
  <rect x="80" y="780" width="30" height="3" fill="#C8102E"/>
  <text x="130" y="794" font-family="Manrope, sans-serif" font-size="22" font-weight="700" fill="#C8102E" letter-spacing="4">TARGET PROGRAMS</text>
  <text x="80" y="870" font-family="Oswald, Impact, sans-serif" font-size="52" font-weight="600" fill="#ffffff" letter-spacing="1">${escapeSvg(card.school1)}</text>
  <text x="80" y="940" font-family="Oswald, Impact, sans-serif" font-size="52" font-weight="600" fill="#ffffff" letter-spacing="1">${escapeSvg(card.school2)}</text>
  <text x="80" y="1010" font-family="Oswald, Impact, sans-serif" font-size="52" font-weight="600" fill="#ffffff" letter-spacing="1">${escapeSvg(card.school3)}</text>
  <rect x="0" y="1180" width="${W}" height="170" fill="#C8102E"/>
  <text x="80" y="1240" font-family="Manrope, sans-serif" font-size="24" fill="rgba(255,255,255,0.7)" font-weight="600" letter-spacing="3">HIGHLIGHT REEL</text>
  <text x="80" y="1300" font-family="Oswald, Impact, sans-serif" font-size="60" font-weight="700" fill="#ffffff" letter-spacing="1">${escapeSvg(card.reelUrl)}</text>
</svg>`.trim()
  }

  const downloadCard = async () => {
    try {
      const svg = buildCardSVG()
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = 1080; canvas.height = 1350
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, 1080, 1350)
        canvas.toBlob((pngBlob) => {
          const pngUrl = URL.createObjectURL(pngBlob)
          const a = document.createElement('a')
          a.href = pngUrl
          a.download = `recruiting-card-${card.name.toLowerCase().replace(/\s+/g, '-')}.png`
          a.click()
          URL.revokeObjectURL(url); URL.revokeObjectURL(pngUrl)
          showToast('Card downloaded — post it to your Instagram.')
        }, 'image/png')
      }
      img.onerror = () => showToast('Could not render card. Try again.')
      img.src = url
    } catch {
      showToast('Card download failed.')
    }
  }

  const profileUrl = `${window.location.origin}/p/${user?.id || 'demo'}`

  // Preserved for the "Copy profile link" button on the reel-share row —
  // the current layout funnels users through `shareReel` (Web Share API),
  // so this manual copy helper isn't wired up at the moment.
  // const copyProfileUrl = async () => {
  //   try {
  //     await navigator.clipboard.writeText(profileUrl)
  //     showToast('Profile link copied — send it to a coach.')
  //   } catch {
  //     showToast('Copy failed — select and copy manually.')
  //   }
  // }

  const shareReel = useCallback(async () => {
    const shareData = {
      title: `${fullName} — Highlight Reel`,
      text: `Check out ${fullName}'s soccer highlight reel on KRS College Connect.`,
      url: profileUrl,
    }
    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData)
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }
    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(profileUrl)
      showToast('Reel link copied! Send it to coaches or post on social.')
    } catch {
      showToast('Copy failed — share manually.')
    }
  }, [profileUrl, fullName, showToast])

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <AthleteLayout>
      <div className="px-4 md:px-8 py-8 max-w-7xl mx-auto">

        {/* Toast */}
        {toast && (
          <div
            className="fixed top-6 right-6 z-50 design-card px-4 py-3 flex items-center gap-2 shadow-lg"
            style={{ borderColor: 'rgba(200,16,46,0.4)', maxWidth: '340px' }}
          >
            <Sparkles size={14} style={{ color: 'var(--crimson-3)', flexShrink: 0 }} />
            <span className="text-sm text-white">{toast}</span>
          </div>
        )}

        {/* Edit modal */}
        {editingClip && (
          <ClipEditModal
            clip={editingClip}
            onSave={handleSaveClipEdit}
            onClose={() => setEditingClip(null)}
          />
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8" style={{ background: 'var(--crimson)' }} />
            <span className="text-[10px] uppercase tracking-[0.22em] font-bold" style={{ color: 'var(--crimson)' }}>
              Content studio
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="display-font text-4xl text-white">Video Studio</h1>
              <p className="text-text-secondary text-sm mt-1 max-w-2xl">
                Upload game clips, trim your best moments, and build a highlight reel coaches can watch on your profile.
              </p>
            </div>
            <button onClick={shareReel} className="eastside-btn inline-flex items-center gap-2 text-sm">
              <Share2 size={13} /> Share reel
            </button>
          </div>
        </div>

        {/* Main tabs */}
        <div className="flex gap-1 mb-6 border-b border-card-border">
          {[
            { id: 'studio', label: 'Video Studio', icon: Film },
            { id: 'card', label: 'Recruiting Card', icon: ImageIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMainTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
                mainTab === id
                  ? 'border-crimson text-white'
                  : 'border-transparent text-text-secondary hover:text-white'
              }`}
              style={mainTab === id ? { borderColor: 'var(--crimson)' } : {}}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ======================== VIDEO STUDIO TAB ======================== */}
        {mainTab === 'studio' && (
          <div>
            {/* Studio sub-tabs */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {[
                { id: 'upload', label: 'Upload clip' },
                { id: 'library', label: `My clips${clips.length ? ` (${clips.length})` : ''}` },
                { id: 'reel', label: `Reel builder${reelOrder.length ? ` · ${reelOrder.length}` : ''}` },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setStudioTab(id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    studioTab === id
                      ? 'text-white'
                      : 'text-text-secondary hover:text-white bg-navy-900 border border-card-border'
                  }`}
                  style={studioTab === id ? { background: 'var(--crimson)', border: '1px solid var(--crimson)' } : {}}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── UPLOAD TAB ──────────────────────────────────────────── */}
            {studioTab === 'upload' && (
              <div className="design-card p-6 md:p-8">
                <h2 className="display-font text-lg text-white mb-1">Upload a clip</h2>
                <p className="text-text-secondary text-sm mb-6">
                  Upload game clips from your device. We'll process them with Mux for smooth playback on any device.
                </p>

                {/* Title input */}
                <div className="mb-4 max-w-sm">
                  <label className="block text-[10px] uppercase tracking-widest text-text-tertiary font-bold mb-1">
                    Clip title (optional)
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                    placeholder="e.g. ECNL Playoffs — game winner"
                    className="form-input w-full text-sm"
                    disabled={uploadState === 'uploading' || uploadState === 'polling'}
                  />
                </div>

                {/* Drop zone */}
                {uploadState === 'idle' || uploadState === 'error' ? (
                  <label
                    className="block border-2 border-dashed border-card-border rounded-xl p-10 text-center cursor-pointer hover:border-slate-500 transition"
                    style={{ background: 'rgba(10,14,26,0.4)' }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={handleDrop}
                  >
                    <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
                    <Upload size={32} className="mx-auto mb-3 text-text-tertiary" />
                    <p className="text-white font-medium mb-1">Drag & drop a video here</p>
                    <p className="text-text-tertiary text-sm mb-4">or click to choose a file</p>
                    <div className="inline-block eastside-btn text-sm px-6">Browse files</div>
                    {uploadState === 'error' && (
                      <p className="mt-3 text-red-400 text-sm flex items-center justify-center gap-1">
                        <AlertCircle size={13} /> Upload failed — try again
                      </p>
                    )}
                  </label>
                ) : (
                  <div className="rounded-xl border border-card-border p-8 text-center" style={{ background: 'rgba(10,14,26,0.4)' }}>
                    {uploadState === 'fetching' && (
                      <>
                        <Loader2 size={32} className="mx-auto mb-3 animate-spin text-text-tertiary" />
                        <p className="text-white font-medium">Preparing upload…</p>
                      </>
                    )}
                    {uploadState === 'uploading' && (
                      <>
                        <p className="text-white font-medium mb-4">Uploading to Mux…</p>
                        <div className="w-full bg-navy-800 rounded-full h-2 mb-2 max-w-sm mx-auto overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%`, background: 'var(--crimson)' }}
                          />
                        </div>
                        <p className="text-text-tertiary text-sm">{uploadProgress}%</p>
                      </>
                    )}
                    {uploadState === 'polling' && (
                      <>
                        <Loader2 size={32} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--crimson-3)' }} />
                        <p className="text-white font-medium mb-1">Upload complete — Mux is processing</p>
                        <p className="text-text-tertiary text-sm">This usually takes 30–90 seconds. We'll switch you to your library when it's ready.</p>
                      </>
                    )}
                    {uploadState === 'done' && (
                      <>
                        <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: 'var(--crimson-3)' }} />
                        <p className="text-white font-medium mb-3">Clip is ready!</p>
                        <button onClick={() => { setUploadState('idle'); setStudioTab('library') }} className="eastside-btn text-sm px-6">
                          View in My Clips
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div className="mt-6 p-3.5 rounded-lg flex gap-2.5 text-xs"
                  style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.18)', color: '#fcd34d' }}>
                  <Sparkles size={13} className="flex-shrink-0 mt-0.5" />
                  <div>
                    Supported formats: MP4, MOV, MKV, AVI, and most other video files. Files are processed by Mux
                    and stored securely — only coaches with your profile link can view them.
                  </div>
                </div>
              </div>
            )}

            {/* ── LIBRARY TAB ─────────────────────────────────────────── */}
            {studioTab === 'library' && (
              <div>
                {loadingClips ? (
                  <div className="text-center py-16">
                    <Loader2 size={24} className="mx-auto mb-3 animate-spin text-text-tertiary" />
                    <p className="text-text-secondary text-sm">Loading your clips…</p>
                  </div>
                ) : clips.length === 0 ? (
                  <div className="design-card p-10 text-center">
                    <Film size={32} className="mx-auto mb-3 text-text-tertiary" />
                    <p className="text-white font-medium mb-1">No clips yet</p>
                    <p className="text-text-secondary text-sm mb-5">
                      Upload your first game clip to get started.
                    </p>
                    <button onClick={() => setStudioTab('upload')} className="eastside-btn inline-flex items-center gap-2">
                      <Upload size={14} /> Upload a clip
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Processing clips notice */}
                    {pendingClips.length > 0 && (
                      <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm"
                        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}>
                        <Loader2 size={14} className="animate-spin flex-shrink-0" />
                        {pendingClips.length} clip{pendingClips.length > 1 ? 's are' : ' is'} still processing — this page will update automatically.
                      </div>
                    )}

                    {/* Ready clips */}
                    {readyClips.length > 0 && (
                      <>
                        <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold mb-3">
                          Ready ({readyClips.length})
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-5">
                          {readyClips.map(clip => (
                            <ClipCard
                              key={clip.id}
                              clip={clip}
                              onEdit={c => setEditingClip(c)}
                              onDelete={handleDeleteClip}
                              onAddToReel={addToReel}
                              inReel={reelOrder.includes(clip.id)}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Pending clips */}
                    {pendingClips.length > 0 && (
                      <>
                        <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold mb-3">
                          Processing ({pendingClips.length})
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {pendingClips.map(clip => (
                            <ClipCard
                              key={clip.id}
                              clip={clip}
                              onEdit={() => {}}
                              onDelete={handleDeleteClip}
                              onAddToReel={() => {}}
                              inReel={false}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── REEL BUILDER TAB ────────────────────────────────────── */}
            {studioTab === 'reel' && (
              <div className="design-card p-6">
                <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
                  <div>
                    <h2 className="display-font text-lg text-white">Highlight reel</h2>
                    <p className="text-[11px] uppercase tracking-widest text-text-tertiary mt-1">
                      Drag to reorder · {reelOrder.length} clip{reelOrder.length !== 1 ? 's' : ''} in reel
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => window.open('https://studio.youtube.com/channel/upload', '_blank', 'noopener,noreferrer')}
                      className="secondary-btn inline-flex items-center gap-2 text-sm"
                      title="Download your reel then upload it to YouTube Studio"
                    >
                      <YoutubeIcon size={13} /> Upload to YouTube
                    </button>
                    <button onClick={shareReel} className="secondary-btn inline-flex items-center gap-2 text-sm">
                      <Share2 size={13} /> Share reel
                    </button>
                    <button
                      onClick={saveReelOrder}
                      disabled={savingReel}
                      className="eastside-btn inline-flex items-center gap-2"
                    >
                      {savingReel ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save order
                    </button>
                  </div>
                </div>

                {readyClips.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-card-border rounded-lg">
                    <Film size={28} className="mx-auto mb-3 text-text-tertiary" />
                    <p className="text-text-secondary text-sm">
                      No ready clips to add. <button onClick={() => setStudioTab('upload')} className="text-white underline">Upload a clip</button> first.
                    </p>
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-[1fr_1fr] gap-6">
                    {/* Left: available clips */}
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold mb-3">
                        Available clips
                      </div>
                      <div className="space-y-2">
                        {readyClips.map(clip => {
                          const inReel = reelOrder.includes(clip.id)
                          return (
                            <div
                              key={clip.id}
                              className="flex items-center gap-3 p-2.5 rounded-lg border border-card-border bg-navy-900"
                            >
                              <div className="w-12 h-8 rounded overflow-hidden flex-shrink-0 border border-card-border" style={{ background: '#0a0e1a' }}>
                                {clip.mux_playback_id && (
                                  <img
                                    src={`https://image.mux.com/${clip.mux_playback_id}/thumbnail.jpg?width=48&height=32&fit_mode=smartcrop`}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={e => { e.target.style.display = 'none' }}
                                  />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-white truncate">{clip.title}</div>
                                <div className="text-[11px] text-text-tertiary">{fmtDuration(clip.duration)}</div>
                              </div>
                              <ClipDownloadMenu clip={clip} />
                              <button
                                onClick={() => inReel ? removeFromReel(clip.id) : addToReel(clip.id)}
                                className={`text-[11px] font-semibold px-2.5 py-1 rounded ${
                                  inReel
                                    ? 'bg-navy-800 text-text-tertiary hover:text-red-400'
                                    : 'text-white'
                                }`}
                                style={inReel ? {} : { background: 'var(--crimson)' }}
                              >
                                {inReel ? '✓ In reel' : '+ Add'}
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Right: reel order */}
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold mb-3 flex items-center gap-2">
                        Reel order
                        <span className="text-text-tertiary font-normal normal-case tracking-normal">
                          — drag to reorder
                        </span>
                      </div>
                      {reelClips.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-card-border rounded-lg">
                          <p className="text-text-tertiary text-sm">Add clips from the left to build your reel.</p>
                        </div>
                      ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                          <SortableContext items={reelOrder} strategy={verticalListSortingStrategy}>
                            <div className="space-y-2">
                              {reelClips.map((clip, i) => (
                                <SortableClipRow
                                  key={clip.id}
                                  clip={clip}
                                  index={i}
                                  onRemove={removeFromReel}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      )}

                      {reelClips.length > 0 && (
                        <>
                          <div className="mt-4 text-[11px] text-text-tertiary flex items-center gap-1.5">
                            <ChevronRight size={11} />
                            Clips play in this order on your public profile. Click <strong className="text-white">Save order</strong> to publish.
                          </div>
                          <div className="mt-3 p-3 rounded-lg text-[11px]"
                            style={{ background: 'rgba(255,0,0,0.06)', border: '1px solid rgba(255,0,0,0.15)', color: '#fca5a5' }}>
                            <span className="font-semibold flex items-center gap-1.5 mb-0.5"><YoutubeIcon size={11} /> Uploading to YouTube?</span>
                            Download a clip using the <Download size={9} className="inline" /> button above, then tap <strong>Upload to YouTube</strong> to open YouTube Studio. Paste in your title and you're done.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ======================== RECRUITING CARD TAB ======================== */}
        {mainTab === 'card' && (
          <div className="design-card p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <h2 className="display-font text-lg text-white">Recruiting card</h2>
                <p className="text-[11px] uppercase tracking-widest text-text-tertiary mt-1">
                  IG-portrait · 1080 × 1350 · download as PNG
                </p>
              </div>
              <button onClick={downloadCard} className="eastside-btn inline-flex items-center gap-2">
                <Download size={14} /> Download PNG
              </button>
            </div>

            <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
              {/* Live SVG preview */}
              <div className="rounded-lg overflow-hidden border border-card-border" style={{ background: '#0a0e1a' }}>
                <div
                  ref={cardRef}
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: buildCardSVG() }}
                  style={{ aspectRatio: '1080 / 1350' }}
                />
              </div>

              {/* Edit fields */}
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  ['name', 'Full name'],
                  ['position', 'Position'],
                  ['grad', 'Grad year'],
                  ['jersey', 'Jersey #'],
                  ['height', 'Height'],
                  ['foot', 'Foot (L / R)'],
                  ['gpa', 'GPA'],
                  ['games', 'Games'],
                  ['goals', 'Goals'],
                  ['assists', 'Assists'],
                  ['school1', 'Target school 1'],
                  ['school2', 'Target school 2'],
                  ['school3', 'Target school 3'],
                  ['reelUrl', 'Reel URL (shown on card)'],
                ].map(([key, label]) => (
                  <div key={key} className={key === 'name' || key === 'reelUrl' ? 'sm:col-span-2' : ''}>
                    <label className="block text-[10px] uppercase tracking-widest text-text-tertiary font-bold mb-1">
                      {label}
                    </label>
                    <input
                      value={card[key]}
                      onChange={(e) => setCard({ ...card, [key]: e.target.value })}
                      className="form-input w-full text-sm"
                    />
                  </div>
                ))}
                <div className="sm:col-span-2 mt-2 p-3 rounded-lg flex gap-2 text-xs"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fcd34d' }}>
                  <ImageIcon size={14} className="flex-shrink-0 mt-0.5" />
                  <div>
                    Edit any field above and the preview updates instantly. Click Download PNG when it looks right —
                    then post it to your IG story or feed.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </AthleteLayout>
  )
}

/* ============================================================
   SVG helpers (for recruiting card)
   ============================================================ */

function statBox(x, label, value) {
  // Both label and value are escaped: label is currently hardcoded by the
  // caller, but escaping it costs nothing and prevents future regressions.
  // value comes from card.goals/assists/games — free-text athlete-editable
  // inputs, so escaping closes a self-XSS path in the inline SVG preview.
  return `<g transform="translate(${x}, 0)">
    <rect x="0" y="0" width="280" height="180" rx="14" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    <text x="24" y="50" font-family="Manrope, sans-serif" font-size="20" fill="#94a3b8" font-weight="700" letter-spacing="3">${escapeSvg(label)}</text>
    <text x="24" y="135" font-family="Oswald, Impact, sans-serif" font-size="80" font-weight="700" fill="#ffffff">${escapeSvg(value)}</text>
  </g>`
}

function escapeSvg(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
