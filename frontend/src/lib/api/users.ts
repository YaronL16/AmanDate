import { apiRequest } from './client'
import type { ProfileOptionsOut, UserCreatePayload, UserOut, UserUpdatePayload } from './types'

export function listUsers(limit = 100, offset = 0): Promise<UserOut[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })
  return apiRequest<UserOut[]>(`/api/users?${params.toString()}`)
}

export function createUser(payload: UserCreatePayload): Promise<UserOut> {
  return apiRequest<UserOut>('/api/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getUser(userId: string): Promise<UserOut> {
  return apiRequest<UserOut>(`/api/users/${userId}`)
}

export function getProfileOptions(): Promise<ProfileOptionsOut> {
  return apiRequest<ProfileOptionsOut>('/api/users/options')
}

export function updateUser(userId: string, payload: UserUpdatePayload): Promise<UserOut> {
  return apiRequest<UserOut>(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function findUserByChatId(chatId: string): Promise<UserOut | null> {
  const users = await listUsers(100, 0)
  return users.find((user) => user.chat_id === chatId) ?? null
}
