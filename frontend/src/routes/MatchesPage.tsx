import { useEffect, useState } from 'react'

import type { MockAuthUser } from '../mocks/users'
import { ApiError } from '../lib/api/client'
import { getMatches } from '../lib/api/matches'
import type { MatchOut } from '../lib/api/types'
import { findUserByChatId } from '../lib/api/users'

function getApiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Unexpected error. Please try again.'
  }

  if (error.status === 404) {
    return 'Current user was not found. Please create your profile first.'
  }

  return `Request failed (${error.status}). Please retry.`
}

export function MatchesPage({ activeUser }: { activeUser: MockAuthUser | null }) {
  const [matches, setMatches] = useState<MatchOut[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeUser) {
      return
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError(null)

    findUserByChatId(activeUser.chat_id)
      .then(async (user) => {
        if (!user) {
          setMatches([])
          setLoading(false)
          setError('Current user was not found. Please create your profile first.')
          return
        }
        const result = await getMatches(user.id)
        setMatches(result)
      })
      .catch((loadError) => {
        setError(getApiErrorMessage(loadError))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [activeUser])

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--accent-primary)]" />
        <h2 className="text-2xl font-semibold tracking-tight">Matches</h2>
      </div>

      {!activeUser ? (
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Login with a test user id to view your matches.
        </p>
      ) : null}

      {activeUser && loading ? (
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Loading matches...</p>
      ) : null}

      {activeUser && error ? (
        <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {activeUser && !loading && !error && matches.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          No matches yet. Keep swiping to find your next connection.
        </p>
      ) : null}

      {activeUser && !loading && !error && matches.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {matches.map((match) => (
            // First photo in the array is used as preview.
            // TODO: consider gallery preview here in future iterations.
            <li
              key={match.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-4"
            >
              <div className="flex min-w-0 items-center gap-3">
                {match.other_user.photo_urls?.[0] ? (
                  <img
                    src={match.other_user.photo_urls[0]}
                    alt={`${match.other_user.name} profile`}
                    className="h-12 w-12 rounded-full border border-[var(--border-soft)] object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-[var(--border-soft)] text-xs text-[var(--text-secondary)]">
                    N/A
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {match.other_user.name}
                  </p>
                  <p className="truncate text-xs text-[var(--text-secondary)]">
                    {match.other_user.department ?? 'No department provided'}
                  </p>
                </div>
              </div>
              {match.chat_thread_url ? (
                <a
                  href={match.chat_thread_url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--accent-primary-strong)]"
                >
                  Open chat
                </a>
              ) : (
                <span className="shrink-0 text-xs text-[var(--text-secondary)]">Chat unavailable</span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
