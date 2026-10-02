import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribeContentEvents } from '../api/contentEvents'

export default function ContentSync() {
  const queryClient = useQueryClient()

  useEffect(
    () =>
      subscribeContentEvents(() => {
        void queryClient.invalidateQueries({ queryKey: ['admin'] })
      }),
    [queryClient],
  )

  return null
}
