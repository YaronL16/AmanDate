import { apiRequest } from './client'
import type { UserCard } from './types'

export function getDiscoveryCandidates(userId: string, limit = 20, offset = 0): Promise<UserCard[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  return apiRequest<UserCard[]>(`/api/discovery/${userId}?${params.toString()}`)
}
