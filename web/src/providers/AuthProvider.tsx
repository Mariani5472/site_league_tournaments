import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext, type LoginDto } from "../contexts/AuthContext";
import { mySupabase } from "@/lib/supabase/supabase";
import { api } from "@/services/api";
import type { User } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";
import { SessionLifecycle } from "@/services/session-lifecycle";
import { socketSessionOwner } from "@/services/socket";
type AuthProviderProps = {
    children: ReactNode;
};
export function AuthProvider({ children }: AuthProviderProps) {
    const queryClient = useQueryClient();
    const sessionLifecycle = useMemo(
        () => new SessionLifecycle(queryClient, socketSessionOwner),
        [queryClient]
    );
    const sessionGeneration = useRef(0);
    const lastSessionKey = useRef<string | undefined>(undefined);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const syncLocalProfile = useCallback(async () => {
        await api.post("/auth/sync");
    }, []);
    const acceptSession = useCallback(async (session: Session | null) => {
        const sessionKey = session ? `${session.user.id}:${session.access_token}` : "signed-out";
        if (lastSessionKey.current === sessionKey)
            return;
        lastSessionKey.current = sessionKey;
        const generation = ++sessionGeneration.current;
        setLoading(true);
        setError(null);
        try {
            await sessionLifecycle.transition(session);
            if (!session) {
                setUser(null);
                return;
            }
            await syncLocalProfile();
            if (generation === sessionGeneration.current)
                setUser(session.user);
        }
        catch (loadError) {
            if (generation === sessionGeneration.current) {
                lastSessionKey.current = undefined;
                await sessionLifecycle.transition(null);
                setUser(null);
                setError(loadError instanceof Error ? loadError.message : "Could not initialize your profile");
            }
        }
        finally {
            if (generation === sessionGeneration.current)
                setLoading(false);
        }
    }, [sessionLifecycle, syncLocalProfile]);
    async function signIn(data: LoginDto) {
        setLoading(true);
        setError(null);
        try {
            const { data: signInData, error } = await mySupabase.auth.signInWithPassword({
                email: data.email,
                password: data.password
            });
            if (error) {
                throw error;
            }
            await acceptSession(signInData.session);
        }
        catch (signInError) {
            setUser(null);
            setError(signInError instanceof Error ? signInError.message : "Could not sign in");
            throw signInError;
        }
        finally {
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
            await acceptSession(signUpData.session);
        }
        catch (signUpError) {
            setUser(null);
            setError(signUpError instanceof Error ? signUpError.message : "Could not create account");
            throw signUpError;
        }
        finally {
            setLoading(false);
        }
    }
    async function signOut() {
        setLoading(true);
        setError(null);
        try {
            let remoteError: unknown;
            try {
                const result = await mySupabase.auth.signOut();
                remoteError = result.error;
            } catch (requestError) {
                remoteError = requestError;
            }
            if (remoteError) {
                let localError: unknown;
                try {
                    const result = await mySupabase.auth.signOut({ scope: "local" });
                    localError = result.error;
                } catch (fallbackError) {
                    localError = fallbackError;
                }
                if (localError) {
                    const blockingError = new Error("Could not sign out. Your session remains active; try again.");
                    setError(blockingError.message);
                    throw blockingError;
                }
                await acceptSession(null);
                setError("Signed out on this device, but other sessions may remain active.");
                return;
            }
            await acceptSession(null);
        }
        finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        let active = true;
        const { data: authListener } = mySupabase.auth.onAuthStateChange((_event, session) => {
            setTimeout(() => {
                if (active)
                    void acceptSession(session);
            }, 0);
        });
        void mySupabase.auth.getSession().then(({ data, error: sessionError }) => {
            if (!active)
                return;
            if (sessionError) {
                setError(sessionError.message);
                setLoading(false);
                return;
            }
            void acceptSession(data.session);
        });

        return () => {
            active = false;
            authListener.subscription.unsubscribe();
            void sessionLifecycle.dispose();
        };
    }, [acceptSession, sessionLifecycle]);
    return (<AuthContext.Provider value={{
            user,
            signIn,
            signUp,
            signOut,
            loading,
            error,
        }}>
      {children}
    </AuthContext.Provider>);
}
