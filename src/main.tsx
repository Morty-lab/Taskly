import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { Shell } from "./components/Shell.tsx";
import { RequireAdmin, RequireUser } from "./components/guards.tsx";
import "./index.css";
import { AuthProvider } from "./lib/auth.tsx";
import { AdminPage } from "./pages/Admin.tsx";
import { AuthPage } from "./pages/Auth.tsx";
import { JobsPage } from "./pages/Jobs.tsx";
import { ProfilePage } from "./pages/Profile.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
          <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
          <Route element={<RequireUser />}>
            <Route element={<Shell />}>
              <Route index element={<JobsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route element={<RequireAdmin />}>
                <Route path="admin" element={<AdminPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
