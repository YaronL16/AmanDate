import { apiRequest } from './client'
import type { SwipeRequestPayload, SwipeResult } from './types'

export function postSwipe(payload: SwipeRequestPayload): Promise<SwipeResult> {
  return apiRequest<SwipeResult>('/api/swipe', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
