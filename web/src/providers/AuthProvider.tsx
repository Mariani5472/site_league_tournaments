import { useCallback, useEffect, useState, type ReactNode } from "react";
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
  const [error, setError] = useState<string | null>(null);

  const syncLocalProfile = useCallback(async () => {
    await api.post("/auth/sync");
  }, []);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData, error: sessionError } = await mySupabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        setUser(null);
        return;
      }
      const { data, error: authError } = await mySupabase.auth.getUser();
      if (authError) throw authError;
      if (data.user) await syncLocalProfile();
      setUser(data.user);
    } catch (loadError) {
      setUser(null);
      setError(loadError instanceof Error ? loadError.message : "Could not initialize your profile");
    } finally {
      setLoading(false);
    }
  }, [syncLocalProfile]);

  async function signIn(data: LoginDto) {
    setLoading(true);
    setError(null);
    try {
    const { error } =
      await mySupabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      });

    if (error) {
      throw error;
    }

    await syncLocalProfile();

    const { data: userData } = await mySupabase.auth.getUser();

    setUser(userData.user);
    } catch (signInError) {
      setUser(null);
      setError(signInError instanceof Error ? signInError.message : "Could not sign in");
      throw signInError;
    } finally {
      setLoading(false);
    }
  }

  async function signUp(data: LoginDto) {
    setLoading(true);
    setError(null);
    try {
    const { data: signUpData, error } = await mySupabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) {
      throw error;
    }

    if (!signUpData.session) {
      throw new Error("Check your email to confirm the account before signing in");
    }

    await syncLocalProfile();

    const { data: userData } = await mySupabase.auth.getUser();

    setUser(userData.user);
    } catch (signUpError) {
      setUser(null);
      setError(signUpError instanceof Error ? signUpError.message : "Could not create account");
      throw signUpError;
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    setLoading(true);
    await mySupabase.auth.signOut();
    setUser(null);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    (async () => await loadUser())();
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signUp,
        signOut,
        loading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
