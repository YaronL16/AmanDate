import { apiRequest } from './client'
import type { MatchOut } from './types'

export function getMatches(userId: string): Promise<MatchOut[]> {
  return apiRequest<MatchOut[]>(`/api/matches/${userId}`)
}
