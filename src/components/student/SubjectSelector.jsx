// frontend/src/components/student/SubjectSelector.jsx
import React, { useMemo, useState } from 'react';

const extractYearNumber = (value) => {
  if (value === undefined || value === null) return '';
  const match = String(value).match(/\d+/);
  return match ? match[0] : String(value);
};

const normaliseSubjects = (subjects) => {
  if (!subjects) return [];
  if (Array.isArray(subjects)) {
    return subjects
      .map((subject) => (typeof subject === 'string' ? subject : subject?.subject || subject?.name))
      .filter(Boolean);
  }
  return Object.values(subjects).flat().filter(Boolean);
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const getSubjectsForYear = (metadata, year) => {
  const yearKey = String(year);
  const subjectsByYear = metadata?.subjectsByYear || metadata?.subjects_by_year;

  if (subjectsByYear?.[yearKey]) return unique(normaliseSubjects(subjectsByYear[yearKey]));
  if (subjectsByYear?.[`Year ${yearKey}`]) return unique(normaliseSubjects(subjectsByYear[`Year ${yearKey}`]));

  const subjectEntries = Array.isArray(metadata?.subjects) ? metadata.subjects : [];
  const filteredEntries = subjectEntries.filter((entry) => {
    if (typeof entry === 'string') return false;
    const entryYear = extractYearNumber(entry?.year || entry?.grade || entry?.schoolYear);
    return entryYear === yearKey;
  });

  if (filteredEntries.length > 0) {
    return unique(filteredEntries.map((entry) => entry.subject || entry.name).filter(Boolean));
  }

  // Current backend metadata returns a flat subjects list. In that case the backend
  // still filters by year when the practice session is started, so show the available
  // subject buttons while sending the signed-in student's year with the request.
  return unique(normaliseSubjects(metadata?.subjects));
};

const getTopicsForSelection = (metadata, year, subject) => {
  if (!subject) return [];
  const topics = metadata?.topics || {};
  const yearKey = String(year);

  const nestedByYear = topics?.[yearKey]?.[subject] || topics?.[`Year ${yearKey}`]?.[subject];
  if (Array.isArray(nestedByYear)) return nestedByYear;

  const flatBySubject = topics?.[subject];
  return Array.isArray(flatBySubject) ? flatBySubject : [];
};

const SubjectSelector = ({ metadata, onStart, student }) => {
  const studentYear = extractYearNumber(student?.grade || student?.year);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('');

  const availableSubjects = useMemo(
    () => getSubjectsForYear(metadata, studentYear),
    [metadata, studentYear]
  );

  const availableTopics = useMemo(
    () => getTopicsForSelection(metadata, studentYear, selectedSubject),
    [metadata, studentYear, selectedSubject]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart({
      year: studentYear,
      subject: selectedSubject,
      topic: selectedTopic || undefined,
      difficulty: difficulty || undefined,
      count: questionCount,
    });
  };

  return (
    <section className="panel mx-auto max-w-4xl p-5 text-center sm:p-7">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Practice setup</p>
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Choose a subject</h2>
      <p className="mx-auto mb-6 mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Available subjects are displayed according to the student year. Select a subject to choose a topic and start practice.
      </p>

      {!studentYear && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Student year is missing. Please sign out and sign up again with a year of study.
        </div>
      )}

      {studentYear && availableSubjects.length === 0 && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-700">
          No subjects are currently available for Year {studentYear}.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-wrap justify-center gap-4">
          {availableSubjects.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => {
                setSelectedSubject(subject);
                setSelectedTopic('');
              }}
              className={`min-w-32 rounded-lg border px-8 py-3 font-semibold transition ${
                selectedSubject === subject
                  ? 'border-brand-600 bg-brand-600 text-white shadow-md'
                  : 'border-slate-300 bg-white text-slate-800 hover:border-brand-500 hover:text-brand-700'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>

        {selectedSubject && (
          <div className="mx-auto max-w-2xl rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-left">
            <p className="mb-4 text-center text-sm font-semibold text-slate-700">
              {selectedSubject} selected. Choose optional settings below.
            </p>

            {availableTopics.length > 0 && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-700">Topic</label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="field"
                >
                  <option value="">All Topics</option>
                  {availableTopics.map((topic) => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="field"
                >
                  <option value="">All Levels</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Questions</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value, 10))}
                  className="field"
                >
                  {[5, 10, 15, 20, 25, 30].map((count) => (
                    <option key={count} value={count}>{count}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="primary-button mt-5 w-full"
            >
              Start Practice Session
            </button>
          </div>
        )}
      </form>
    </section>
  );
};

export default SubjectSelector;
