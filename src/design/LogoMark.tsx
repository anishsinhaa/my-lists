export function LogoMark({ size, className = '' }: { size: number; className?: string }) {
  return <img src="/brand/logo-mark.svg" alt="" width={size} height={size} className={`shrink-0 ${className}`} />
}
