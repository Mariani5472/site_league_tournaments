import type { User } from "@supabase/supabase-js";
import { createContext } from "react";

export type LoginDto = {
  email: string;
  password: string;
};

export type AuthContextData = { 
  user: User | null
  signIn(data: LoginDto): Promise<void>;
  signUp(data: LoginDto): Promise<void>;
  signOut(): Promise<void>;
  loading: boolean;
};
export const AuthContext = createContext({} as AuthContextData);