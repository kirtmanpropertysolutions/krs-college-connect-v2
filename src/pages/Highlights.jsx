import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { parseHighlightUrl, getSourceLabel, getSourceColor } from '../lib/highlightUrl'
import { logActivity } from '../lib/activity'
import { Link } from 'react-router-dom'
import { MoreVertical, Plus, X, Play, ExternalLink } from 'lucide-react'
import AthleteLayout from '../components/AthleteLayout.jsx'

const PREDEFINED_TAGS = ['GAME', 'TRAINING', 'TOURNAMENT', 'SHOWCASE', 'GOALS', 'ASSISTS', 'DEFENSIVE', 'FULL_MATCH']

export default function Highlights() {
  const { user } = useAuth()
  const [highlights, setHighlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHighlight, setEditingHighlight] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    recorded_date: new Date().toISOString().split('T')[0],
    tags: [],
    is_primary: false
  })
  const [urlInfo, setUrlInfo] = useState({ source: null, thumbnail_url: null })
  const [customTag, setCustomTag] = useState('')

  useEffect(() => {
    if (user?.id) {
      loadHighlights()
    }
  }, [user?.id])

  const loadHighlights = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('highlights')
        .select('*')
        .eq('athlete_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) throw error
      setHighlights(data || [])
    } catch (error) {
      console.error('Error loading highlights:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUrlChange = (url) => {
    setFormData(prev => ({ ...prev, url }))
    const info = parseHighlightUrl(url)
    setUrlInfo(info)
  }

  const resetForm = () => {
    setFormData({
      url: '',
      title: '',
      recorded_date: new Date().toISOString().split('T')[0],
      tags: [],
      is_primary: false
    })
    setUrlInfo({ source: null, thumbnail_url: null })
    setCustomTag('')
  }

  const openAddModal = () => {
    resetForm()
    setEditingHighlight(null)
    setShowAddModal(true)
  }

  const openEditModal = (highlight) => {
    setFormData({
      url: highlight.url,
      title: highlight.title,
      recorded_date: highlight.recorded_date || new Date().toISOString().split('T')[0],
      tags: highlight.tags || [],
      is_primary: highlight.is_primary
    })
    setUrlInfo(parseHighlightUrl(highlight.url))
    setEditingHighlight(highlight)
    setShowAddModal(true)
  }

  const addTag = (tag) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
    }
  }

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const addCustomTag = () => {
    if (customTag.trim()) {
      addTag(customTag.trim().toUpperCase())
      setCustomTag('')
    }
  }

  const handleSave = async () => {
    if (!formData.url.trim() || !formData.title.trim()) return

    try {
      const highlightData = {
        athlete_id: user.id,
        url: formData.url.trim(),
        title: formData.title.trim(),
        recorded_date: formData.recorded_date || null,
        source: urlInfo.source,
        thumbnail_url: urlInfo.thumbnail_url,
        tags: formData.tags,
        is_primary: formData.is_primary
      }

      if (editingHighlight) {
        // Update existing
        const { error } = await supabase
          .from('highlights')
          .update(highlightData)
          .eq('id', editingHighlight.id)

        if (error) throw error

        await logActivity(user.id, 'highlight_updated', {
          title: formData.title,
          source: urlInfo.source
        })
      } else {
        // Create new
        const { error } = await supabase
          .from('highlights')
          .insert(highlightData)

        if (error) throw error

        await logActivity(user.id, 'highlight_added', {
          title: formData.title,
          source: urlInfo.source
        })
      }

      // If setting as primary, unset previous primary
      if (formData.is_primary) {
        await supabase
          .from('highlights')
          .update({ is_primary: false })
          .eq('athlete_id', user.id)
          .neq('id', editingHighlight?.id || '')

        if (editingHighlight) {
          await supabase
            .from('highlights')
            .update({ is_primary: true })
            .eq('id', editingHighlight.id)
        }
      }

      setShowAddModal(false)
      await loadHighlights()
    } catch (error) {
      console.error('Error saving highlight:', error)
    }
  }

  const handleSetPrimary = async (highlight) => {
    try {
      // Unset current primary
      await supabase
        .from('highlights')
        .update({ is_primary: false })
        .eq('athlete_id', user.id)
        .eq('is_primary', true)

      // Set new primary
      await supabase
        .from('highlights')
        .update({ is_primary: true })
        .eq('id', highlight.id)

      await loadHighlights()
    } catch (error) {
      console.error('Error setting primary highlight:', error)
    }
  }

  const handleDelete = async (highlight) => {
    try {
      const { error } = await supabase
        .from('highlights')
        .delete()
        .eq('id', highlight.id)

      if (error) throw error

      await logActivity(user.id, 'highlight_deleted', {
        title: highlight.title,
        source: highlight.source
      })

      setShowDeleteConfirm(null)
      await loadHighlights()
    } catch (error) {
      console.error('Error deleting highlight:', error)
    }
  }

  const openVideo = (url) => {
    window.open(url, '_blank', 'noopener')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <AthleteLayout>
        <div className="p-8">
          <div className="text-white">Loading highlights...</div>
        </div>
      </AthleteLayout>
    )
  }

  return (
    <AthleteLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="display-font text-3xl text-white mb-2">HIGHLIGHTS</h1>
            <p className="text-gray-400">
              Your video library — coaches see your primary reel first
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            ADD HIGHLIGHT
          </button>
        </div>

        {/* Empty state */}
        {highlights.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-navy-900 rounded-2xl p-12 border border-gray-700">
              <div className="text-6xl mb-4">🎬</div>
              <h2 className="text-2xl font-bold text-white mb-4">Add Your First Clip</h2>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Upload highlights from games, training, or showcases. Coaches love to see you in action.
              </p>
              <button
                onClick={openAddModal}
                className="btn-primary text-lg px-8 py-4"
              >
                ADD YOUR FIRST CLIP
              </button>
            </div>
          </div>
        ) : (
          /* Highlights grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {highlights.map((highlight, index) => (
              <div
                key={highlight.id}
                className={`bg-navy-900 rounded-xl overflow-hidden border transition-colors group cursor-pointer ${
                  highlight.is_primary
                    ? 'lg:col-span-2 border-club-secondary bg-gradient-to-br from-navy-900 to-yellow-900/20'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
                onClick={(e) => {
                  if (!e.target.closest('.menu-button')) {
                    openVideo(highlight.url)
                  }
                }}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gradient-to-br from-navy-800 to-navy-700 relative overflow-hidden">
                  {highlight.thumbnail_url ? (
                    <img
                      src={highlight.thumbnail_url}
                      alt={highlight.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-6xl ${getSourceColor(highlight.source)}`}>
                      {highlight.source === 'youtube' && '▶️'}
                      {highlight.source === 'hudl' && '🏈'}
                      {highlight.source === 'trace' && '⚽'}
                      {highlight.source === 'veo' && '📹'}
                      {highlight.source === 'instagram' && '📷'}
                      {highlight.source === 'tiktok' && '🎵'}
                      {highlight.source === 'vimeo' && '▶️'}
                      {!highlight.source || highlight.source === 'other' ? '🎬' : ''}
                    </div>
                  )}

                  {/* Source badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold bg-black/50 ${getSourceColor(highlight.source)}`}>
                      {getSourceLabel(highlight.source)}
                    </span>
                  </div>

                  {/* Primary badge */}
                  {highlight.is_primary && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 rounded text-xs font-bold bg-club-secondary text-black">
                        PRIMARY
                      </span>
                    </div>
                  )}

                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/90 rounded-full p-3">
                      <Play className="w-6 h-6 text-black" />
                    </div>
                  </div>

                  {/* Menu button */}
                  <div className="absolute top-2 right-2 menu-button">
                    <HighlightMenu
                      highlight={highlight}
                      onEdit={openEditModal}
                      onSetPrimary={handleSetPrimary}
                      onDelete={() => setShowDeleteConfirm(highlight)}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3
                    className="font-semibold text-white text-sm mb-2 truncate"
                    title={highlight.title}
                  >
                    {highlight.title}
                  </h3>

                  {highlight.recorded_date && (
                    <p className="text-gray-400 text-xs mb-2">
                      {formatDate(highlight.recorded_date)}
                    </p>
                  )}

                  {/* Tags */}
                  {highlight.tags && highlight.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {highlight.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-navy-700 text-gray-300 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                      {highlight.tags.length > 3 && (
                        <span className="px-2 py-1 bg-navy-700 text-gray-400 text-xs rounded">
                          +{highlight.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {highlight.is_primary && (
                    <div className="text-club-secondary text-xs font-semibold mt-2">
                      PRIMARY REEL
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => setShowAddModal(false)}>
            <div className="bg-navy-900 border border-gray-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="sticky top-0 bg-navy-900 border-b border-gray-700 p-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {editingHighlight ? 'Edit Highlight' : 'Add Highlight'}
                </h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Video URL *
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-navy-800 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-club-primary"
                  />
                  {urlInfo.source && (
                    <p className="text-green-400 text-xs mt-1">
                      ✓ {getSourceLabel(urlInfo.source)} detected
                    </p>
                  )}
                  {formData.url && !urlInfo.source && (
                    <p className="text-club-secondary text-xs mt-1">
                      ⚠️ Source not recognized — will be saved as generic link
                    </p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="vs Bellevue Christian — Goal + Assist"
                    className="w-full bg-navy-800 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-club-primary"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Recorded Date
                  </label>
                  <input
                    type="date"
                    value={formData.recorded_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, recorded_date: e.target.value }))}
                    className="w-full bg-navy-800 text-white rounded-lg px-4 py-3 border border-gray-600 focus:border-club-primary"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tags
                  </label>

                  {/* Selected tags */}
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 bg-club-primary text-white text-xs rounded flex items-center gap-1">
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="hover:text-red-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Predefined tags */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {PREDEFINED_TAGS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => addTag(tag)}
                        disabled={formData.tags.includes(tag)}
                        className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                          formData.tags.includes(tag)
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-navy-700 text-gray-300 hover:bg-navy-600'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  {/* Custom tag input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      placeholder="Custom tag"
                      className="flex-1 bg-navy-800 text-white rounded px-3 py-2 border border-gray-600 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addCustomTag()
                        }
                      }}
                    />
                    <button
                      onClick={addCustomTag}
                      className="px-3 py-2 bg-club-primary text-white rounded text-xs hover:bg-club-primary-dark"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Primary checkbox */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_primary}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                      className="rounded border-gray-600 bg-navy-800 text-club-primary"
                    />
                    <span className="text-sm text-gray-300">Set as primary highlight</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Primary highlights appear first and are used in recruiting emails
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={!formData.url.trim() || !formData.title.trim()}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingHighlight ? 'Update Highlight' : 'Add Highlight'}
                  </button>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 border border-gray-600 text-white rounded-lg hover:border-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
            <div className="bg-navy-900 border border-gray-700 rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-white mb-4">Delete Highlight</h3>
              <p className="text-gray-300 mb-6">
                Delete "{showDeleteConfirm.title}"? This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 bg-red-600 text-white rounded-lg py-2 hover:bg-red-700"
                >
                  Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 border border-gray-600 text-white rounded-lg py-2 hover:border-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AthleteLayout>
  )
}

// Dropdown menu component
function HighlightMenu({ highlight, onEdit, onSetPrimary, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowMenu(!showMenu)
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/20 text-white"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {showMenu && (
        <div className="absolute right-0 top-6 bg-navy-800 border border-gray-600 rounded-lg py-2 min-w-[140px] z-10">
          {!highlight.is_primary && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSetPrimary(highlight)
                setShowMenu(false)
              }}
              className="w-full text-left px-4 py-2 text-white text-sm hover:bg-navy-700"
            >
              Set as Primary
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(highlight)
              setShowMenu(false)
            }}
            className="w-full text-left px-4 py-2 text-white text-sm hover:bg-navy-700"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(highlight)
              setShowMenu(false)
            }}
            className="w-full text-left px-4 py-2 text-red-400 text-sm hover:bg-navy-700"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}