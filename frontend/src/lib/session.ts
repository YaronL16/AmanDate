const SESSION_USER_KEY = 'amandate.auth_user_id'

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_USER_KEY)
}

export function setSessionUserId(userId: string): void {
  localStorage.setItem(SESSION_USER_KEY, userId)
}

export function clearSessionUserId(): void {
  localStorage.removeItem(SESSION_USER_KEY)
}
