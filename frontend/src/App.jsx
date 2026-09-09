import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InternalLeads from './pages/InternalLeads';
import Reports from './pages/Reports';
import DropdownManager from './pages/DropdownManager';
import UserManagement from './pages/UserManagement';
import CarPackageMaster from './pages/CarPackageMaster';
import CarPackageDaywise from './pages/CarPackageDaywise';
import CarPackageAccounts from './pages/CarPackageAccounts';

import SetNewPassword from './pages/SetNewPassword';


// Protected Route wrapper with role-based restriction
const ProtectedRoute = ({ children, allowedRoles, allowPendingReset = false }) => {
  const { user, isLoading } = React.useContext(AuthContext);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustResetPassword && !allowPendingReset) {
    return <Navigate to="/set-new-password" replace />;
  }

  const isOps = user.role?.toLowerCase() === 'ops';

  if (!user.mustResetPassword && allowPendingReset) {
    return <Navigate to={isOps ? "/car-packages/master" : "/dashboard"} replace />;
  }

  if (allowedRoles && !allowedRoles.some(r => r.toLowerCase() === user.role?.toLowerCase())) {
    // If not authorized, redirect Ops to car packages, else to dashboard
    return <Navigate to={isOps ? "/car-packages/master" : "/dashboard"} replace />;
  }

  return children;
};

// Root redirect helper based on role
const RootRedirect = () => {
  const { user, isLoading } = React.useContext(AuthContext);
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role?.toLowerCase() === 'ops') {
    return <Navigate to="/car-packages/master" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/set-new-password"
            element={
              <ProtectedRoute allowPendingReset={true}>
                <SetNewPassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin', 'prop_add', 'team_member']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leads"
            element={
              <ProtectedRoute allowedRoles={['admin', 'prop_add', 'team_member']}>
                <InternalLeads />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'prop_add']}>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/car-packages/master"
            element={
              <ProtectedRoute allowedRoles={['admin', 'ops']}>
                <CarPackageMaster />
              </ProtectedRoute>
            }
          />
          <Route
            path="/car-packages/daywise"
            element={
              <ProtectedRoute allowedRoles={['admin', 'ops']}>
                <CarPackageDaywise />
              </ProtectedRoute>
            }
          />
          <Route
            path="/car-packages/accounts"
            element={
              <ProtectedRoute allowedRoles={['admin', 'ops']}>
                <CarPackageAccounts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dropdown-manager"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DropdownManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-management"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <UserManagement />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>

      </BrowserRouter>
    </AuthProvider>
  );
}


export default App;

