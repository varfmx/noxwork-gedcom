import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

/**
 * ProtectedRoute — Redirects to /login if the user is not authenticated.
 *
 * Usage in router:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 */
export function ProtectedRoute() {
    const { user, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-nox-surface">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 rounded-full border-2 border-nox-cobalt border-t-transparent animate-spin" />
                    <p className="text-nox-text-muted text-sm">Loading…</p>
                </div>
            </div>
        );
    }

    return user ? <Outlet /> : <Navigate to="/login" replace />;
}
