import { useIsFetching } from '@tanstack/react-query'
import { useNavigation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

export function useLoadingSignal(): boolean {
  const fetching = useIsFetching({ queryKey: ['lists'] })
  const navigation = useNavigation()
  const { status } = useAuth()
  return fetching > 0 || navigation.state !== 'idle' || status === 'checking'
}
