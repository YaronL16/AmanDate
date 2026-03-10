import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import type { MockAuthUser } from '../mocks/users'
import { ApiError } from '../lib/api/client'
import { getDiscoveryCandidates } from '../lib/api/discovery'
import { postSwipe } from '../lib/api/swipes'
import { createUser, findUserByChatId } from '../lib/api/users'
import type { MatchOut, SwipeDirection, UserCard } from '../lib/api/types'

const PAGE_SIZE = 20
const SWIPE_THRESHOLD = 120
const CELEBRATION_EMOJIS = ['🎉', '💖', '✨', '🥳', '💘']

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
  const [photoIndex, setPhotoIndex] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeMatch, setActiveMatch] = useState<MatchOut | null>(null)
  const [isSwiping, setIsSwiping] = useState(false)
  const [hasExhausted, setHasExhausted] = useState(false)

  const topCard = cards[0] ?? null
  const nextCard = cards[1] ?? null
  const hasUser = Boolean(activeUser)
  const topPhotos = topCard?.photo_urls ?? []
  const activePhotoUrl = topPhotos[photoIndex] ?? null

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
            photo_urls: [],
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

  useEffect(() => {
    setPhotoIndex(0)
    setIsExpanded(false)
  }, [topCard?.id])

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
          <div className={`relative mx-auto w-full max-w-md ${isExpanded ? '' : 'h-[420px]'}`}>
            {nextCard && !isExpanded ? (
              <div className="absolute inset-x-4 top-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-6 opacity-65">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Up next
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{getFirstName(nextCard.name)}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {nextCard.age && nextCard.region
                    ? `${nextCard.age} - ${nextCard.region}`
                    : nextCard.region ?? nextCard.department ?? 'No additional details'}
                </p>
              </div>
            ) : null}

            <motion.div
              className={`relative cursor-grab rounded-2xl border border-[var(--border-soft)] p-6 shadow-[0_16px_34px_rgba(16,49,54,0.18)] active:cursor-grabbing ${isExpanded ? '' : 'h-[420px]'}`}
              style={{
                backgroundColor: 'color-mix(in oklab, var(--surface-panel) 82%, transparent)',
              }}
              layout
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
              <div className="relative mt-2 h-80 overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)]">
                {activePhotoUrl ? (
                  <img
                    src={activePhotoUrl}
                    alt={`${topCard.name} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[var(--text-secondary)]">
                    No photo available
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/65 to-transparent px-3 pb-3 pt-10">
                  {!isExpanded ? (
                    <div className="text-white">
                      <p className="text-lg font-semibold tracking-tight">{getFirstName(topCard.name)}</p>
                      <p className="text-xs text-white/85">
                        {topCard.age && topCard.region
                          ? `${topCard.age} - ${topCard.region}`
                          : topCard.region ?? 'Profile details available'}
                      </p>
                    </div>
                  ) : (
                    <div />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsExpanded((current) => !current)}
                    aria-label={isExpanded ? 'Collapse profile details' : 'Expand profile details'}
                    title={isExpanded ? 'Collapse profile details' : 'Expand profile details'}
                    className="rounded-full bg-white/20 px-2.5 py-1.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/30"
                  >
                    {isExpanded ? '▾' : '⤢'}
                  </button>
                </div>

                {topPhotos.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setPhotoIndex((current) => (current - 1 + topPhotos.length) % topPhotos.length)
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-sm font-semibold text-white transition hover:bg-black/60"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setPhotoIndex((current) => (current + 1) % topPhotos.length)
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-sm font-semibold text-white transition hover:bg-black/60"
                    >
                      ›
                    </button>
                    <p className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold text-white">
                      {photoIndex + 1}/{topPhotos.length}
                    </p>
                  </>
                ) : null}
              </div>

              {isExpanded ? (
                <div className="mt-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-3 text-sm text-[var(--text-secondary)]">
                  <p className="font-semibold text-[var(--text-primary)]">{getFirstName(topCard.name)}</p>
                  {topCard.bio ? <p className="mt-2">{topCard.bio}</p> : <p className="mt-2">No bio provided.</p>}
                  <p className="mt-2">
                    {topCard.age ? `Age: ${topCard.age}` : 'Age not provided'}
                    {topCard.region ? ` | Region: ${topCard.region}` : ''}
                  </p>
                  <p className="mt-1">
                    {topCard.favorite_genres?.length
                      ? `Favorite genres: ${topCard.favorite_genres.join(', ')}`
                      : 'Favorite genres not provided'}
                  </p>
                </div>
              ) : null}
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

      <AnimatePresence>
        {activeMatch ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <motion.div
              className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-8 shadow-[0_24px_60px_rgba(16,49,54,0.28)]"
              initial={{ opacity: 0, scale: 0.88, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            >
              {CELEBRATION_EMOJIS.map((emoji, index) => (
                <motion.span
                  key={`${emoji}-${index}`}
                  className="pointer-events-none absolute text-xl"
                  style={{
                    left: `${14 + index * 16}%`,
                    top: `${8 + (index % 2) * 10}%`,
                  }}
                  initial={{ opacity: 0, y: 6, scale: 0.7 }}
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: [8, -4, -14, -22],
                    scale: [0.7, 1, 1.08, 0.95],
                    rotate: [0, -10, 8, 0],
                  }}
                  transition={{
                    duration: 2.2,
                    delay: index * 0.12,
                    repeat: Number.POSITIVE_INFINITY,
                    repeatDelay: 0.55,
                    ease: 'easeOut',
                  }}
                >
                  {emoji}
                </motion.span>
              ))}

              <motion.p
                className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]"
                animate={{ scale: [1, 1.04, 1] }}
                transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              >
                It&apos;s a Match!
              </motion.p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight">
                You and {activeMatch.other_user.name} liked each other
              </h3>
              <p className="mt-3 text-base text-[var(--text-secondary)]">
                Start the conversation now using your configured chat app deep link.
              </p>
              <div className="mt-7 flex items-center justify-end gap-2">
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
                    onClick={() => setActiveMatch(null)}
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
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}
