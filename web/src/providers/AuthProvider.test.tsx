import { useContext } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { AuthContext } from "@/contexts/AuthContext";
import { testQueryClient } from "@/test/renderApp";
import { AuthProvider } from "./AuthProvider";

const mocks = vi.hoisted(() => ({
    getSession: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn(),
    onAuthStateChange: vi.fn(), sync: vi.fn(), socketApply: vi.fn(), unsubscribe: vi.fn(),
    authCallback: undefined as undefined | ((event: string, session: Session | null) => void),
}));

vi.mock("@/lib/supabase/supabase", () => ({
    mySupabase: { auth: {
        getSession: mocks.getSession,
        signInWithPassword: mocks.signInWithPassword,
        signUp: mocks.signUp,
        signOut: mocks.signOut,
        onAuthStateChange: mocks.onAuthStateChange,
    } },
}));
vi.mock("@/services/api", () => ({ api: { post: mocks.sync } }));
vi.mock("@/services/socket", () => ({ socketSessionOwner: { apply: mocks.socketApply } }));

function session(id: string): Session {
    return { access_token: `token-${id}`, user: { id, email: `${id}@test.local` } } as Session;
}

function Probe() {
    const auth = useContext(AuthContext);
    return <div>
        <span>{auth.loading ? "loading" : auth.user?.id ?? "anonymous"}</span>
        {auth.error && <span role="alert">{auth.error}</span>}
        <button onClick={() => auth.signIn({ email: "a@test.local", password: "secret" })}>Login</button>
        <button onClick={() => { void auth.signOut().catch(() => undefined); }}>Logout</button>
    </div>;
}

describe("AuthProvider", () => {
    beforeEach(() => {
        mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
        mocks.signOut.mockResolvedValue({ error: null });
        mocks.sync.mockResolvedValue({});
        mocks.onAuthStateChange.mockImplementation((callback) => {
            mocks.authCallback = callback;
            return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
        });
    });

    it("syncs login and clears private cache before logout", async () => {
        const signedIn = session("user-a");
        mocks.signInWithPassword.mockResolvedValue({ data: { session: signedIn }, error: null });
        const queryClient = testQueryClient();
        render(<QueryClientProvider client={queryClient}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);
        await screen.findByText("anonymous");

        await userEvent.click(screen.getByRole("button", { name: "Login" }));
        expect(await screen.findByText("user-a")).toBeVisible();
        expect(mocks.sync).toHaveBeenCalledWith("/auth/sync");
        queryClient.setQueryData(["profile", "me"], { private: true });

        await userEvent.click(screen.getByRole("button", { name: "Logout" }));
        expect(await screen.findByText("anonymous")).toBeVisible();
        expect(queryClient.getQueryData(["profile", "me"])).toBeUndefined();
        expect(mocks.signOut).toHaveBeenCalledOnce();
    });

    it("falls back to local logout when remote sign out fails and stays anonymous after reload", async () => {
        mocks.getSession.mockResolvedValue({ data: { session: session("user-a") }, error: null });
        mocks.signOut.mockImplementation(async (options?: { scope?: string }) => options?.scope === "local"
            ? { error: null }
            : { error: new Error("Remote logout unavailable") });
        const queryClient = testQueryClient();
        const view = render(<QueryClientProvider client={queryClient}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);
        expect(await screen.findByText("user-a")).toBeVisible();
        queryClient.setQueryData(["profile", "me"], { private: true });

        await userEvent.click(screen.getByRole("button", { name: "Logout" }));

        expect(await screen.findByText("anonymous")).toBeVisible();
        expect(screen.getByRole("alert")).toHaveTextContent("other sessions may remain active");
        expect(queryClient.getQueryData(["profile", "me"])).toBeUndefined();
        expect(mocks.signOut).toHaveBeenNthCalledWith(1);
        expect(mocks.signOut).toHaveBeenNthCalledWith(2, { scope: "local" });

        view.unmount();
        mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
        render(<QueryClientProvider client={testQueryClient()}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);
        expect(await screen.findByText("anonymous")).toBeVisible();
    });

    it("keeps UI and cache authenticated when remote and local logout both fail", async () => {
        mocks.getSession.mockResolvedValue({ data: { session: session("user-a") }, error: null });
        mocks.signOut.mockResolvedValue({ error: new Error("Logout unavailable") });
        const queryClient = testQueryClient();
        render(<QueryClientProvider client={queryClient}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);
        expect(await screen.findByText("user-a")).toBeVisible();
        queryClient.setQueryData(["leagues", "mine"], [{ id: "private-a" }]);

        await userEvent.click(screen.getByRole("button", { name: "Logout" }));

        expect(await screen.findByText("user-a")).toBeVisible();
        expect(screen.getByRole("alert")).toHaveTextContent("session remains active");
        expect(queryClient.getQueryData(["leagues", "mine"])).toEqual([{ id: "private-a" }]);
        expect(mocks.socketApply).not.toHaveBeenLastCalledWith(null);
    });

    it("keeps the user unauthenticated when local profile sync fails", async () => {
        mocks.getSession.mockResolvedValue({ data: { session: session("user-a") }, error: null });
        mocks.sync.mockRejectedValueOnce(new Error("Profile sync unavailable"));
        render(<QueryClientProvider client={testQueryClient()}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);
        expect(await screen.findByText("anonymous")).toBeVisible();
        expect(screen.getByRole("alert")).toHaveTextContent("Profile sync unavailable");
        expect(mocks.socketApply).toHaveBeenLastCalledWith(null);
    });

    it("isolates cached data when auth changes to another account and unsubscribes on unmount", async () => {
        mocks.getSession.mockResolvedValue({ data: { session: session("user-a") }, error: null });
        const queryClient = testQueryClient();
        const view = render(<QueryClientProvider client={queryClient}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);
        expect(await screen.findByText("user-a")).toBeVisible();
        queryClient.setQueryData(["leagues", "mine"], [{ id: "private-a" }]);

        mocks.authCallback?.("SIGNED_IN", session("user-b"));
        expect(await screen.findByText("user-b")).toBeVisible();
        expect(queryClient.getQueryData(["leagues", "mine"])).toBeUndefined();
        view.unmount();
        await waitFor(() => expect(mocks.unsubscribe).toHaveBeenCalledOnce());
    });
});
