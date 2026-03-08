import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router-dom'

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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
    localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode((current) => !current)
  }

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
          <button
            type="button"
            onClick={toggleTheme}
            className="ml-auto rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text-primary)]"
          >
            {isDarkMode ? 'Light mode' : 'Dark mode'}
          </button>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/profile" replace />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/swipe" element={<SwipePage />} />
          <Route path="/matches" element={<MatchesPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
