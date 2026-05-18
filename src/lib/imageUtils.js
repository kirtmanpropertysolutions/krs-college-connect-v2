/**
 * Image processing utilities for client-side photo uploads.
 *
 * Why we re-encode every uploaded image before sending it to Supabase:
 *
 *   1. EXIF stripping — phone photos carry GPS coordinates of where
 *      they were taken, device model, software version, and exact
 *      timestamp. For athletes uploading from their phone, that often
 *      means leaking their home address or training facility location.
 *      Canvas re-encoding produces output with zero metadata.
 *
 *   2. Right-sizing — phone camera output is routinely 12 MP / 4–6 MB.
 *      Profile photos display at ~150px wide on cards, ~400px on the
 *      detail modal, and ~800px on the public recruiting page. Storing
 *      4000px-wide originals wastes bandwidth on every page load and
 *      pushes against the bucket's 5 MB limit. Capping the longest
 *      side at 1200px is generous for the largest use and shrinks a
 *      typical phone photo to ~200–400 KB.
 *
 *   3. Orientation correctness — iOS / Android often save photos with
 *      a "rotate 90°" flag in EXIF rather than rotating the pixels.
 *      Stripping EXIF without applying the rotation would leave the
 *      image sideways. `createImageBitmap({ imageOrientation: 'from-image' })`
 *      bakes the rotation into the pixels so the output is correctly
 *      oriented and self-contained.
 */

/**
 * Strip EXIF metadata, fix orientation, and resize an image file
 * before upload. Returns a fresh Blob the caller can hand to
 * Supabase Storage.
 *
 * @param {File}   file
 * @param {object} [opts]
 * @param {number} [opts.maxDimension=1200] - cap on longest side, px
 * @param {number} [opts.quality=0.9]       - JPEG quality 0–1
 * @returns {Promise<Blob>}
 */
export async function stripExifAndResize(file, { maxDimension = 1200, quality = 0.9 } = {}) {
  // Decode into a bitmap with EXIF orientation baked into the pixels.
  // imageOrientation: 'from-image' is widely supported on modern browsers
  // (Chrome 79+, Firefox 79+, Safari 15+) which covers every device an
  // athlete would realistically use to upload a profile photo.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })

  // Preserve aspect ratio, cap the longest side at maxDimension.
  let { width, height } = bitmap
  if (Math.max(width, height) > maxDimension) {
    const scale = maxDimension / Math.max(width, height)
    width = Math.round(width * scale)
    height = Math.round(height * scale)
  }

  // Draw to canvas — canvas exports never include EXIF, IPTC, or XMP
  // metadata. The output is a stripped, oriented, resized image.
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  // Preserve PNG transparency if the input was PNG (rare for headshots
  // but cheap to support). Otherwise re-encode as JPEG which is smaller
  // and visually identical for photos.
  const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const outputQuality = outputMime === 'image/jpeg' ? quality : undefined

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
      outputMime,
      outputQuality
    )
  })
}
