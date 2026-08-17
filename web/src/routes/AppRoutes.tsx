import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PublicLayout } from "@/layouts/PublicLayout";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import { FallbackRedirect } from "./FallbackRedirect";
import { t } from "@/i18n";

const LandingPage = lazy(() => import("@/modules/landing/pages/LandingPage").then(module => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import("@/modules/login/pages/LoginPage").then(module => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import("@/modules/login/pages/RegisterPage").then(module => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import("@/modules/login/pages/ForgotPasswordPage").then(module => ({ default: module.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("@/modules/login/pages/ResetPasswordPage").then(module => ({ default: module.ResetPasswordPage })));
const DashboardPage = lazy(() => import("@/modules/dashboard/pages/DashboardPage").then(module => ({ default: module.DashboardPage })));
const LeaguePage = lazy(() => import("@/modules/leagues/pages/LeaguePage").then(module => ({ default: module.LeaguePage })));
const LeaguesPage = lazy(() => import("@/modules/leagues/pages/LeaguesPage").then(module => ({ default: module.LeaguesPage })));
const ProfilePage = lazy(() => import("@/modules/profile/pages/ProfilePage").then(module => ({ default: module.ProfilePage })));
const LeagueSettingsPage = lazy(() => import("@/modules/leagues/pages/LeagueSettingsPage").then(module => ({ default: module.LeagueSettingsPage })));
const LobbyPage = lazy(() => import("@/modules/lobbies/pages/LobbyPage").then(module => ({ default: module.LobbyPage })));

export function RouteLoadingFallback() {
    return <main aria-busy="true" aria-live="polite"><p role="status">{t("async.page")}</p></main>;
}

export function AppRoutes() {
    return (<BrowserRouter>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />}/>

          <Route element={<PublicLayout />}>
            <Route path="/login" element={<LoginPage />}/>
            <Route path="/register" element={<RegisterPage />}/>
            <Route path="/forgot-password" element={<ForgotPasswordPage />}/>
          </Route>
          <Route path="/reset-password" element={<ResetPasswordPage />}/>
          <Route element={<ProtectedLayout />}>
            <Route path="/main" element={<DashboardPage />}/>
            <Route path="/leagues/:id" element={<LeaguePage />}/>
            <Route path="/leagues" element={<LeaguesPage />}/>
            <Route path="/profile" element={<ProfilePage />}/>
            <Route path="/leagues/:id/settings" element={<LeagueSettingsPage />}/>
            <Route path="/leagues/:leagueId/lobbies/:lobbyId" element={<LobbyPage />}/>
          </Route>
          <Route path="*" element={<FallbackRedirect />}/>

        </Routes>
      </Suspense>
    </BrowserRouter>);
}
