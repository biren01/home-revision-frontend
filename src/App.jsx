// frontend/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LandingPage from './pages/LandingPage';
import StudentPortal from './pages/StudentPortal';
import AdminPortal from './pages/AdminPortal';
import { getCurrentStudent } from './services/studentAuth';

const ProtectedStudentRoute = () => {
  const student = getCurrentStudent();
  return student ? <StudentPortal /> : <Navigate to="/" replace />;
};

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/student" element={<ProtectedStudentRoute />} />
        <Route path="/admin/*" element={<AdminPortal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
