import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { OnboardingProvider } from './context/OnboardingContext';
import OnboardingWizard from './pages/OnboardingWizard';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminApplicationDetail from './pages/admin/AdminApplicationDetail';
import AdminLayout from './pages/admin/AdminLayout';

export default function App() {
  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <Routes>
        <Route
          path="/"
          element={
            <OnboardingProvider>
              <OnboardingWizard />
            </OnboardingProvider>
          }
        />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="applications/:id" element={<AdminApplicationDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
