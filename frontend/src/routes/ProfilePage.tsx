import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'

import { ApiError } from '../lib/api/client'
import { createUser, getUser, updateUser } from '../lib/api/users'
import type { ApiValidationError, UserCreatePayload, UserOut } from '../lib/api/types'

const CURRENT_USER_KEY = 'amandate.current_user_id'

type FormState = {
  name: string
  bio: string
  photo_url: string
  department: string
  chat_id: string
}

const emptyForm: FormState = {
  name: '',
  bio: '',
  photo_url: '',
  department: '',
  chat_id: '',
}

function toPayload(form: FormState): UserCreatePayload {
  return {
    name: form.name.trim(),
    bio: form.bio.trim() || null,
    photo_url: form.photo_url.trim() || null,
    department: form.department.trim() || null,
    chat_id: form.chat_id.trim(),
  }
}

function fromUser(user: UserOut): FormState {
  return {
    name: user.name,
    bio: user.bio ?? '',
    photo_url: user.photo_url ?? '',
    department: user.department ?? '',
    chat_id: user.chat_id,
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

export function ProfilePage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isEditMode = useMemo(() => Boolean(userId), [userId])

  useEffect(() => {
    const storedUserId = localStorage.getItem(CURRENT_USER_KEY)
    if (!storedUserId) {
      setLoading(false)
      return
    }

    let cancelled = false

    getUser(storedUserId)
      .then((user) => {
        if (cancelled) return
        setUserId(user.id)
        setForm(fromUser(user))
      })
      .catch(() => {
        if (cancelled) return
        localStorage.removeItem(CURRENT_USER_KEY)
        setUserId(null)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const payload = toPayload(form)

    if (!payload.name || !payload.chat_id) {
      setError('Name and chat_id are required.')
      return
    }

    setSaving(true)

    try {
      const user = userId
        ? await updateUser(userId, payload)
        : await createUser(payload)

      setUserId(user.id)
      localStorage.setItem(CURRENT_USER_KEY, user.id)
      setForm(fromUser(user))
      setSuccess(userId ? 'Profile updated.' : 'Profile created.')
    } catch (submitError) {
      setError(getApiErrorMessage(submitError))
    } finally {
      setSaving(false)
    }
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
          <h2 className="text-2xl font-semibold tracking-tight">Profile</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {isEditMode ? 'Editing saved profile' : 'New profile setup'}
          </p>
        </div>
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-primary-strong)]">
          {isEditMode ? 'Ready to update' : 'Onboarding'}
        </span>
      </div>

      <p className="mb-6 text-sm text-[var(--text-secondary)]">
          Create or update your profile for discovery.
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

      <form className="space-y-5" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Name *</span>
          <input
            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/35"
            value={form.name}
            onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Chat ID *</span>
          <input
            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/35"
            value={form.chat_id}
            onChange={(e) => setForm((current) => ({ ...current, chat_id: e.target.value }))}
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Department</span>
          <input
            className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-2.5 text-sm text-[var(--text-primary)] shadow-sm outline-none transition focus:border-[var(--focus-ring)] focus:ring-2 focus:ring-[color:var(--focus-ring)]/35"
            value={form.department}
            onChange={(e) => setForm((current) => ({ ...current, department: e.target.value }))}
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
          {saving ? 'Saving...' : isEditMode ? 'Update profile' : 'Create profile'}
        </button>
      </form>
    </section>
  )
}
