import { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';

export default function AdminLayout() {
  const navigate = useNavigate();
  const token = localStorage.getItem('fortune_admin_token');
  const name = localStorage.getItem('fortune_admin_name');

  const logout = () => {
    localStorage.removeItem('fortune_admin_token');
    localStorage.removeItem('fortune_admin_name');
    navigate('/admin/login');
  };

  useEffect(() => {
    if (!token) navigate('/admin/login');
  }, [token]);

  if (!token) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-fortune-cream">
      <header className="border-b border-fortune-ink/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-fortune-green font-display text-base font-semibold text-white">
              F
            </div>
            <div>
              <p className="font-display font-semibold leading-tight text-fortune-ink">Fortune Sacco Admin</p>
              <p className="text-xs text-fortune-ink/50">Application review portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-fortune-ink/60">{name}</span>
            <button onClick={logout} className="text-sm font-semibold text-fortune-terracotta">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
