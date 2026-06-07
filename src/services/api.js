import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include admin/student token in requests
api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('adminToken');
  const student = localStorage.getItem('studentUser');

  if (adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`;
    return config;
  }

  if (student) {
    try {
      const parsedStudent = JSON.parse(student);
      if (parsedStudent?.token) {
        config.headers.Authorization = `Bearer ${parsedStudent.token}`;
      }
    } catch {
      // Ignore invalid local storage data.
    }
  }

  return config;
});


export const authAPI = {
  studentSignup: (data) => api.post('students/signup', data),
  studentSignin: (data) => api.post('students/signin', data),
};

export const adminAPI = {
  login: (password) => api.post('admin/login', { password }),
  createQuestion: (data) => api.post('admin/questions', data),
  updateQuestion: (year, subject, id, data) => 
    api.put(`admin/questions/${year}/${subject}/${id}`, data),
  deleteQuestion: (year, subject, id) => 
    api.delete(`admin/questions/${year}/${subject}/${id}`),
  bulkImport: (questions) => api.post('admin/questions/bulk', { questions }),
};

export const questionAPI = {
  getMetadata: () => api.get('questions/metadata'),
  // If your backend prefers paths over query strings:
  getQuestions: (params) => 
  api.get('questions', { params }),

getQuestion: (year, subject, id) => 
  api.get(`questions/${year}/${subject}/${id}`),
  getUploadUrl: (fileName, fileType) => 
    api.post('questions/upload-url', { fileName, fileType }),
};

export const practiceAPI = {
  startSession: (config) => 
    api.post('practice/session', config),

  submitAnswers: (sessionId, answers) => 
    api.post('practice/submit', {
      sessionId,
      answers
    }),
};


export default api;
