import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

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

function useApiErrorMessage() {
  const { t } = useTranslation()
  return useCallback((error: unknown): string => {
    if (!(error instanceof ApiError)) {
      return t('swipe.errorUnexpected')
    }
    if (error.status === 404) {
      return t('swipe.errorUserNotFound')
    }
    if (error.status === 400) {
      return t('swipe.errorInvalidSwipe')
    }
    if (error.status === 422) {
      return t('swipe.errorInvalidData')
    }
    return t('swipe.errorRequest', { status: error.status })
  }, [t])
}

export function SwipePage({ activeUser }: { activeUser: MockAuthUser | null }) {
  const { t } = useTranslation()
  const getApiErrorMessage = useApiErrorMessage()
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
    [backendUserId, getApiErrorMessage],
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
        setError(t('swipe.errorResolveUser'))
      })
  }, [activeUser, t])

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
    [backendUserId, getApiErrorMessage, isSwiping, topCard],
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
    if (loading) return t('swipe.loading')
    if (!cards.length) return t('swipe.noCandidates')
    return t('swipe.candidatesInQueue', { count: cards.length })
  }, [cards.length, loading, t])

  if (!hasUser) {
    return (
      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
        <h2 className="text-2xl font-semibold tracking-tight">{t('swipe.title')}</h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          {t('swipe.loginPrompt')}
        </p>
      </section>
    )
  }

  if (hasUser && !loading && backendUserId && !isEnabled) {
    return (
      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
        <h2 className="text-2xl font-semibold tracking-tight">{t('swipe.title')}</h2>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          {t('swipe.accountNotActivated')}
        </p>
        <Link
          to="/profile"
          className="mt-4 inline-flex rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-strong)]"
        >
          {t('swipe.goToProfile')}
        </Link>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('swipe.title')}</h2>
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
            {t('swipe.retry')}
          </button>
        </div>
      )}

      {loading ? (
        <div className="h-[420px] rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-6">
          <p className="text-sm text-[var(--text-secondary)]">{t('swipe.loadingCandidates')}</p>
        </div>
      ) : topCard ? (
        <div>
          <div className={`relative mx-auto w-full max-w-md ${isExpanded ? '' : 'h-[420px]'}`}>
            {nextCard && !isExpanded ? (
              <div className="absolute inset-x-4 top-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-6 opacity-65">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  {t('swipe.upNext')}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{getFirstName(nextCard.name)}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {nextCard.age && nextCard.region
                    ? <><span dir="ltr">{nextCard.age}</span> - {t(`options.regions.${nextCard.region}`, nextCard.region)}</>
                    : nextCard.region ? t(`options.regions.${nextCard.region}`, nextCard.region) : nextCard.department ?? t('swipe.noAdditionalDetails')}
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
                    {t('swipe.noPhotoAvailable')}
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/65 to-transparent px-3 pb-3 pt-10">
                  {!isExpanded ? (
                    <div className="text-white">
                      <p className="text-lg font-semibold tracking-tight">{getFirstName(topCard.name)}</p>
                      <p className="text-xs text-white/85">
                        {topCard.age && topCard.region
                          ? <><span dir="ltr">{topCard.age}</span> - {t(`options.regions.${topCard.region}`, topCard.region)}</>
                          : topCard.region ? t(`options.regions.${topCard.region}`, topCard.region) : t('swipe.profileDetailsAvailable')}
                      </p>
                    </div>
                  ) : (
                    <div />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsExpanded((current) => !current)}
                    aria-label={isExpanded ? t('swipe.collapseProfile') : t('swipe.expandProfile')}
                    title={isExpanded ? t('swipe.collapseProfile') : t('swipe.expandProfile')}
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
                      className="absolute top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-sm font-semibold text-white transition hover:bg-black/60 ltr:left-2 rtl:right-2"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setPhotoIndex((current) => (current + 1) % topPhotos.length)
                      }}
                      className="absolute top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-2 py-1 text-sm font-semibold text-white transition hover:bg-black/60 ltr:right-2 rtl:left-2"
                    >
                      ›
                    </button>
                    <p className="absolute top-2 rounded-full bg-black/45 px-2 py-1 text-[10px] font-semibold text-white ltr:right-2 rtl:left-2">
                      <span dir="ltr">{photoIndex + 1}/{topPhotos.length}</span>
                    </p>
                  </>
                ) : null}
              </div>

              {isExpanded ? (
                <div className="mt-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-3 text-sm text-[var(--text-secondary)]">
                  <p className="font-semibold text-[var(--text-primary)]">{getFirstName(topCard.name)}</p>
                  {topCard.bio ? <p className="mt-2">{topCard.bio}</p> : <p className="mt-2">{t('swipe.noBioProvided')}</p>}
                  <p className="mt-2">
                    {topCard.age ? <><span>{t('swipe.ageLabel', { age: '' })}</span><span dir="ltr">{topCard.age}</span></> : t('swipe.ageNotProvided')}
                    {topCard.region ? ` | ${t('swipe.regionLabel', { region: t(`options.regions.${topCard.region}`, topCard.region) })}` : ''}
                  </p>
                  <p className="mt-1">
                    {topCard.favorite_genres?.length
                      ? t('swipe.favoriteGenresLabel', { genres: topCard.favorite_genres.map((g) => t(`options.genres.${g}`, g)).join(', ') })
                      : t('swipe.favoriteGenresNotProvided')}
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
              {t('swipe.pass')}
            </button>
            <button
              type="button"
              onClick={() => void submitSwipe('right')}
              disabled={isSwiping}
              className="rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-strong)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {t('swipe.like')}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-8 text-center">
          <h3 className="text-lg font-semibold">{t('swipe.allCaughtUp')}</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {t('swipe.allCaughtUpHint')}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)]"
          >
            {t('swipe.refreshCandidates')}
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
                {t('swipe.itsAMatch')}
              </motion.p>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight">
                {t('swipe.youAndLiked', { name: activeMatch.other_user.name })}
              </h3>
              <p className="mt-3 text-base text-[var(--text-secondary)]">
                {t('swipe.startConversation')}
              </p>
              <div className="mt-7 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveMatch(null)}
                  className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)]"
                >
                  {t('swipe.maybeLater')}
                </button>
                {activeMatch.chat_thread_url ? (
                  <a
                    href={activeMatch.chat_thread_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setActiveMatch(null)}
                    className="rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-strong)]"
                  >
                    {t('swipe.openChat')}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveMatch(null)}
                    className="rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-strong)]"
                  >
                    {t('swipe.close')}
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
