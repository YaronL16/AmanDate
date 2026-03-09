import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ProfilePage } from './ProfilePage'

vi.mock('../lib/api/users', () => ({
  createUser: vi.fn(),
  findUserByChatId: vi.fn(),
  getProfileOptions: vi.fn(),
  updateUser: vi.fn(),
}))

describe('ProfilePage', () => {
  it('enforces max 3 genres and submits selected profile fields', async () => {
    const { createUser, findUserByChatId, getProfileOptions } = await import('../lib/api/users')

    vi.mocked(findUserByChatId).mockResolvedValue(null)
    vi.mocked(getProfileOptions).mockResolvedValue({
      music_genres: ['Pop', 'Rock', 'Jazz', 'Metal'],
      israel_regions: ['Center', 'Tel Aviv'],
    })
    vi.mocked(createUser).mockResolvedValue({
      id: 'user-1',
      name: 'Alice',
      bio: null,
      photo_url: null,
      department: 'Eng',
      gender: 'female',
      age: 28,
      favorite_genres: ['Pop', 'Rock', 'Jazz'],
      region: 'Center',
      chat_id: 'U_A',
      is_active: false,
      created_at: new Date().toISOString(),
    })

    render(
      <ProfilePage
        activeUser={{
          user_id: 'u-alice',
          name: 'Alice Adams',
          department: 'Eng',
          gender: 'female',
          chat_id: 'U_A',
        }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('Favorite music genres (up to 3)')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByLabelText('Pop'))
    fireEvent.click(screen.getByLabelText('Rock'))
    fireEvent.click(screen.getByLabelText('Jazz'))
    fireEvent.click(screen.getByLabelText('Metal'))

    expect(screen.getByText('Selected: 3/3')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Age'), { target: { value: '28' } })
    fireEvent.change(screen.getByLabelText('Region'), { target: { value: 'Center' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => {
      expect(createUser).toHaveBeenCalled()
    })

    const payload = vi.mocked(createUser).mock.calls[0]?.[0]
    expect(payload).toMatchObject({
      age: 28,
      region: 'Center',
      favorite_genres: ['Pop', 'Rock', 'Jazz'],
    })
  })
})
