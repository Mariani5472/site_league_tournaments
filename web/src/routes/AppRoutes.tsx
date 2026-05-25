import { DashboardPage } from "@/pages/DashBoardPage";
import { LoginPage } from "@/pages/LoginPage";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}