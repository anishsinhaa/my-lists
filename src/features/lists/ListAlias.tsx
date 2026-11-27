import { Navigate, useLocation } from 'react-router-dom'
import type { ListId } from '@/types/lists'

export function ListAlias({ listId }: { listId: ListId }) {
  const location = useLocation()
  return <Navigate replace to={{ pathname: `/lists/${listId}`, search: location.search, hash: location.hash }} />
}
