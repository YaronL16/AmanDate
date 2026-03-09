import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'

import type { MockAuthUser } from '../mocks/users'
import { ApiError } from '../lib/api/client'
import { createUser, findUserByChatId, updateUser } from '../lib/api/users'
import type { ApiValidationError, UserCreatePayload, UserOut } from '../lib/api/types'

type FormState = {
  bio: string
  photo_url: string
  is_active: boolean
}

const emptyForm: FormState = {
  bio: '',
  photo_url: '',
  is_active: false,
}

function toCreatePayload(form: FormState, identity: MockAuthUser): UserCreatePayload {
  return {
    name: identity.name,
    bio: form.bio.trim() || null,
    photo_url: form.photo_url.trim() || null,
    department: identity.department,
    gender: identity.gender,
    chat_id: identity.chat_id,
    is_active: form.is_active,
  }
}

function fromUser(user: UserOut): FormState {
  return {
    bio: user.bio ?? '',
    photo_url: user.photo_url ?? '',
    is_active: user.is_active,
  }
}

function getApiErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Unexpected error. Please try again.'
  }

  if (error.status === 409) {
    return 'chat_id is already in use. Please choose a different one.'
  }

  if (error.status === 422) {
    const body = error.body as ApiValidationError
    if (Array.isArray(body?.detail) && body.detail.length > 0) {
      return body.detail.map((item) => item.msg).join('; ')
    }
    return 'Validation failed. Please review the form values.'
  }

  return `Request failed (${error.status}). Please retry.`
}

export function ProfilePage({ activeUser }: { activeUser: MockAuthUser | null }) {
  const [backendUserId, setBackendUserId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [persistedIsActive, setPersistedIsActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const firstName = activeUser?.name.trim().split(/\s+/)[0] ?? ''

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
        setError('Failed to load profile. Please retry.')
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

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!activeUser) {
      setError('Please login with a test user id first.')
      return
    }

    setError(null)
    setSuccess(null)

    const enablingNow = !persistedIsActive && form.is_active
    if (enablingNow) {
      const confirmed = window.confirm(
        'Activate account now? Once activated, you will be visible in discovery and can swipe.',
      )
      if (!confirmed) {
        return
      }
    }

    setSaving(true)

    try {
      const user = backendUserId
        ? await updateUser(backendUserId, {
          bio: form.bio.trim() || null,
          photo_url: form.photo_url.trim() || null,
          is_active: form.is_active,
        })
        : await createUser(toCreatePayload(form, activeUser))

      setBackendUserId(user.id)
      setForm(fromUser(user))
      setPersistedIsActive(user.is_active)
      setSuccess(backendUserId ? 'Profile updated.' : 'Profile created.')
    } catch (submitError) {
      setError(getApiErrorMessage(submitError))
    } finally {
      setSaving(false)
    }
  }

  if (!activeUser) {
    return (
      <section className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
        <h2 className="text-2xl font-semibold tracking-tight">Profile</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Login with a test user id to view and edit your profile.
        </p>
      </section>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6 shadow-[0_10px_30px_rgba(23,80,88,0.08)]">
        <p className="text-sm text-[var(--text-secondary)]">Loading profile...</p>
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-7 shadow-[0_12px_32px_rgba(23,80,88,0.08)]">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Profile - {firstName}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {backendUserId ? 'Editing saved profile' : 'New profile setup'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${persistedIsActive
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-800'}`}
          >
            {persistedIsActive ? 'Activated' : 'Not activated'}
          </span>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-primary-strong)]">
            Identity from test dataset
          </span>
        </div>
      </div>

      <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Create or update your profile for discovery.
      </p>

      <div className="mb-4 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-3">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[var(--accent-primary)]"
            checked={form.is_active}
            onChange={(e) => setForm((current) => ({ ...current, is_active: e.target.checked }))}
            disabled={saving}
          />
          <span className="text-sm text-[var(--text-primary)]">
            Activate my account so I can swipe and appear in discovery.
          </span>
        </label>
      </div>

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

      <form className="space-y-5" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Name</span>
          <input
            className="w-full cursor-not-allowed rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-2.5 text-sm text-[var(--text-secondary)] opacity-70 shadow-sm"
            value={activeUser.name}
            disabled
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Chat Link</span>
          <input
            className="w-full cursor-not-allowed rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-2.5 text-sm text-[var(--text-secondary)] opacity-70 shadow-sm"
            value={activeUser.chat_id}
            disabled
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Department</span>
          <input
            className="w-full cursor-not-allowed rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-2.5 text-sm text-[var(--text-secondary)] opacity-70 shadow-sm"
            value={activeUser.department}
            disabled
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Gender</span>
          <input
            className="w-full cursor-not-allowed rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-2.5 text-sm text-[var(--text-secondary)] opacity-70 shadow-sm"
            value={activeUser.gender}
            disabled
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Photo URL</span>
          <input
            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/35"
            value={form.photo_url}
            onChange={(e) => setForm((current) => ({ ...current, photo_url: e.target.value }))}
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Bio</span>
          <textarea
            className="min-h-28 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/35"
            value={form.bio}
            onChange={(e) => setForm((current) => ({ ...current, bio: e.target.value }))}
          />
        </label>

        <button
          type="submit"
          className="rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--accent-primary-strong)] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </section>
  )
}
