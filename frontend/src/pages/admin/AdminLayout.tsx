import { useEffect } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.webp';

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
      <header className="bg-gradient-to-r from-fortune-blue via-fortune-blueDark to-fortune-green">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Fortune Sacco" className="h-9 w-9 shrink-0 object-contain" />
            <div>
              <p className="font-display font-semibold leading-tight text-white">Fortune Sacco Admin</p>
              <p className="text-xs text-white/75">Your Success, Our Success · Review portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-white/80">{name}</span>
            <button onClick={logout} className="text-sm font-semibold text-white underline-offset-2 hover:underline">
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
