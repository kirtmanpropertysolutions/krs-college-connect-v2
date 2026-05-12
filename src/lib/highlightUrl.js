export function parseHighlightUrl(url) {
  if (!url) return { source: null, thumbnail_url: null, embed_url: null }

  // YouTube — supports youtube.com/watch?v=, youtu.be/, youtube.com/embed/
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) {
    const id = ytMatch[1]
    return {
      source: 'youtube',
      thumbnail_url: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
      embed_url: `https://www.youtube.com/embed/${id}`
    }
  }

  // Hudl — hudl.com/video/...
  if (url.includes('hudl.com')) {
    return { source: 'hudl', thumbnail_url: null, embed_url: url }
  }

  // Trace — traceup.com or trace.up
  if (url.includes('traceup.com') || url.includes('trace.up')) {
    return { source: 'trace', thumbnail_url: null, embed_url: url }
  }

  // Veo — app.veo.co
  if (url.includes('veo.co')) {
    return { source: 'veo', thumbnail_url: null, embed_url: url }
  }

  // Instagram reel
  if (url.includes('instagram.com/reel') || url.includes('instagram.com/p/')) {
    return { source: 'instagram', thumbnail_url: null, embed_url: url }
  }

  // TikTok
  if (url.includes('tiktok.com')) {
    return { source: 'tiktok', thumbnail_url: null, embed_url: url }
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) {
    return { source: 'vimeo', thumbnail_url: null, embed_url: `https://player.vimeo.com/video/${vimeoMatch[1]}` }
  }

  return { source: 'other', thumbnail_url: null, embed_url: url }
}

export function getSourceLabel(source) {
  const labels = {
    youtube: 'YouTube',
    hudl: 'Hudl',
    trace: 'Trace',
    veo: 'Veo',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    vimeo: 'Vimeo',
    other: 'Link'
  }
  return labels[source] || 'Link'
}

export function getSourceColor(source) {
  const colors = {
    youtube: 'text-red-400',
    hudl: 'text-orange-400',
    trace: 'text-purple-400',
    veo: 'text-blue-400',
    instagram: 'text-pink-400',
    tiktok: 'text-cyan-400',
    vimeo: 'text-sky-400',
    other: 'text-gray-400'
  }
  return colors[source] || 'text-gray-400'
}