import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "@/test/renderApp";
import { OpsDirectoryPage } from "./OpsDirectoryPage";
import { OpsUserDetailPage } from "./OpsUserDetailPage";

const useOpsUsers = vi.hoisted(() => vi.fn());
const useOpsLeagues = vi.hoisted(() => vi.fn());
const useOpsUser = vi.hoisted(() => vi.fn());
vi.mock("../hooks", () => ({
    useOpsUsers,
    useOpsLeagues,
    useOpsUser,
    useOpsLeague: vi.fn(),
}));

const listQuery = {
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
};

describe("Ops pages", () => {
    beforeEach(() => {
        useOpsUsers.mockReturnValue({
            ...listQuery,
            data: [
                {
                    id: "10000000-0000-4000-8000-000000000001",
                    nickname: "Operado",
                    avatarUrl: null,
                    createdAt: "2026-08-20T12:00:00.000Z",
                    isSuperAdmin: false,
                    membershipCount: 2,
                },
            ],
        });
        useOpsLeagues.mockReturnValue({ ...listQuery, data: [] });
        useOpsUser.mockReturnValue({
            isLoading: false,
            data: {
                id: "10000000-0000-4000-8000-000000000001",
                nickname: "Operado",
                email: "detail@test.local",
                avatarUrl: null,
                createdAt: "2026-08-20T12:00:00.000Z",
                isSuperAdmin: false,
                membershipCount: 1,
                accountStatus: "active",
                platformRoles: [],
                pendingRequestCount: 0,
                pendingInvitationCount: 0,
                activeLobby: null,
                memberships: [],
                recentMatches: [],
            },
            refetch: vi.fn(),
        });
    });

    it("keeps the user list minimal and links to its distinct detail route", () => {
        renderApp(<OpsDirectoryPage />, { route: "/ops?section=users" });
        expect(screen.getByRole("heading", { name: "Diretório operacional" })).toBeVisible();
        expect(screen.getByRole("link", { name: /Operado/ })).toHaveAttribute(
            "href",
            "/ops/users/10000000-0000-4000-8000-000000000001"
        );
        expect(screen.queryByText("detail@test.local")).not.toBeInTheDocument();
    });

    it("shows email only in the clearly identified user detail", () => {
        renderApp(<OpsUserDetailPage />, {
            route: "/ops/users/10000000-0000-4000-8000-000000000001",
        });
        expect(screen.getByText("Detalhe operacional do usuário")).toBeVisible();
        expect(screen.getByText("detail@test.local")).toBeVisible();
        expect(screen.getByRole("link", { name: "Voltar ao diretório" })).toHaveAttribute(
            "href",
            "/ops?section=users"
        );
    });
});
