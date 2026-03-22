import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import type { MockAuthUser } from '../mocks/users'
import { ApiError } from '../lib/api/client'
import { createUser, findUserByChatId, getProfileOptions, updateUser } from '../lib/api/users'
import type { ApiValidationError, UserCreatePayload, UserOut } from '../lib/api/types'

type DiscoveryGender = 'male' | 'female'
const AGE_RANGE_MIN = 18
const AGE_RANGE_MAX = 80

type FormState = {
  bio: string
  photo_urls: string[]
  age: number | null
  favorite_genres: string[]
  region: string | null
  preferred_age_min: number | null
  preferred_age_max: number | null
  preferred_regions: string[]
  preferred_genders: DiscoveryGender[]
  is_active: boolean
}

const emptyForm: FormState = {
  bio: '',
  photo_urls: [''],
  age: null,
  favorite_genres: [],
  region: null,
  preferred_age_min: null,
  preferred_age_max: null,
  preferred_regions: [],
  preferred_genders: [],
  is_active: false,
}

function toCreatePayload(form: FormState, identity: MockAuthUser): UserCreatePayload {
  const isAnyDesiredAge =
    form.preferred_age_min === AGE_RANGE_MIN && form.preferred_age_max === AGE_RANGE_MAX

  return {
    name: identity.name,
    bio: form.bio.trim() || null,
    photo_urls: form.photo_urls.map((url) => url.trim()).filter(Boolean),
    department: identity.department,
    gender: identity.gender,
    age: form.age,
    favorite_genres: form.favorite_genres.length ? form.favorite_genres : null,
    region: form.region,
    preferred_age_min: isAnyDesiredAge ? null : form.preferred_age_min,
    preferred_age_max: isAnyDesiredAge ? null : form.preferred_age_max,
    preferred_regions: form.preferred_regions.length ? form.preferred_regions : null,
    preferred_genders: form.preferred_genders.length ? form.preferred_genders : null,
    chat_id: identity.chat_id,
    is_active: form.is_active,
  }
}

function fromUser(user: UserOut): FormState {
  return {
    bio: user.bio ?? '',
    photo_urls: user.photo_urls?.length ? user.photo_urls : [''],
    age: user.age ?? null,
    favorite_genres: user.favorite_genres ?? [],
    region: user.region ?? null,
    preferred_age_min: user.preferred_age_min ?? null,
    preferred_age_max: user.preferred_age_max ?? null,
    preferred_regions: user.preferred_regions ?? [],
    preferred_genders: user.preferred_genders ?? [],
    is_active: user.is_active,
  }
}

function getApiErrorMessage(
  error: unknown,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (!(error instanceof ApiError)) {
    return t('profile.errorUnexpected')
  }

  if (error.status === 409) {
    return t('profile.errorChatIdConflict')
  }

  if (error.status === 422) {
    const body = error.body as ApiValidationError
    if (Array.isArray(body?.detail) && body.detail.length > 0) {
      return body.detail.map((item) => item.msg).join('; ')
    }
    return t('profile.errorValidation')
  }

  return t('profile.errorRequest', { status: error.status })
}

export function ProfilePage({ activeUser }: { activeUser: MockAuthUser | null }) {
  const { t } = useTranslation('common')
  const [backendUserId, setBackendUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'photos' | 'user-info'>('profile')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [persistedIsActive, setPersistedIsActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [musicGenres, setMusicGenres] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [discoveryGenders, setDiscoveryGenders] = useState<DiscoveryGender[]>([])
  const [showRequiredHints, setShowRequiredHints] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const firstName = activeUser?.name.trim().split(/\s+/)[0] ?? ''
  const desiredAgeMin = form.preferred_age_min ?? AGE_RANGE_MIN
  const desiredAgeMax = form.preferred_age_max ?? AGE_RANGE_MAX
  const desiredAgeMinPercent =
    ((desiredAgeMin - AGE_RANGE_MIN) / (AGE_RANGE_MAX - AGE_RANGE_MIN)) * 100
  const desiredAgeMaxPercent =
    ((desiredAgeMax - AGE_RANGE_MIN) / (AGE_RANGE_MAX - AGE_RANGE_MIN)) * 100
  const desiredAgeLabel =
    form.preferred_age_min === null && form.preferred_age_max === null
      ? t('profile.anyAge')
      : `${desiredAgeMin} - ${desiredAgeMax}`
  const desiredAgeBubbleCenterPercent = (desiredAgeMinPercent + desiredAgeMaxPercent) / 2

  useEffect(() => {
    if (!activeUser) {
      setBackendUserId(null)
      setForm(emptyForm)
      setPersistedIsActive(false)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setSuccess(null)

    findUserByChatId(activeUser.chat_id)
      .then((user) => {
        if (cancelled) return
        if (!user) {
          setBackendUserId(null)
          setForm(emptyForm)
          setPersistedIsActive(false)
          return
        }
        setBackendUserId(user.id)
        setForm(fromUser(user))
        setPersistedIsActive(user.is_active)
      })
      .catch(() => {
        if (cancelled) return
        setError(t('profile.errorLoadProfile'))
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeUser])

  useEffect(() => {
    if (!activeUser) {
      setOptionsLoading(false)
      setOptionsError(null)
      setMusicGenres([])
      setRegions([])
      setDiscoveryGenders([])
      return
    }

    let cancelled = false
    setOptionsLoading(true)
    setOptionsError(null)

    getProfileOptions()
      .then((options) => {
        if (cancelled) return
        setMusicGenres(options.music_genres)
        setRegions(options.israel_regions)
        setDiscoveryGenders(options.discovery_genders)
      })
      .catch(() => {
        if (cancelled) return
        setOptionsError(t('profile.errorLoadOptions'))
      })
      .finally(() => {
        if (cancelled) return
        setOptionsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeUser])

  const toggleGenre = (genre: string) => {
    setForm((current) => {
      if (current.favorite_genres.includes(genre)) {
        return {
          ...current,
          favorite_genres: current.favorite_genres.filter((item) => item !== genre),
        }
      }
      if (current.favorite_genres.length >= 3) {
        return current
      }
      return {
        ...current,
        favorite_genres: [...current.favorite_genres, genre],
      }
    })
  }

  const togglePreferredRegion = (region: string) => {
    setForm((current) => {
      if (current.preferred_regions.includes(region)) {
        return {
          ...current,
          preferred_regions: current.preferred_regions.filter((item) => item !== region),
        }
      }
      return {
        ...current,
        preferred_regions: [...current.preferred_regions, region],
      }
    })
  }

  const togglePreferredGender = (gender: DiscoveryGender) => {
    setForm((current) => {
      if (current.preferred_genders.includes(gender)) {
        return {
          ...current,
          preferred_genders: current.preferred_genders.filter((item) => item !== gender),
        }
      }
      return {
        ...current,
        preferred_genders: [...current.preferred_genders, gender],
      }
    })
  }

  const setDesiredAgeMin = (nextMin: number) => {
    setForm((current) => {
      const currentMax = current.preferred_age_max ?? AGE_RANGE_MAX
      return {
        ...current,
        preferred_age_min: nextMin,
        preferred_age_max: Math.max(nextMin, currentMax),
      }
    })
  }

  const setDesiredAgeMax = (nextMax: number) => {
    setForm((current) => {
      const currentMin = current.preferred_age_min ?? AGE_RANGE_MIN
      return {
        ...current,
        preferred_age_min: Math.min(currentMin, nextMax),
        preferred_age_max: nextMax,
      }
    })
  }

  const setPhotoAt = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      photo_urls: current.photo_urls.map((url, i) => (i === index ? value : url)),
    }))
  }

  const addPhotoField = () => {
    setForm((current) => {
      if (current.photo_urls.length >= 5) return current
      return { ...current, photo_urls: [...current.photo_urls, ''] }
    })
  }

  const removePhotoField = (index: number) => {
    setForm((current) => {
      const updated = current.photo_urls.filter((_, i) => i !== index)
      return { ...current, photo_urls: updated.length ? updated : [''] }
    })
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeUser) {
      setError(t('profile.errorLoginFirst'))
      return
    }

    setError(null)
    setSuccess(null)
    setShowRequiredHints(true)

    if (form.age === null || !form.region) {
      setError(t('profile.errorAgeRegion'))
      return
    }
    if (
      form.preferred_age_min !== null &&
      form.preferred_age_max !== null &&
      form.preferred_age_min > form.preferred_age_max
    ) {
      setError(t('profile.errorAgeRange'))
      return
    }
    setShowRequiredHints(false)

    const enablingNow = !persistedIsActive && form.is_active
    if (enablingNow) {
      const confirmed = window.confirm(t('profile.activateConfirm'))
      if (!confirmed) {
        return
      }
    }

    setSaving(true)

    try {
      const user = backendUserId
        ? await updateUser(backendUserId, {
          // Keep 18-120 as unrestricted age preference in backend.
          preferred_age_min:
            form.preferred_age_min === AGE_RANGE_MIN && form.preferred_age_max === AGE_RANGE_MAX
              ? null
              : form.preferred_age_min,
          preferred_age_max:
            form.preferred_age_min === AGE_RANGE_MIN && form.preferred_age_max === AGE_RANGE_MAX
              ? null
              : form.preferred_age_max,
          bio: form.bio.trim() || null,
          photo_urls: form.photo_urls.map((url) => url.trim()).filter(Boolean),
          age: form.age,
          favorite_genres: form.favorite_genres.length ? form.favorite_genres : null,
          region: form.region,
          preferred_regions: form.preferred_regions.length ? form.preferred_regions : null,
          preferred_genders: form.preferred_genders.length ? form.preferred_genders : null,
          is_active: form.is_active,
        })
        : await createUser(toCreatePayload(form, activeUser))

      setBackendUserId(user.id)
      setForm(fromUser(user))
      setPersistedIsActive(user.is_active)
      setSuccess(backendUserId ? t('profile.profileUpdated') : t('profile.profileCreated'))
    } catch (submitError) {
      setError(getApiErrorMessage(submitError, t))
    } finally {
      setSaving(false)
    }
  }

  if (!activeUser) {
    return (
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
        <h2 className="text-2xl font-semibold tracking-tight">{t('profile.title')}</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t('profile.loginPrompt')}
        </p>
      </section>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6 shadow-[0_10px_30px_rgba(23,80,88,0.08)]">
        <p className="text-sm text-[var(--text-secondary)]">{t('profile.loadingProfile')}</p>
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{firstName}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {backendUserId ? t('profile.editingSaved') : t('profile.newSetup')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${persistedIsActive
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-800'}`}
          >
            {persistedIsActive ? t('profile.activated') : t('profile.notActivated')}
          </span>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-primary-strong)]">
            {t('profile.identityTestDataset')}
          </span>
        </div>
      </div>

      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        {t('profile.createOrUpdate')}
      </p>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      )}
      {optionsError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {optionsError}
        </p>
      )}

      <form className="space-y-5" onSubmit={onSubmit}>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === 'profile'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'bg-[var(--surface-panel-soft)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('profile.tabProfile')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('photos')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === 'photos'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'bg-[var(--surface-panel-soft)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('profile.tabPhotos')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preferences')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === 'preferences'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'bg-[var(--surface-panel-soft)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('profile.tabPreferences')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('user-info')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === 'user-info'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'bg-[var(--surface-panel-soft)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t('profile.tabMyAccount')}
          </button>
        </div>

        {activeTab === 'profile' ? (
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-4">
            <h3 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
              {t('profile.profileInfo')}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {t('profile.editablePublicProfile')}
            </p>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[var(--accent-primary)]"
                    checked={form.is_active}
                    onChange={(e) => setForm((current) => ({ ...current, is_active: e.target.checked }))}
                    disabled={saving}
                  />
                  <span className="text-sm text-[var(--text-primary)]">
                    {t('profile.activateAccount')}
                  </span>
                </label>
              </div>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                  {t('profile.age')} <span className="text-red-600">*</span>
                </span>
                <input
                  type="number"
                  min={18}
                  max={80}
                  dir="ltr"
                  className={`w-full rounded-xl border bg-[var(--surface-panel)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/35 ${showRequiredHints && form.age === null ? 'border-red-300 ring-2 ring-red-200/70' : 'border-[var(--border-soft)]'}`}
                  value={form.age ?? ''}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      age: e.target.value === '' ? null : Number(e.target.value),
                    }))
                  }
                />
                {showRequiredHints && form.age === null ? (
                  <p className="mt-1 text-xs text-red-600">{t('profile.ageRequired')}</p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
                  {t('profile.region')} <span className="text-red-600">*</span>
                </span>
                <select
                  className={`w-full rounded-xl border bg-[var(--surface-panel)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/35 ${showRequiredHints && !form.region ? 'border-red-300 ring-2 ring-red-200/70' : 'border-[var(--border-soft)]'}`}
                  value={form.region ?? ''}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      region: e.target.value || null,
                    }))
                  }
                >
                  <option value="">{t('profile.selectRegion')}</option>
                  {regions.map((region) => (
                    <option key={region} value={region}>
                      {t(`options.regions.${region}`, region)}
                    </option>
                  ))}
                </select>
                {showRequiredHints && !form.region ? (
                  <p className="mt-1 text-xs text-red-600">{t('profile.regionRequired')}</p>
                ) : null}
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">{t('profile.bio')}</span>
                <textarea
                  className="min-h-28 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/35"
                  value={form.bio}
                  onChange={(e) => setForm((current) => ({ ...current, bio: e.target.value }))}
                />
              </label>

              <div>
                <p className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  {t('profile.favoriteGenres')}
                </p>
                {optionsLoading ? (
                  <p className="text-xs text-[var(--text-secondary)]">{t('profile.loadingGenres')}</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {musicGenres.map((genre) => {
                      const selected = form.favorite_genres.includes(genre)
                      const atLimit = form.favorite_genres.length >= 3 && !selected
                      return (
                        <label
                          key={genre}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                            selected
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                              : 'border-[var(--border-soft)] bg-[var(--surface-panel)]'
                          } ${atLimit ? 'opacity-55' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={atLimit}
                            onChange={() => toggleGenre(genre)}
                            className="h-4 w-4 accent-[var(--accent-primary)]"
                          />
                          <span>{t(`options.genres.${genre}`, genre)}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {t('profile.selectedCount', { count: form.favorite_genres.length })}
                </p>
              </div>
            </div>
          </div>
        ) : activeTab === 'photos' ? (
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-4">
            <h3 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">{t('profile.photos')}</h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {t('profile.photosHint')}
            </p>

            <div className="mt-4 space-y-3">
              {form.photo_urls.map((photoUrl, index) => (
                <div key={`photo-${index}`} className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-3">
                  <div className="flex items-center gap-2">
                    <input
                      className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/35"
                      placeholder={t('profile.photoPlaceholder', { index: index + 1 })}
                      value={photoUrl}
                      onChange={(e) => setPhotoAt(index, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removePhotoField(index)}
                      disabled={form.photo_urls.length === 1}
                      className="rounded-lg border border-[var(--border-soft)] px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {t('profile.remove')}
                    </button>
                  </div>
                  {photoUrl.trim() ? (
                    <img
                      src={photoUrl.trim()}
                      alt={t('profile.previewAlt', { index: index + 1 })}
                      className="mt-3 w-full rounded-xl border border-[var(--border-soft)] object-contain"
                    />
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                onClick={addPhotoField}
                disabled={form.photo_urls.length >= 5}
                className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {t('profile.addPhotoUrl', { count: form.photo_urls.length })}
              </button>
            </div>
          </div>
        ) : activeTab === 'preferences' ? (
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-4">
            <h3 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
              {t('profile.discoveryPreferences')}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {t('profile.preferencesHint')}
            </p>

            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-3" dir="ltr">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t('profile.desiredAgeRange')}</p>
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border-soft)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        preferred_age_min: null,
                        preferred_age_max: null,
                      }))
                    }
                  >
                    {t('profile.clear')}
                  </button>
                </div>
                <div className="mb-3 flex justify-center">
                  <span
                    className="relative inline-flex min-w-24 justify-center rounded-md bg-[var(--accent-primary)] px-3 py-1.5 text-sm font-semibold text-white"
                    style={{
                      left: `calc(${desiredAgeBubbleCenterPercent - 50}% * 0.2)`,
                    }}
                  >
                    {desiredAgeLabel}
                    <span className="absolute -bottom-2 h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-[var(--accent-primary)]" />
                  </span>
                </div>
                <div className="relative h-10">
                  <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--border-soft)] opacity-80" />
                  <div
                    className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--accent-primary)]"
                    style={{
                      left: `${desiredAgeMinPercent}%`,
                      right: `${100 - desiredAgeMaxPercent}%`,
                    }}
                  />
                  <input
                    type="range"
                    min={AGE_RANGE_MIN}
                    max={AGE_RANGE_MAX}
                    value={desiredAgeMin}
                    aria-label={t('profile.desiredMinAge')}
                    className="pointer-events-none absolute left-0 top-1/2 z-30 h-1 w-full -translate-y-1/2 appearance-none bg-transparent accent-[var(--accent-primary)] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--accent-primary)] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--accent-primary)] [&::-moz-range-thumb]:bg-white"
                    onChange={(e) => setDesiredAgeMin(Number(e.target.value))}
                  />
                  <input
                    type="range"
                    min={AGE_RANGE_MIN}
                    max={AGE_RANGE_MAX}
                    value={desiredAgeMax}
                    aria-label={t('profile.desiredMaxAge')}
                    className="pointer-events-none absolute left-0 top-1/2 z-20 h-1 w-full -translate-y-1/2 appearance-none bg-transparent accent-[var(--accent-primary)] [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[var(--accent-primary)] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[var(--accent-primary)] [&::-moz-range-thumb]:bg-white"
                    onChange={(e) => setDesiredAgeMax(Number(e.target.value))}
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  {t('profile.desiredRegions')}
                </p>
                {optionsLoading ? (
                  <p className="text-xs text-[var(--text-secondary)]">{t('profile.loadingRegions')}</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {regions.map((region) => {
                      const selected = form.preferred_regions.includes(region)
                      return (
                        <label
                          key={`preferred-region-${region}`}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                            selected
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                              : 'border-[var(--border-soft)] bg-[var(--surface-panel)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => togglePreferredRegion(region)}
                            className="h-4 w-4 accent-[var(--accent-primary)]"
                          />
                          <span>{t(`options.regions.${region}`, region)}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 block text-sm font-medium text-[var(--text-primary)]">
                  {t('profile.desiredGenders')}
                </p>
                {optionsLoading ? (
                  <p className="text-xs text-[var(--text-secondary)]">{t('profile.loadingGenders')}</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {discoveryGenders.map((gender) => {
                      const selected = form.preferred_genders.includes(gender)
                      return (
                        <label
                          key={`preferred-gender-${gender}`}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                            selected
                              ? 'border-[var(--accent-primary)] bg-[var(--accent-soft)]'
                              : 'border-[var(--border-soft)] bg-[var(--surface-panel)]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => togglePreferredGender(gender)}
                            className="h-4 w-4 accent-[var(--accent-primary)]"
                          />
                          <span>{t(`options.genders.${gender}`, gender)}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] p-4">
            <h3 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
              {t('profile.userInfo')}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {t('profile.userInfoHint')}
            </p>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">{t('profile.userId')}</span>
                <input
                  className="w-full cursor-not-allowed rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2.5 text-sm text-[var(--text-secondary)] opacity-70 shadow-sm"
                  value={backendUserId ?? t('profile.userIdPending')}
                  disabled
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">{t('profile.name')}</span>
                <input
                  className="w-full cursor-not-allowed rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2.5 text-sm text-[var(--text-secondary)] opacity-70 shadow-sm"
                  value={activeUser.name}
                  disabled
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">{t('profile.chatLink')}</span>
                <input
                  className="w-full cursor-not-allowed rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2.5 text-sm text-[var(--text-secondary)] opacity-70 shadow-sm"
                  value={activeUser.chat_id}
                  disabled
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">{t('profile.department')}</span>
                <input
                  className="w-full cursor-not-allowed rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2.5 text-sm text-[var(--text-secondary)] opacity-70 shadow-sm"
                  value={activeUser.department}
                  disabled
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">{t('profile.gender')}</span>
                <input
                  className="w-full cursor-not-allowed rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2.5 text-sm text-[var(--text-secondary)] opacity-70 shadow-sm"
                  value={t(`options.genders.${activeUser.gender}`, activeUser.gender)}
                  disabled
                />
              </label>
            </div>
          </div>
        )}

        {activeTab !== 'user-info' ? (
          <button
            type="submit"
            className="rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-primary-strong)] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={saving}
          >
            {saving ? t('profile.saving') : t('profile.saveProfile')}
          </button>
        ) : null}
      </form>
    </section>
  )
}
