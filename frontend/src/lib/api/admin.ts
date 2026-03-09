import { apiRequest } from './client'
import type { AdminMatchOut, AdminSwipeOut, UserOut } from './types'

function adminHeaders(adminUserId: string): HeadersInit {
  return { 'X-Admin-User-Id': adminUserId }
}

export function getAdminUsers(adminUserId: string, limit = 50, offset = 0): Promise<UserOut[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  return apiRequest<UserOut[]>(`/api/admin/users?${params.toString()}`, {
    headers: adminHeaders(adminUserId),
  })
}

export function getAdminSwipes(adminUserId: string, limit = 100, offset = 0): Promise<AdminSwipeOut[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  return apiRequest<AdminSwipeOut[]>(`/api/admin/swipes?${params.toString()}`, {
    headers: adminHeaders(adminUserId),
  })
}

export function getAdminMatches(adminUserId: string, limit = 100, offset = 0): Promise<AdminMatchOut[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  return apiRequest<AdminMatchOut[]>(`/api/admin/matches?${params.toString()}`, {
    headers: adminHeaders(adminUserId),
  })
}
