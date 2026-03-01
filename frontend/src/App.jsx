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

// Check if running on Android platform (Capacitor Android app)
// Using multiple checks for reliability
const isAndroid = (() => {
  try {
    // Method 1: Check Capacitor platform
    const platform = Capacitor.getPlatform();
    if (platform === 'android') {
      return true;
    }
    
    // Method 2: Check if Capacitor is native platform
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    
    // Method 3: Check for Capacitor object in window
    if (typeof window !== 'undefined' && window.Capacitor) {
      const cap = window.Capacitor;
      if (cap.getPlatform && cap.getPlatform() === 'android') {
        return true;
      }
      if (cap.isNativePlatform && cap.isNativePlatform()) {
        return true;
      }
    }
    
    // Method 4: Check user agent for Android
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('android')) {
        return true;
      }
    }
  } catch (e) {
    console.log('Capacitor check error:', e);
  }
  return false;
})();

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          {/* For Android, redirect root to login directly, skip landing page */}
          {isAndroid ? (
            <Route path="/" element={<Navigate to="/login" replace />} />
          ) : (
            <Route path="/" element={<Landing />} />
          )}
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

