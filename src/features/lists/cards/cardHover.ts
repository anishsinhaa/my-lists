export const CARD_HOVER = 'card-hover'
export const CARD_POSTER = 'card-hover-poster'

export function cardHoverClass(tilt?: 'a' | 'b'): string {
  if (tilt === 'a') return `${CARD_HOVER} card-tilt-a`
  if (tilt === 'b') return `${CARD_HOVER} card-tilt-b`
  return CARD_HOVER
}
