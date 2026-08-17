import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthContext, type LoginDto, type SignUpResult } from "../contexts/AuthContext";
import { mySupabase } from "@/lib/supabase/supabase";
import { api } from "@/services/api";
import type { User } from "@supabase/supabase-js";
import type { Session } from "@supabase/supabase-js";
import { SessionLifecycle } from "@/services/session-lifecycle";
import { socketSessionOwner } from "@/services/socket";
import { t } from "@/i18n";
import { authErrorMessage } from "@/services/api-errors";
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
    const acceptSession = useCallback(
        async (session: Session | null) => {
            const sessionKey = session
                ? `${session.user.id}:${session.access_token}`
                : "signed-out";
            if (lastSessionKey.current === sessionKey) return;
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
                if (generation === sessionGeneration.current) setUser(session.user);
            } catch (loadError) {
                if (generation === sessionGeneration.current) {
                    lastSessionKey.current = undefined;
                    await sessionLifecycle.transition(null);
                    setUser(null);
                    setError(authErrorMessage(loadError, "initialize"));
                }
            } finally {
                if (generation === sessionGeneration.current) setLoading(false);
            }
        },
        [sessionLifecycle, syncLocalProfile]
    );
    async function signIn(data: LoginDto) {
        setLoading(true);
        setError(null);
        try {
            const { data: signInData, error } = await mySupabase.auth.signInWithPassword({
                email: data.email,
                password: data.password,
            });
            if (error) {
                throw error;
            }
            await acceptSession(signInData.session);
        } catch (signInError) {
            setUser(null);
            setError(authErrorMessage(signInError, "signIn"));
            throw signInError;
        } finally {
            setLoading(false);
        }
    }
    async function signUp(data: LoginDto): Promise<SignUpResult> {
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
                return { status: "confirmation_required", email: data.email };
            }
            await acceptSession(signUpData.session);
            return { status: "authenticated" };
        } catch (signUpError) {
            setUser(null);
            setError(authErrorMessage(signUpError, "signUp"));
            throw signUpError;
        } finally {
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
                    const blockingError = new Error(t("auth.error.signOut"));
                    setError(blockingError.message);
                    throw blockingError;
                }
                await acceptSession(null);
                setError(t("auth.error.localSignOut"));
                return;
            }
            await acceptSession(null);
        } finally {
            setLoading(false);
        }
    }
    async function requestPasswordReset(email: string) {
        setLoading(true);
        setError(null);
        try {
            const redirectTo = `${window.location.origin}/reset-password`;
            const { error: resetError } = await mySupabase.auth.resetPasswordForEmail(email, {
                redirectTo,
            });
            if (resetError) throw resetError;
        } catch (resetError) {
            setError(t("auth.error.resetRequest"));
            throw resetError;
        } finally {
            setLoading(false);
        }
    }
    async function updatePassword(password: string) {
        setLoading(true);
        setError(null);
        try {
            const { error: updateError } = await mySupabase.auth.updateUser({ password });
            if (updateError) throw updateError;
        } catch (updateError) {
            setError(t("auth.error.resetPassword"));
            throw updateError;
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        let active = true;
        const { data: authListener } = mySupabase.auth.onAuthStateChange((_event, session) => {
            setTimeout(() => {
                if (active) void acceptSession(session);
            }, 0);
        });
        void mySupabase.auth.getSession().then(({ data, error: sessionError }) => {
            if (!active) return;
            if (sessionError) {
                setError(authErrorMessage(sessionError, "initialize"));
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
    return (
        <AuthContext.Provider
            value={{
                user,
                signIn,
                signUp,
                requestPasswordReset,
                updatePassword,
                signOut,
                loading,
                error,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
