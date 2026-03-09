export interface MockAuthUser {
  user_id: string
  name: string
  department: string
  gender: 'male' | 'female'
  chat_id: string
}

export const MOCK_AUTH_USERS: MockAuthUser[] = [
  {
    user_id: 'yaron',
    name: 'Yaron Lavi',
    department: 'Architecture',
    gender: 'male',
    chat_id: 'UDEMO001',
  },
  {
    user_id: 'yud-idan',
    name: 'Yonatan Idan',
    department: 'Data',
    gender: 'male',
    chat_id: 'UDEMO001',
  },
  {
    user_id: 'u-noa',
    name: 'Noa Levi',
    department: 'Product',
    gender: 'female',
    chat_id: 'UDEMO002',
  },
  {
    user_id: 'u-yuval',
    name: 'Yuval Katz',
    department: 'Design',
    gender: 'male',
    chat_id: 'UDEMO003',
  },
  {
    user_id: 'u-maya',
    name: 'Maya Azulay',
    department: 'Marketing',
    gender: 'female',
    chat_id: 'UDEMO004',
  },
  {
    user_id: 'u-daniel',
    name: 'Daniel Mor',
    department: 'Finance',
    gender: 'male',
    chat_id: 'UDEMO005',
  },
]

export function getMockUserById(userId: string | null): MockAuthUser | null {
  if (!userId) {
    return null
  }
  return MOCK_AUTH_USERS.find((user) => user.user_id === userId) ?? null
}
