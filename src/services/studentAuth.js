const STUDENT_KEY = 'studentUser';
const STUDENTS_KEY = 'registeredStudents';

export const getCurrentStudent = () => {
  try {
    const student = localStorage.getItem(STUDENT_KEY);
    return student ? JSON.parse(student) : null;
  } catch {
    return null;
  }
};

export const setCurrentStudent = (student) => {
  localStorage.setItem(STUDENT_KEY, JSON.stringify(student));
};

export const clearCurrentStudent = () => {
  localStorage.removeItem(STUDENT_KEY);
};

const getRegisteredStudents = () => {
  try {
    return JSON.parse(localStorage.getItem(STUDENTS_KEY)) || [];
  } catch {
    return [];
  }
};

const saveRegisteredStudents = (students) => {
  localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
};

export const registerStudentLocally = ({ studentName, username, password, grade }) => {
  const trimmedUsername = username.trim().toLowerCase();
  const students = getRegisteredStudents();

  if (students.some((student) => student.username === trimmedUsername)) {
    throw new Error('This username is already registered.');
  }

  const newStudent = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    studentName: studentName.trim(),
    username: trimmedUsername,
    password,
    grade,
    createdAt: new Date().toISOString(),
  };

  saveRegisteredStudents([...students, newStudent]);

  const { password: _password, ...safeStudent } = newStudent;
  setCurrentStudent(safeStudent);
  return safeStudent;
};

export const signInStudentLocally = ({ username, password }) => {
  const trimmedUsername = username.trim().toLowerCase();
  const students = getRegisteredStudents();
  const student = students.find(
    (item) => item.username === trimmedUsername && item.password === password
  );

  if (!student) {
    throw new Error('Invalid username or password.');
  }

  const { password: _password, ...safeStudent } = student;
  setCurrentStudent(safeStudent);
  return safeStudent;
};
