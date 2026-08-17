import type { User } from "@supabase/supabase-js";
import { createContext } from "react";
export type LoginDto = {
    email: string;
    password: string;
};
export type SignUpResult =
    { status: "authenticated" } | { status: "confirmation_required"; email: string };
export type AuthContextData = {
    user: User | null;
    signIn(data: LoginDto): Promise<void>;
    signUp(data: LoginDto): Promise<SignUpResult>;
    requestPasswordReset(email: string): Promise<void>;
    updatePassword(password: string): Promise<void>;
    signOut(): Promise<void>;
    loading: boolean;
    error: string | null;
};
export const AuthContext = createContext({} as AuthContextData);
