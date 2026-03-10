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
  it('enforces max 3 genres, supports photos tab, and submits selected profile fields', async () => {
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
      photo_urls: null,
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

    fireEvent.click(screen.getByRole('button', { name: 'Photos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add photo URL (1/5)' }))
    fireEvent.change(screen.getByPlaceholderText('Photo URL #1'), {
      target: { value: 'https://example.com/one.jpg' },
    })
    fireEvent.change(screen.getByPlaceholderText('Photo URL #2'), {
      target: { value: 'https://example.com/two.jpg' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Profile' }))

    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }))

    await waitFor(() => {
      expect(createUser).toHaveBeenCalled()
    })

    const payload = vi.mocked(createUser).mock.calls[0]?.[0]
    expect(payload).toMatchObject({
      age: 28,
      region: 'Center',
      favorite_genres: ['Pop', 'Rock', 'Jazz'],
      photo_urls: ['https://example.com/one.jpg', 'https://example.com/two.jpg'],
    })
  })
})
