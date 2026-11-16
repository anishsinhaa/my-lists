export function makeItemId(listId: string, titleKey: string, year: number | null, dupIndex: number): string {
  const base = `${listId}:${titleKey}:${year ?? ''}`
  return dupIndex <= 1 ? base : `${base}~${dupIndex}`
}
