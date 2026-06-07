import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';
import {
  registerStudentLocally,
  setCurrentStudent,
  signInStudentLocally,
} from '../services/studentAuth';

const initialSignUp = {
  studentName: '',
  username: '',
  password: '',
  grade: '',
};

const initialSignIn = {
  username: '',
  password: '',
};

const gradeOptions = ['Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11'];

const LandingPage = () => {
  const [mode, setMode] = useState('signin');
  const [signUpForm, setSignUpForm] = useState(initialSignUp);
  const [signInForm, setSignInForm] = useState(initialSignIn);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSignUpChange = (event) => {
    const { name, value } = event.target;
    setSignUpForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSignInChange = (event) => {
    const { name, value } = event.target;
    setSignInForm((previous) => ({ ...previous, [name]: value }));
  };

  const normaliseStudentResponse = (data, fallback) => ({
    id: data?.student?.id || data?.id || fallback.username,
    studentName: data?.student?.studentName || data?.studentName || fallback.studentName || fallback.username,
    username: data?.student?.username || data?.username || fallback.username,
    grade: data?.student?.grade || data?.grade || fallback.grade,
    token: data?.token,
  });

  const handleSignUp = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      let student;
      try {
        const response = await authAPI.studentSignup(signUpForm);
        student = normaliseStudentResponse(response.data, signUpForm);
        setCurrentStudent(student);
      } catch (apiError) {
        student = registerStudentLocally(signUpForm);
      }

      toast.success('Account created successfully');
      navigate('/student');
    } catch (error) {
      toast.error(error.message || 'Unable to create account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      let student;
      try {
        const response = await authAPI.studentSignin(signInForm);
        student = normaliseStudentResponse(response.data, signInForm);
        setCurrentStudent(student);
      } catch (apiError) {
        student = signInStudentLocally(signInForm);
      }

      toast.success(`Welcome back, ${student.studentName}`);
      navigate('/student');
    } catch (error) {
      toast.error(error.message || 'Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-ink">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-ink text-sm font-black text-white shadow-soft">
            PR
          </div>
          <div className="text-left">
            <p className="text-lg font-bold tracking-tight">Practice & Revision</p>
            <p className="text-sm text-muted">Question bank for home learning</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="secondary-button hidden sm:inline-flex"
        >
          Admin
        </button>
      </header>

      <main className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-12 pt-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-16 lg:pt-12">
        <section className="text-left">
          <span className="mb-5 inline-flex rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm">
            Learn, practise, track progress
          </span>
          <h1 className="mb-6 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Build confidence with focused revision questions.
          </h1>
          <p className="mb-8 max-w-2xl text-lg leading-8 text-slate-600">
            Students can choose their school year, subject, topic, difficulty, and number of questions. The app supports structured practice and progress review from one simple dashboard.
          </p>

          <div className="grid max-w-3xl gap-3 sm:grid-cols-3">
            <FeatureCard number="01" title="Personal access" description="Students keep their own practice space." />
            <FeatureCard number="02" title="Targeted practice" description="Filter by year, topic, and difficulty." />
            <FeatureCard number="03" title="Progress view" description="Spot strengths and next revision areas." />
          </div>
        </section>

        <section className="panel p-5 sm:p-7">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Student access</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              {mode === 'signin' ? 'Welcome back' : 'Create student account'}
            </h2>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`rounded-md py-2.5 font-semibold transition ${mode === 'signin' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`rounded-md py-2.5 font-semibold transition ${mode === 'signup' ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Sign up
            </button>
          </div>

          {mode === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4 text-left">
              <FormInput label="Username" name="username" value={signInForm.username} onChange={handleSignInChange} autoComplete="username" required />
              <FormInput label="Password" name="password" type="password" value={signInForm.password} onChange={handleSignInChange} autoComplete="current-password" required />
              <SubmitButton disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in and continue'}</SubmitButton>
              <p className="text-center text-sm text-slate-600">
                New student?{' '}
                <button type="button" onClick={() => setMode('signup')} className="font-semibold text-brand-700 hover:underline">
                  Create an account
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4 text-left">
              <FormInput label="Student name" name="studentName" value={signUpForm.studentName} onChange={handleSignUpChange} autoComplete="name" required />
              <FormInput label="Username" name="username" value={signUpForm.username} onChange={handleSignUpChange} autoComplete="username" required />
              <FormInput label="Password" name="password" type="password" value={signUpForm.password} onChange={handleSignUpChange} autoComplete="new-password" minLength={6} required />
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="grade">Grade / year of study</label>
                <select
                  id="grade"
                  name="grade"
                  value={signUpForm.grade}
                  onChange={handleSignUpChange}
                  className="field"
                  required
                >
                  <option value="">Select year</option>
                  {gradeOptions.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                </select>
              </div>
              <SubmitButton disabled={submitting}>{submitting ? 'Creating account...' : 'Create account'}</SubmitButton>
              <p className="text-center text-sm text-slate-600">
                Already registered?{' '}
                <button type="button" onClick={() => setMode('signin')} className="font-semibold text-brand-700 hover:underline">
                  Sign in
                </button>
              </p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
};

const FeatureCard = ({ number, title, description }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <p className="mb-3 text-xs font-bold text-coral">{number}</p>
    <h2 className="mb-2 text-base font-bold text-slate-950">{title}</h2>
    <p className="text-sm leading-6 text-slate-600">{description}</p>
  </div>
);

const FormInput = ({ label, ...props }) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor={props.name}>{label}</label>
    <input
      id={props.name}
      className="field"
      {...props}
    />
  </div>
);

const SubmitButton = ({ children, disabled }) => (
  <button
    type="submit"
    disabled={disabled}
    className="primary-button w-full"
  >
    {children}
  </button>
);

export default LandingPage;
