import { useEffect, useState, type ReactNode } from "react";
import { AuthContext, type LoginDto } from "../contexts/AuthContext";
import { mySupabase } from "@/lib/supabase/supabase";
import { api } from "@/services/api";
import type { User } from "@supabase/supabase-js";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadUser() {
    const { data } = await mySupabase.auth.getUser();
    setUser(data.user);
    setLoading(false);
  }

  async function signIn(data: LoginDto) {
    const { error } =
      await mySupabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

    if (error) {
      throw error;
    }

    await api.post("/auth/sync");

    const { data: userData } = await mySupabase.auth.getUser();

    setUser(userData.user);
  }

  async function signOut() {
    await mySupabase.auth.signOut();
    setUser(null);
  }

  useEffect(() => {
    (async () => await loadUser())();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}