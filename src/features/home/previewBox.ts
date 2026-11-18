export const PREVIEW_DELAY = 250
export const PREVIEW_WIDTH = 280
export const PREVIEW_HEIGHT = 420

export function previewBox(
  anchor: { top: number; left: number; right: number; bottom: number },
  card: { width: number; height: number },
  viewport: { width: number; height: number },
): { top: number; left: number } {
  const margin = 8
  const gap = 12
  let left = anchor.right + gap
  if (left + card.width > viewport.width - margin) left = anchor.left - gap - card.width
  if (left < margin) left = margin
  if (left + card.width > viewport.width - margin) left = Math.max(margin, viewport.width - margin - card.width)
  let top = anchor.top
  if (top + card.height > viewport.height - margin) top = viewport.height - margin - card.height
  if (top < margin) top = margin
  return { top, left }
}
