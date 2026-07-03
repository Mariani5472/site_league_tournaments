export type User = {
  id: string;
  email: string;
  nickname: string;
  avatar_url: string;
  banner_url: string;
  bio: string;
  created_at: Date
}

export type CreateUserDTO = {
  id: string;
  email: string;
  nickname: string;
}