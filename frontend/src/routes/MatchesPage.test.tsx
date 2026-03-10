import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MatchesPage } from './MatchesPage'

vi.mock('../lib/api/matches', () => ({
  getMatches: vi.fn(),
}))

vi.mock('../lib/api/users', () => ({
  findUserByChatId: vi.fn(),
}))

describe('MatchesPage', () => {
  it('renders fetched matches with open chat link', async () => {
    const { getMatches } = await import('../lib/api/matches')
    const { findUserByChatId } = await import('../lib/api/users')

    vi.mocked(findUserByChatId).mockResolvedValue({
      id: 'user-a',
      name: 'Alice',
      bio: null,
      photo_urls: null,
      department: 'Eng',
      gender: 'female',
      age: null,
      favorite_genres: null,
      region: null,
      preferred_age_min: null,
      preferred_age_max: null,
      preferred_regions: null,
      preferred_genders: null,
      chat_id: 'U_A',
      is_active: true,
      created_at: new Date().toISOString(),
    })
    vi.mocked(getMatches).mockResolvedValue([
      {
        id: 'match-1',
        created_at: new Date().toISOString(),
        other_user: {
          id: 'user-b',
          name: 'Bob',
          department: 'Product',
          photo_urls: null,
          chat_id: 'U_B',
        },
        chat_thread_url: 'https://chat.internal/users/U_B',
      },
    ])

    render(
      <MatchesPage
        activeUser={{
          user_id: 'u-alice',
          name: 'Alice',
          department: 'Eng',
          gender: 'female',
          chat_id: 'U_A',
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Open chat' })).toHaveAttribute(
      'href',
      'https://chat.internal/users/U_B',
    )
  })
})
