// Client-side image downscale + re-encode, so we never upload (or store) a giant
// original. The backend bucket hard-caps at 5MB and does NO processing, so doing
// it here both avoids 413s and slashes storage/bandwidth. Dependency-free (canvas).

const PROCESSABLE = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 // mirrors backend lib/storage.ts

interface PrepareOpts {
  maxDim?: number    // longest edge after downscale
  quality?: number   // initial JPEG quality
  maxBytes?: number  // target output ceiling; quality steps down until met
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')) }
    img.src = url
  })
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
}

// Returns a (usually much smaller) JPEG File. Leaves GIFs / unknown types and
// already-small images untouched, and falls back to the original on any error.
export async function prepareImage(file: File, opts: PrepareOpts = {}): Promise<File> {
  const maxDim = opts.maxDim ?? 1600
  const quality = opts.quality ?? 0.82
  const maxBytes = opts.maxBytes ?? 4.5 * 1024 * 1024

  if (typeof document === 'undefined') return file
  if (!PROCESSABLE.has(file.type)) return file // e.g. animated GIF — don't flatten it

  let img: HTMLImageElement
  try {
    img = await loadImage(file)
  } catch {
    return file
  }

  try {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    // No resize needed and already under target — keep the original bytes.
    if (scale === 1 && file.size <= maxBytes) return file

    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, w, h)

    let q = quality
    let blob = await toBlob(canvas, q)
    while (blob && blob.size > maxBytes && q > 0.5) {
      q -= 0.12
      blob = await toBlob(canvas, q)
    }
    if (!blob || blob.size >= file.size) return file // re-encode didn't help — keep original

    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  } finally {
    if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src)
  }
}
