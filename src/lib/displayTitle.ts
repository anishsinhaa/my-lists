export function displayTitle(title: string, year: number | null): string {
  if (year === null) return title
  const next = title.replace(new RegExp(`\\s*[\\[(]\\s*${year}\\s*[\\])]\\s*$`, 'u'), '').trim()
  return next.length > 0 ? next : title
}
