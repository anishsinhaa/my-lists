export const DUR = { instant: 0.1, fast: 0.18, base: 0.28, slow: 0.45 }
export const EASE = {
  standard: [0.2, 0, 0, 1] as [number, number, number, number],
  emphasized: [0.22, 1, 0.36, 1] as [number, number, number, number],
  bounce: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
}
export const fadeUp = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } }
export const fadeIn = { initial: { opacity: 0 }, animate: { opacity: 1 } }
export const scaleIn = { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 } }
export function staggerContainer(stagger: number) {
  return { animate: { transition: { staggerChildren: stagger } } }
}
export const cardHover = { whileHover: { y: -4 }, whileTap: { scale: 0.97 } }
export const tapScale = 0.97
