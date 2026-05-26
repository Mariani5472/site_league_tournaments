import { LoginPage } from "@/modules/login/pages/LoginPage";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DashboardPage } from "@/modules/dashboard/pages/DashboardPage";
import { PublicLayout } from "@/layouts/PublicLayout";
import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import { MyLeaguesPage } from "@/modules/leagues/pages/MyLeaguesPage";
import { LeaguePage } from "@/modules/leagues/pages/LeaguePage";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          element={<PublicLayout />} 
        >
          <Route path="/login" element={<LoginPage />} />
        </Route>          
        <Route
          element={<ProtectedLayout />}
        >
          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />
          <Route
            path="/leagues"
            element={<MyLeaguesPage />}
          />
          <Route
            path="/leagues/:id"
            element={<LeaguePage />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}