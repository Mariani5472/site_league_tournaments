import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import { t } from "@/i18n";
import { HttpStatusPage } from "@/pages/HttpStatusPage";

const LandingPage = lazy(() =>
    import("@/modules/landing/pages/LandingPage").then(module => ({ default: module.LandingPage }))
);
const LoginPage = lazy(() =>
    import("@/modules/login/pages/LoginPage").then(module => ({ default: module.LoginPage }))
);
const RegisterPage = lazy(() =>
    import("@/modules/login/pages/RegisterPage").then(module => ({ default: module.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
    import("@/modules/login/pages/ForgotPasswordPage").then(module => ({
        default: module.ForgotPasswordPage,
    }))
);
const ResetPasswordPage = lazy(() =>
    import("@/modules/login/pages/ResetPasswordPage").then(module => ({
        default: module.ResetPasswordPage,
    }))
);
const DashboardPage = lazy(() =>
    import("@/modules/dashboard/pages/DashboardPage").then(module => ({
        default: module.DashboardPage,
    }))
);
const LeaguePage = lazy(() =>
    import("@/modules/leagues/pages/LeaguePage").then(module => ({ default: module.LeaguePage }))
);
const LeaguesPage = lazy(() =>
    import("@/modules/leagues/pages/LeaguesPage").then(module => ({ default: module.LeaguesPage }))
);
const ProfilePage = lazy(() =>
    import("@/modules/profile/pages/ProfilePage").then(module => ({ default: module.ProfilePage }))
);
const PublicProfilePage = lazy(() =>
    import("@/modules/profile/pages/PublicProfilePage").then(module => ({
        default: module.PublicProfilePage,
    }))
);
const PlayersPage = lazy(() =>
    import("@/modules/profile/pages/PlayersPage").then(module => ({
        default: module.PlayersPage,
    }))
);
const LeagueSettingsPage = lazy(() =>
    import("@/modules/leagues/pages/LeagueSettingsPage").then(module => ({
        default: module.LeagueSettingsPage,
    }))
);
const LobbyPage = lazy(() =>
    import("@/modules/lobbies/pages/LobbyPage").then(module => ({ default: module.LobbyPage }))
);
const MatchDetailPage = lazy(() =>
    import("@/modules/matches/MatchDetailPage").then(module => ({
        default: module.MatchDetailPage,
    }))
);
const InvitationsPage = lazy(() =>
    import("@/modules/leagues/pages/InvitationsPage").then(module => ({
        default: module.InvitationsPage,
    }))
);
const OpsGuard = lazy(() =>
    import("@/modules/ops/OpsGuard").then(module => ({ default: module.OpsGuard }))
);
const OpsDirectoryPage = lazy(() =>
    import("@/modules/ops/pages/OpsDirectoryPage").then(module => ({
        default: module.OpsDirectoryPage,
    }))
);
const OpsUserDetailPage = lazy(() =>
    import("@/modules/ops/pages/OpsUserDetailPage").then(module => ({
        default: module.OpsUserDetailPage,
    }))
);
const OpsLeagueDetailPage = lazy(() =>
    import("@/modules/ops/pages/OpsLeagueDetailPage").then(module => ({
        default: module.OpsLeagueDetailPage,
    }))
);

export function RouteLoadingFallback() {
    return (
        <main aria-busy="true" aria-live="polite">
            <p role="status">{t("async.page")}</p>
        </main>
    );
}

export function AppRoutes() {
    return (
        <BrowserRouter>
            <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                    <Route path="/" element={<LandingPage />} />

                    <Route element={<PublicLayout />}>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    </Route>
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route
                        path="/session-expired"
                        element={<HttpStatusPage kind="sessionExpired" />}
                    />
                    <Route element={<ProtectedLayout />}>
                        <Route path="/main" element={<DashboardPage />} />
                        <Route path="/leagues/:id" element={<LeaguePage />} />
                        <Route path="/leagues" element={<LeaguesPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/players" element={<PlayersPage />} />
                        <Route path="/invitations" element={<InvitationsPage />} />
                        <Route path="/players/:userId" element={<PublicProfilePage />} />
                        <Route path="/matches/:matchId" element={<MatchDetailPage />} />
                        <Route path="/leagues/:id/settings" element={<LeagueSettingsPage />} />
                        <Route path="/leagues/:leagueId/lobbies/:lobbyId" element={<LobbyPage />} />
                        <Route element={<OpsGuard />}>
                            <Route path="/ops" element={<OpsDirectoryPage />} />
                            <Route path="/ops/users/:userId" element={<OpsUserDetailPage />} />
                            <Route
                                path="/ops/leagues/:leagueId"
                                element={<OpsLeagueDetailPage />}
                            />
                        </Route>
                    </Route>
                    <Route path="/forbidden" element={<HttpStatusPage kind="forbidden" />} />
                    <Route path="*" element={<HttpStatusPage kind="notFound" />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
