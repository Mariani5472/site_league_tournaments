import { LoginPage } from "@/modules/login/pages/LoginPage";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DashboardPage } from "@/modules/dashboard/pages/DashboardPage";
import { PublicLayout } from "@/layouts/PublicLayout";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import { LeaguePage } from "@/modules/leagues/pages/LeaguePage";
import { LeaguesPage } from "@/modules/leagues/pages/LeaguesPage";
import { ProfilePage } from "@/modules/profile/pages/ProfilePage";
import { LeagueSettingsPage } from "@/modules/leagues/pages/LeagueSettingsPage";
import { LobbyPage } from "@/modules/lobbies/pages/LobbyPage";
import { LandingPage } from "@/modules/landing/pages/LandingPage";
import { FallbackRedirect } from "./FallbackRedirect";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
            path="/"
            element={<LandingPage />}
          />

        <Route 
          element={<PublicLayout />} 
        >
          <Route
            path="/login"
            element={<LoginPage />}
          />
        </Route>          
        <Route
          element={<ProtectedLayout />}
        >
          <Route
            path="/main"
            element={<DashboardPage />}
          />
          <Route
            path="/leagues/:id"
            element={<LeaguePage />}
          />
          <Route
            path="/leagues"
            element={<LeaguesPage  />}
          />
          <Route
            path="/profile"
            element={<ProfilePage />}
          />
          <Route
            path="/leagues/:id/settings"
            element={<LeagueSettingsPage />}
          />
          <Route
              path="/leagues/:leagueId/lobbies/:lobbyId"
              element={<LobbyPage />}
          />
        </Route>
        <Route
          path="*"
          element={<FallbackRedirect />}
        />

      </Routes>
    </BrowserRouter>
  )
}