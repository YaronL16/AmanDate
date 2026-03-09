export interface UserOut {
  id: string
  name: string
  bio: string | null
  photo_url: string | null
  department: string | null
  gender: 'male' | 'female' | null
  chat_id: string
  is_active: boolean
  created_at: string
}

export interface UserCard {
  id: string
  name: string
  department: string | null
  gender: 'male' | 'female' | null
  photo_url: string | null
}

export interface UserCreatePayload {
  name: string
  bio?: string | null
  photo_url?: string | null
  department?: string | null
  gender?: 'male' | 'female' | null
  chat_id: string
  is_active?: boolean
}

export interface UserUpdatePayload {
  name?: string
  bio?: string | null
  photo_url?: string | null
  department?: string | null
  gender?: 'male' | 'female' | null
  chat_id?: string
  is_active?: boolean
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
  photo_url: string | null
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
