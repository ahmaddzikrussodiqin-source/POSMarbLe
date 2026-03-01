import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Capacitor } from '@capacitor/core';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check if running on Android platform
  const isAndroid = Capacitor.isNativePlatform() && navigator.userAgent.includes('Android');

  // Get success message from registration
  const successMessage = location.state?.message;

  useEffect(() => {
    // Auto-hide success message after 5 seconds
    if (successMessage) {
      const timer = setTimeout(() => {
        // Clear the message by replacing state
        navigate(location.pathname, { replace: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(username, password);
      // For Android users, always redirect to /pos regardless of role
      // For web users, redirect based on role
      if (isAndroid) {
        navigate('/pos');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/pos');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-700">POSMarbLe</h1>
          <p className="text-gray-500 mt-2">Cafe Management System</p>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg mb-4">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-700 focus:ring-4 focus:ring-amber-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="text-amber-600 hover:text-amber-700 font-medium">
              Register here
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>Default Admin: admin / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

