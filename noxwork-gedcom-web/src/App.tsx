import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/useAuthStore';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import Dashboard from './pages/Dashboard';
import VisualizerPage from './pages/VisualizerPage';

/**
 * App — Root router component.
 *
 * Route map:
 *   /                   → redirect to /dashboard (ProtectedRoute handles unauthenticated → /login)
 *   /login              → LoginPage (Google SSO + Email/Password)
 *   /auth/callback      → AuthCallback (Supabase OAuth/email exchange)
 *   /forgot-password    → ForgotPassword (send reset email)
 *   /update-password    → UpdatePassword (set new password after reset)
 *   /dashboard          → Dashboard (protected, project list)
 *   /visualizer         → VisualizerPage (protected, GEDCOM canvas — upload mode)
 *   /visualizer/:id     → VisualizerPage (protected, specific project canvas)
 */
export default function App() {
    const initialize = useAuthStore((s) => s.initialize);

    // Rehydrate session from Supabase local storage on first load
    useEffect(() => {
        initialize();
    }, [initialize]);

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/update-password" element={<UpdatePassword />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/visualizer" element={<VisualizerPage />} />
                <Route path="/visualizer/:projectId" element={<VisualizerPage />} />
            </Route>

            {/* Catch-all → dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}
