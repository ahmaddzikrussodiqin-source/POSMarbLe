import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Home/Landing';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import POS from './pages/POS/POS';
import AdminDashboard from './pages/Admin/AdminDashboard';
import VersionBadge from './components/VersionBadge';
import UpdateNotification from './components/UpdateNotification';
import { Capacitor } from '@capacitor/core';

// Check if running on Android platform
const isAndroid = Capacitor.isNativePlatform() && navigator.userAgent.includes('Android');

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* POS Route - accessible to both admin and cashier */}
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <POS />
              </ProtectedRoute>
            }
          />
          
          {/* Admin Dashboard Route - only accessible on web (not Android) */}
          {!isAndroid && (
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          )}
          
          {/* Redirect /admin to /pos for Android users */}
          {isAndroid && (
            <Route
              path="/admin"
              element={<Navigate to="/pos" replace />}
            />
          )}
          
          {/* Default redirect for unknown routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Version display and update notification - only shows in Android app */}
        <VersionBadge />
        <UpdateNotification />
      </Router>
    </AuthProvider>
  );
}

export default App;

