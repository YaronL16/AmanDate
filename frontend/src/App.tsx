import { useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'

import { LANGUAGE_STORAGE_KEY } from './i18n'
import { MOCK_AUTH_USERS, getMockUserById } from './mocks/users'
import { clearSessionUserId, getSessionUserId, setSessionUserId } from './lib/session'
import { AdminPage } from './routes/AdminPage'
import { MatchesPage } from './routes/MatchesPage'
import { ProfilePage } from './routes/ProfilePage'
import { SwipePage } from './routes/SwipePage'

const THEME_KEY = 'amandate.theme'

function LanguageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H7v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" />
    </svg>
  )
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
      />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.718 9.718 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
      />
    </svg>
  )
}

function getInitialTheme(): boolean {
  const storedTheme = localStorage.getItem(THEME_KEY)
  if (storedTheme) {
    return storedTheme === 'dark'
  }
  return true
}

function App() {
  const { t, i18n: i18nInstance } = useTranslation()
  const adminViewEnabled = ['1', 'true', 'yes', 'on'].includes(
    (import.meta.env.VITE_ENABLE_ADMIN_VIEW ?? '').toLowerCase(),
  )
  const configuredAdminUserId = (import.meta.env.VITE_ADMIN_USER_ID ?? '').trim()
  const [isDarkMode, setIsDarkMode] = useState(getInitialTheme)
  const [sessionUserId, setSessionUserIdState] = useState<string | null>(getSessionUserId)
  const [pendingUserId, setPendingUserId] = useState<string>(() => getSessionUserId() ?? MOCK_AUTH_USERS[0]?.user_id ?? '')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
    localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode((current) => !current)
  }

  const toggleLanguage = () => {
    const next = i18nInstance.language.startsWith('he') ? 'en' : 'he'
    void i18nInstance.changeLanguage(next)
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next)
    } catch {
      /* ignore quota / private mode */
    }
  }

  const isHebrew = i18nInstance.language.startsWith('he')

  const onLogin = () => {
    if (!pendingUserId) return
    setSessionUserId(pendingUserId)
    setSessionUserIdState(pendingUserId)
  }

  const onLogout = () => {
    clearSessionUserId()
    setSessionUserIdState(null)
  }

  const activeMockUser = getMockUserById(sessionUserId)
  const showAdminNav =
    adminViewEnabled &&
    Boolean(configuredAdminUserId) &&
    activeMockUser?.user_id === configuredAdminUserId

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border-soft)] bg-[var(--surface-panel)]/75 backdrop-blur-md">
        <nav className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" aria-label={t('nav.goHome')} className="shrink-0">
            <img
              src="/logo_turqoise_transparent.png"
              alt={t('nav.logoAlt')}
              className="h-16 w-16 object-contain"
            />
          </Link>
          <Link
            to="/"
            className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold tracking-wide text-[var(--accent-primary-strong)] transition hover:opacity-90 ltr:mr-2 rtl:ml-2"
          >
            AmanDate
          </Link>
          <NavLink
            className={({ isActive }) =>
              `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${isActive
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-panel-soft)] hover:text-[var(--text-primary)]'}`
            }
            to="/profile"
          >
            {t('nav.profile')}
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${isActive
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-panel-soft)] hover:text-[var(--text-primary)]'}`
            }
            to="/matches"
          >
            {t('nav.matches')}
          </NavLink>
          {showAdminNav ? (
            <NavLink
              className={({ isActive }) =>
                `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${isActive
                  ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-panel-soft)] hover:text-[var(--text-primary)]'}`
              }
              to="/admin"
            >
              {t('nav.admin')}
            </NavLink>
          ) : null}
          <div className="flex items-center gap-2 ltr:ml-auto rtl:mr-auto">
            <select
              value={pendingUserId}
              onChange={(event) => setPendingUserId(event.target.value)}
              className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
            >
              {MOCK_AUTH_USERS.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.user_id}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onLogin}
              className="rounded-full bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--accent-primary-strong)]"
            >
              {t('nav.login')}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
            >
              {t('nav.logout')}
            </button>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            title={isDarkMode ? t('nav.lightMode') : t('nav.darkMode')}
            aria-label={isDarkMode ? t('nav.lightMode') : t('nav.darkMode')}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
          >
            {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        {activeMockUser ? (
          <div className="mb-4 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs text-[var(--text-secondary)]">
            <Trans
              i18nKey="session.loggedInAs"
              values={{
                userId: activeMockUser.user_id,
                name: activeMockUser.name,
                department: activeMockUser.department,
              }}
              components={{ bold: <span className="font-semibold text-[var(--text-primary)]" /> }}
            />
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs text-[var(--text-secondary)]">
            {t('session.notLoggedIn')}
          </div>
        )}
        <Routes>
          <Route path="/" element={<SwipePage activeUser={activeMockUser} />} />
          <Route path="/profile" element={<ProfilePage activeUser={activeMockUser} />} />
          <Route path="/matches" element={<MatchesPage activeUser={activeMockUser} />} />
          <Route path="/admin" element={<AdminPage activeUser={activeMockUser} />} />
        </Routes>
      </main>

      <button
        type="button"
        onClick={toggleLanguage}
        title={t('nav.languageToggle')}
        aria-label={isHebrew ? t('nav.switchToEnglish') : t('nav.switchToHebrew')}
        className="fixed bottom-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--accent-primary-strong)] shadow-[0_4px_14px_rgba(16,49,54,0.12)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)] ltr:right-4 rtl:left-4"
      >
        <LanguageIcon className="h-6 w-6" />
      </button>
    </div>
  )
}

export default App
