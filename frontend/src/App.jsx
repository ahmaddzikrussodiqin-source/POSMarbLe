import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import POS from './pages/POS/POS';
import AdminDashboard from './pages/Admin/AdminDashboard';
import VersionBadge from './components/VersionBadge';
import UpdateNotification from './components/UpdateNotification';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes - always redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />
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
          
          {/* Admin Dashboard Route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          
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

