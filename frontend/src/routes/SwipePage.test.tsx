import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { SwipePage } from './SwipePage'

vi.mock('../lib/api/discovery', () => ({
  getDiscoveryCandidates: vi.fn(),
}))

vi.mock('../lib/api/swipes', () => ({
  postSwipe: vi.fn(),
}))

vi.mock('../lib/api/users', () => ({
  createUser: vi.fn(),
  findUserByChatId: vi.fn(),
}))

describe('SwipePage', () => {
  it('shows match modal when swipe result is matched', async () => {
    const { getDiscoveryCandidates } = await import('../lib/api/discovery')
    const { postSwipe } = await import('../lib/api/swipes')
    const { findUserByChatId } = await import('../lib/api/users')

    vi.mocked(findUserByChatId).mockResolvedValue({
      id: 'user-a',
      name: 'Alice',
      bio: null,
      photo_url: null,
      department: 'Eng',
      gender: 'female',
      chat_id: 'U_A',
      is_active: true,
      created_at: new Date().toISOString(),
    })
    vi.mocked(getDiscoveryCandidates).mockResolvedValue([
      {
        id: 'user-b',
        name: 'Bob',
        department: 'Product',
        gender: 'male',
        photo_url: null,
      },
    ])
    vi.mocked(postSwipe).mockResolvedValue({
      matched: true,
      match: {
        id: 'match-1',
        created_at: new Date().toISOString(),
        other_user: {
          id: 'user-b',
          name: 'Bob',
          department: 'Product',
          photo_url: null,
          chat_id: 'U_B',
        },
        chat_thread_url: 'https://chat.internal/users/U_B',
      },
    })

    render(
      <MemoryRouter>
        <SwipePage
          activeUser={{
            user_id: 'u-alice',
            name: 'Alice',
            department: 'Eng',
            gender: 'female',
            chat_id: 'U_A',
          }}
        />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Candidate profile')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Like' }))

    await waitFor(() => {
      expect(screen.getByText("It's a Match!")).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Open chat' })).toHaveAttribute(
      'href',
      'https://chat.internal/users/U_B',
    )
  })
})
