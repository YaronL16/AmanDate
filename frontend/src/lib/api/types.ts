export interface UserOut {
  id: string
  name: string
  bio: string | null
  photo_urls: string[] | null
  department: string | null
  gender: 'male' | 'female' | null
  age: number | null
  favorite_genres: string[] | null
  region: string | null
  chat_id: string
  is_active: boolean
  created_at: string
}

export interface UserCard {
  id: string
  name: string
  bio: string | null
  age: number | null
  region: string | null
  favorite_genres: string[] | null
  department: string | null
  gender: 'male' | 'female' | null
  photo_urls: string[] | null
}

export interface UserCreatePayload {
  name: string
  bio?: string | null
  photo_urls?: string[] | null
  department?: string | null
  gender?: 'male' | 'female' | null
  age?: number | null
  favorite_genres?: string[] | null
  region?: string | null
  chat_id: string
  is_active?: boolean
}

export interface UserUpdatePayload {
  name?: string
  bio?: string | null
  photo_urls?: string[] | null
  department?: string | null
  gender?: 'male' | 'female' | null
  age?: number | null
  favorite_genres?: string[] | null
  region?: string | null
  chat_id?: string
  is_active?: boolean
}

export interface ProfileOptionsOut {
  music_genres: string[]
  israel_regions: string[]
}

export type SwipeDirection = 'left' | 'right'

export interface SwipeRequestPayload {
  swiper_id: string
  swiped_id: string
  direction: SwipeDirection
}

export interface MatchUser {
  id: string
  name: string
  department: string | null
  photo_urls: string[] | null
  chat_id: string
}

export interface MatchOut {
  id: string
  created_at: string
  other_user: MatchUser
  chat_thread_url: string | null
}

export interface SwipeResult {
  matched: boolean
  match: MatchOut | null
}

export interface ApiValidationError {
  detail?:
    | Array<{
        loc: (string | number)[]
        msg: string
        type: string
      }>
    | string
}

export interface AdminSwipeOut {
  id: string
  swiper_id: string
  swiped_id: string
  direction: 'left' | 'right'
  created_at: string
}

export interface AdminMatchOut {
  id: string
  user1_id: string
  user2_id: string
  created_at: string
  chat_thread_url: string | null
}
