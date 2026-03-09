import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'

import { MOCK_AUTH_USERS, getMockUserById } from './mocks/users'
import { clearSessionUserId, getSessionUserId, setSessionUserId } from './lib/session'
import { MatchesPage } from './routes/MatchesPage'
import { ProfilePage } from './routes/ProfilePage'
import { SwipePage } from './routes/SwipePage'

const THEME_KEY = 'amandate.theme'

function getInitialTheme(): boolean {
  const storedTheme = localStorage.getItem(THEME_KEY)
  if (storedTheme) {
    return storedTheme === 'dark'
  }
  return true
}

function App() {
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

  return (
    <div className="min-h-screen text-[var(--text-primary)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border-soft)] bg-[var(--surface-panel)]/75 backdrop-blur-md">
        <nav className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-3">
          <h1 className="mr-2 rounded-full bg-[var(--accent-soft)] px-3 py-1 text-sm font-semibold tracking-wide text-[var(--accent-primary-strong)]">
            AmanDate
          </h1>
          <NavLink
            className={({ isActive }) =>
              `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${isActive
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-panel-soft)] hover:text-[var(--text-primary)]'}`
            }
            to="/profile"
          >
            Profile
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${isActive
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-panel-soft)] hover:text-[var(--text-primary)]'}`
            }
            to="/swipe"
          >
            Swipe
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${isActive
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-panel-soft)] hover:text-[var(--text-primary)]'}`
            }
            to="/matches"
          >
            Matches
          </NavLink>
          <div className="ml-auto flex items-center gap-2">
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
              Login
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
            >
              Logout
            </button>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
          >
            {isDarkMode ? 'Light mode' : 'Dark mode'}
          </button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        {activeMockUser ? (
          <div className="mb-4 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs text-[var(--text-secondary)]">
            Logged in as <span className="font-semibold text-[var(--text-primary)]">{activeMockUser.user_id}</span> - {activeMockUser.name} ({activeMockUser.department})
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs text-[var(--text-secondary)]">
            Not logged in. Choose a test user id and click Login.
          </div>
        )}
        <Routes>
          <Route path="/" element={<Navigate to="/profile" replace />} />
          <Route path="/profile" element={<ProfilePage activeUser={activeMockUser} />} />
          <Route path="/swipe" element={<SwipePage activeUser={activeMockUser} />} />
          <Route path="/matches" element={<MatchesPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
