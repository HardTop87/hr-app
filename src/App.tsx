import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import TimeTracking from './pages/TimeTracking';
import CompanySettings from './pages/CompanySettings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Documents from './pages/Documents';
import Absences from './pages/Absences';
import AbsenceManager from './pages/AbsenceManager';
import TeamCalendar from './pages/TeamCalendar';
import OnboardingAdmin from './pages/OnboardingAdmin';
import OnboardingMyPlan from './pages/OnboardingMyPlan';
import UserManagement from './pages/admin/UserManagement';
import PayrollReport from './pages/admin/PayrollReport';
import AssetManagement from './pages/admin/AssetManagement';

function App() {
  return (
    <BrowserRouter basename="/hr-app">
      <AuthProvider>
        <NotificationProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#4D2B41',
                color: '#fff',
                borderRadius: '8px',
                padding: '12px 20px',
              },
              success: {
                iconTheme: {
                  primary: '#FF79C9',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="employees" element={<Employees />} />
                <Route path="time-tracking" element={<TimeTracking />} />
                <Route path="absences" element={<Absences />} />
                <Route path="calendar" element={<TeamCalendar />} />
                <Route path="documents" element={<Documents />} />
                <Route path="profile" element={<Profile />} />
                <Route path="onboarding/my-plan" element={<OnboardingMyPlan />} />
                
                {/* Admin-only routes */}
                <Route element={<AdminRoute />}>
                  <Route path="absences/manager" element={<AbsenceManager />} />
                  <Route path="onboarding/admin" element={<OnboardingAdmin />} />
                  <Route path="admin/users" element={<UserManagement />} />
                  <Route path="admin/payroll" element={<PayrollReport />} />
                  <Route path="admin/assets" element={<AssetManagement />} />
                  <Route path="admin/settings" element={<CompanySettings />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
