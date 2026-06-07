// frontend/src/pages/AdminPortal.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import QuestionList from '../components/admin/QuestionList';
import QuestionForm from '../components/admin/QuestionForm';
import BulkUploader from '../components/admin/BulkUploader';
import Dashboard from '../components/admin/DashBoard';
import { adminAPI, questionAPI } from '../services/api';
import toast from 'react-hot-toast';

const navItems = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Questions', path: '/admin/questions' },
  { label: 'Bulk Upload', path: '/admin/bulk-upload' },
];

const AdminPortal = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAuthenticated(true);
      loadMetadata();
    } else {
      setLoading(false);
    }
  }, []);

  const loadMetadata = async () => {
    try {
      const response = await questionAPI.getMetadata();
      setMetadata(response.data);
    } catch (error) {
      console.error('Error loading metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (password) => {
    try {
      const response = await adminAPI.login(password);
      localStorage.setItem('adminToken', response.data.token);
      setIsAuthenticated(true);
      toast.success('Logged in successfully');
      loadMetadata();
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error('Invalid password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    navigate('/admin/login');
  };

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="rounded-lg bg-white px-5 py-4 font-semibold text-slate-700 shadow-soft">Loading admin...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Admin workspace</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Question Bank Dashboard</h1>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <nav className="flex flex-wrap gap-2 rounded-lg bg-slate-100 p-1">
                {navItems.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
                        active ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-4 py-2.5 font-semibold text-red-700 transition hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Routes>
          <Route path="/" element={<Navigate to="/admin/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard metadata={metadata} />} />
          <Route
            path="/questions"
            element={<QuestionList metadata={metadata} onRefresh={loadMetadata} />}
          />
          <Route
            path="/questions/new"
            element={<QuestionForm metadata={metadata} onSuccess={() => navigate('/admin/questions')} />}
          />
          <Route
            path="/questions/edit/:year/:subject/:questionId"
            element={<QuestionForm metadata={metadata} onSuccess={() => navigate('/admin/questions')} />}
          />
          <Route
            path="/bulk-upload"
            element={<BulkUploader onSuccess={() => navigate('/admin/questions')} />}
          />
        </Routes>
      </main>
    </div>
  );
};

const AdminLogin = ({ onLogin }) => {
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin(password);
  };

  return (
    <div className="app-shell flex items-center justify-center px-4">
      <div className="panel w-full max-w-md p-6 sm:p-7">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Secure admin</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Sign in to manage questions</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter admin password"
            className="field"
            required
          />
          <button
            type="submit"
            className="primary-button w-full"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminPortal;
