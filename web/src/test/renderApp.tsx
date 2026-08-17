import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { AuthContext, type AuthContextData } from "@/contexts/AuthContext";

export function testQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { retry: false, gcTime: Infinity },
            mutations: { retry: false },
        },
    });
}

const defaultAuth: AuthContextData = {
    user: { id: "user-1", email: "player@test.local" } as User,
    loading: false,
    error: null,
    signIn: async () => undefined,
    signUp: async () => ({ status: "authenticated" }),
    requestPasswordReset: async () => undefined,
    updatePassword: async () => undefined,
    signOut: async () => undefined,
};

export function renderApp(
    ui: ReactElement,
    options: {
        route?: string;
        auth?: Partial<AuthContextData>;
        queryClient?: QueryClient;
    } = {}
) {
    const queryClient = options.queryClient ?? testQueryClient();
    const auth = { ...defaultAuth, ...options.auth };
    return {
        queryClient,
        ...render(
            <QueryClientProvider client={queryClient}>
                <AuthContext.Provider value={auth}>
                    <MemoryRouter initialEntries={[options.route ?? "/"]}>
                        {ui}
                    </MemoryRouter>
                </AuthContext.Provider>
            </QueryClientProvider>
        ),
    };
}
