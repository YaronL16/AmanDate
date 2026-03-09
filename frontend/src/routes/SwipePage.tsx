import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import type { MockAuthUser } from '../mocks/users'
import { ApiError } from '../lib/api/client'
import { getDiscoveryCandidates } from '../lib/api/discovery'
import { postSwipe } from '../lib/api/swipes'
import { createUser, findUserByChatId } from '../lib/api/users'
import type { MatchOut, SwipeDirection, UserCard } from '../lib/api/types'

const PAGE_SIZE = 20
const SWIPE_THRESHOLD = 120

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim()
  if (!trimmed) return fullName
  return trimmed.split(/\s+/)[0] ?? fullName
}

function getApiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Unexpected error. Please try again.'
  }

  if (error.status === 404) {
    return 'Current user was not found. Please create your profile first.'
  }

  if (error.status === 400) {
    return 'Swipe request is invalid for this profile.'
  }

  if (error.status === 422) {
    return 'Invalid swipe data was sent. Please refresh and try again.'
  }

  return `Request failed (${error.status}). Please retry.`
}

export function SwipePage({ activeUser }: { activeUser: MockAuthUser | null }) {
  const [backendUserId, setBackendUserId] = useState<string | null>(null)
  const [isEnabled, setIsEnabled] = useState(false)
  const [cards, setCards] = useState<UserCard[]>([])
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMatch, setActiveMatch] = useState<MatchOut | null>(null)
  const [isSwiping, setIsSwiping] = useState(false)
  const [hasExhausted, setHasExhausted] = useState(false)

  const topCard = cards[0] ?? null
  const nextCard = cards[1] ?? null
  const hasUser = Boolean(activeUser)

  const fetchCandidates = useCallback(
    async (requestedOffset: number, reset: boolean) => {
      if (!backendUserId) return

      try {
        const result = await getDiscoveryCandidates(backendUserId, PAGE_SIZE, requestedOffset)
        setError(null)
        setHasExhausted(result.length < PAGE_SIZE)
        setOffset(requestedOffset + result.length)

        setCards((prev) => (reset ? result : [...prev, ...result]))
      } catch (fetchError) {
        setError(getApiErrorMessage(fetchError))
      } finally {
        setLoading(false)
      }
    },
    [backendUserId],
  )

  useEffect(() => {
    if (!activeUser) {
      setBackendUserId(null)
      setCards([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setActiveMatch(null)

    findUserByChatId(activeUser.chat_id)
      .then((user) => {
        if (!user) {
          return createUser({
            name: activeUser.name,
            department: activeUser.department,
            gender: activeUser.gender,
            chat_id: activeUser.chat_id,
            bio: null,
            photo_url: null,
            is_active: false,
          })
        }
        return user
      })
      .then((user) => {
        if (!user) return
        setBackendUserId(user.id)
        setIsEnabled(user.is_active)
        if (!user.is_active) {
          setCards([])
          setLoading(false)
        }
      })
      .catch(() => {
        setLoading(false)
        setError('Failed to resolve current user. Please retry.')
      })
  }, [activeUser])

  useEffect(() => {
    if (!backendUserId || !isEnabled) return
    setLoading(true)
    void fetchCandidates(0, true)
  }, [backendUserId, fetchCandidates, isEnabled])

  const maybeBackfill = useCallback(async () => {
    if (!backendUserId || !isEnabled || hasExhausted || cards.length > 3) {
      return
    }
    await fetchCandidates(offset, false)
  }, [backendUserId, cards.length, fetchCandidates, hasExhausted, isEnabled, offset])

  const submitSwipe = useCallback(
    async (direction: SwipeDirection) => {
      if (!backendUserId || !topCard || isSwiping) {
        return
      }

      setIsSwiping(true)
      setError(null)

      try {
        const result = await postSwipe({
          swiper_id: backendUserId,
          swiped_id: topCard.id,
          direction,
        })

        setCards((prev) => prev.slice(1))

        if (result.matched && result.match) {
          setActiveMatch(result.match)
        }
      } catch (swipeError) {
        setError(getApiErrorMessage(swipeError))
      } finally {
        setIsSwiping(false)
      }
    },
    [backendUserId, isSwiping, topCard],
  )

  useEffect(() => {
    void maybeBackfill()
  }, [cards.length, maybeBackfill])

  const onRetry = () => {
    if (!backendUserId) return
    setLoading(true)
    void fetchCandidates(0, true)
  }

  const cardCounterLabel = useMemo(() => {
    if (loading) return 'Loading...'
    if (!cards.length) return 'No candidates'
    return `${cards.length} candidate${cards.length > 1 ? 's' : ''} in queue`
  }, [cards.length, loading])

  if (!hasUser) {
    return (
      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
        <h2 className="text-2xl font-semibold tracking-tight">Swipe</h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Login with a test user id to start swiping.
        </p>
      </section>
    )
  }

  if (hasUser && !loading && backendUserId && !isEnabled) {
    return (
      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
        <h2 className="text-2xl font-semibold tracking-tight">Swipe</h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Your account is not activated yet. Activate it in profile to start swiping and appear in discovery.
        </p>
        <Link
          to="/profile"
          className="mt-4 inline-flex rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-strong)]"
        >
          Go to Profile
        </Link>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Swipe</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{cardCounterLabel}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="h-[420px] rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-6">
          <p className="text-sm text-[var(--text-secondary)]">Loading discovery candidates...</p>
        </div>
      ) : topCard ? (
        <div>
          <div className="relative mx-auto h-[420px] w-full max-w-md">
            {nextCard && (
              <div className="absolute inset-x-4 top-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-6 opacity-65">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Up next
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                  {getFirstName(nextCard.name)}
                </h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {nextCard.department ?? 'No department provided'}
                </p>
              </div>
            )}

            <motion.div
              className="absolute inset-0 cursor-grab rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6 shadow-[0_16px_34px_rgba(16,49,54,0.18)] active:cursor-grabbing"
              drag="x"
              dragElastic={0.95}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (isSwiping) return
                if (info.offset.x > SWIPE_THRESHOLD) {
                  void submitSwipe('right')
                } else if (info.offset.x < -SWIPE_THRESHOLD) {
                  void submitSwipe('left')
                }
              }}
              whileDrag={{ rotate: 6 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Candidate profile
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                {getFirstName(topCard.name)}
              </h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {topCard.department ?? 'No department provided'}
              </p>

              {topCard.photo_url ? (
                <img
                  src={topCard.photo_url}
                  alt={`${topCard.name} profile`}
                  className="mt-4 h-56 w-full rounded-xl border border-[var(--border-soft)] object-cover"
                />
              ) : (
                <div className="mt-4 flex h-56 items-center justify-center rounded-xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-panel-soft)] text-sm text-[var(--text-secondary)]">
                  No photo available
                </div>
              )}
            </motion.div>
          </div>

          <div className="mx-auto mt-5 flex w-full max-w-md items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void submitSwipe('left')}
              disabled={isSwiping}
              className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Pass
            </button>
            <button
              type="button"
              onClick={() => void submitSwipe('right')}
              disabled={isSwiping}
              className="rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-strong)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Like
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-8 text-center">
          <h3 className="text-lg font-semibold">You are all caught up</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            No more candidates right now. Check back later for new profiles.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)]"
          >
            Refresh candidates
          </button>
        </div>
      )}

      {activeMatch ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6 shadow-[0_24px_60px_rgba(16,49,54,0.28)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
              It&apos;s a Match!
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight">
              You and {activeMatch.other_user.name} liked each other
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Start the conversation now using your configured chat app deep link.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveMatch(null)}
                className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)]"
              >
                Maybe later
              </button>
              {activeMatch.chat_thread_url ? (
                <a
                  href={activeMatch.chat_thread_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-strong)]"
                >
                  Open chat
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveMatch(null)}
                  className="rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-strong)]"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
