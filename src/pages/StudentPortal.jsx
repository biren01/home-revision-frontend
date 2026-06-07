// frontend/src/pages/StudentPortal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import SubjectSelector from '../components/student/SubjectSelector';
import PracticeSession from '../components/student/PracticeSession';
import { questionAPI } from '../services/api';
import { clearCurrentStudent, getCurrentStudent } from '../services/studentAuth';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase();
};

const getYearNumber = (value) => {
  const match = String(value || '').match(/\d+/);
  return match ? match[0] : '';
};

const StudentPortal = () => {
  const [metadata, setMetadata] = useState(null);
  const [sessionConfig, setSessionConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(() => getCurrentStudent());
  const navigate = useNavigate();

  const studentInitials = useMemo(
    () => getInitials(student?.studentName || student?.username),
    [student]
  );
  const studentYear = getYearNumber(student?.grade || student?.year);

  useEffect(() => {
    loadMetadata();
  }, []);

  const loadMetadata = async () => {
    try {
      const response = await questionAPI.getMetadata();
      setMetadata(response.data);
    } catch (error) {
      toast.error('Failed to load subjects');
      console.error('Error loading metadata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPractice = (config) => {
    setSessionConfig(config);
  };

  const handleEndSession = () => {
    setSessionConfig(null);
  };

  const handleLogout = () => {
    clearCurrentStudent();
    setStudent(null);
    toast.success('Signed out successfully');
    navigate('/');
  };

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="rounded-lg bg-white px-5 py-4 font-semibold text-slate-700 shadow-soft">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 grid-cols-2 gap-1 rounded-lg bg-slate-950 p-2 shadow-soft">
                <span className="rounded-sm bg-mint" />
                <span className="rounded-sm bg-brand-500" />
                <span className="rounded-sm bg-coral" />
                <span className="rounded-sm bg-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                  Practice & Revision
                </h1>
                <p className="mt-2 text-base leading-7 text-slate-600">
                  Welcome{student?.studentName ? `, ${student.studentName}` : ''}. Choose your subject and start practising.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Year of student</p>
                <p className="text-base font-bold text-slate-950">{studentYear ? `Year ${studentYear}` : 'Not set'}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-300 bg-white font-bold text-slate-950">
                {studentInitials}
              </div>
              <button
                onClick={handleLogout}
                className="secondary-button"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {!sessionConfig ? (
          metadata && (
            <SubjectSelector
              metadata={metadata}
              student={student}
              onStart={handleStartPractice}
            />
          )
        ) : (
          <PracticeSession
            config={sessionConfig}
            onEnd={handleEndSession}
          />
        )}
      </main>
    </div>
  );
};

export default StudentPortal;
