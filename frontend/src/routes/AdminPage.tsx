import { useEffect, useMemo, useState } from 'react'

import type { MockAuthUser } from '../mocks/users'
import { ApiError } from '../lib/api/client'
import { getAdminMatches, getAdminSwipes, getAdminUsers } from '../lib/api/admin'
import type { AdminMatchOut, AdminSwipeOut, UserOut } from '../lib/api/types'

function isEnabled(value: string | undefined): boolean {
  if (!value) return false
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function getApiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Unexpected error. Please try again.'
  }
  if (error.status === 403) {
    return 'Admin access denied or admin view is disabled.'
  }
  return `Request failed (${error.status}). Please retry.`
}

export function AdminPage({ activeUser }: { activeUser: MockAuthUser | null }) {
  const adminViewEnabled = isEnabled(import.meta.env.VITE_ENABLE_ADMIN_VIEW)
  const configuredAdminUserId = (import.meta.env.VITE_ADMIN_USER_ID ?? '').trim()
  const [users, setUsers] = useState<UserOut[]>([])
  const [swipes, setSwipes] = useState<AdminSwipeOut[]>([])
  const [matches, setMatches] = useState<AdminMatchOut[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAuthorizedUser = useMemo(() => {
    if (!activeUser || !configuredAdminUserId) return false
    return activeUser.user_id === configuredAdminUserId
  }, [activeUser, configuredAdminUserId])

  useEffect(() => {
    if (!adminViewEnabled || !activeUser || !isAuthorizedUser) {
      return
    }

    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)

    Promise.all([
      getAdminUsers(activeUser.user_id),
      getAdminSwipes(activeUser.user_id),
      getAdminMatches(activeUser.user_id),
    ])
      .then(([usersData, swipesData, matchesData]) => {
        if (cancelled) return
        setUsers(usersData)
        setSwipes(swipesData)
        setMatches(matchesData)
      })
      .catch((fetchError) => {
        if (cancelled) return
        setError(getApiErrorMessage(fetchError))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeUser, adminViewEnabled, isAuthorizedUser])

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
      <h2 className="text-2xl font-semibold tracking-tight">Admin Debug</h2>

      {!adminViewEnabled ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Admin view is disabled by environment configuration.
        </p>
      ) : null}

      {adminViewEnabled && !activeUser ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Login with the configured admin user to access debug data.
        </p>
      ) : null}

      {adminViewEnabled && activeUser && !isAuthorizedUser ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          This account is not authorized for admin access.
        </p>
      ) : null}

      {adminViewEnabled && activeUser && isAuthorizedUser && loading ? (
        <p className="mt-3 text-sm text-[var(--text-secondary)]">Loading admin data...</p>
      ) : null}

      {adminViewEnabled && activeUser && isAuthorizedUser && error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {adminViewEnabled && activeUser && isAuthorizedUser && !loading && !error ? (
        <div className="mt-5 grid gap-5">
          <article className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-4">
            <h3 className="text-lg font-semibold">Users ({users.length})</h3>
            <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
              {users.slice(0, 20).map((user) => (
                <li key={user.id}>
                  {user.name} - {user.chat_id} - {user.is_active ? 'active' : 'inactive'}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-4">
            <h3 className="text-lg font-semibold">Swipes ({swipes.length})</h3>
            <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
              {swipes.slice(0, 30).map((swipe) => (
                <li key={swipe.id}>
                  {swipe.swiper_id} - {swipe.direction} - {swipe.swiped_id}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-4">
            <h3 className="text-lg font-semibold">Matches ({matches.length})</h3>
            <ul className="mt-2 space-y-1 text-sm text-[var(--text-secondary)]">
              {matches.slice(0, 30).map((match) => (
                <li key={match.id}>
                  {match.user1_id} - {match.user2_id}
                </li>
              ))}
            </ul>
          </article>
        </div>
      ) : null}
    </section>
  )
}
