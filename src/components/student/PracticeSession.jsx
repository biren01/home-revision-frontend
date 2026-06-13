// frontend/src/components/student/PracticeSession.jsx
import React, { useEffect, useState } from 'react';
import QuizCard from './QuizCard';
import { practiceAPI } from '../../services/api';
import toast from 'react-hot-toast';
import MathText from '../common/MathText';

const isSelectedForStudents = (question) => (
  question.selectedForStudents === true ||
  question.visibleToStudents === true ||
  question.isSelectedForStudents === true ||
  question.isVisibleToStudents === true
);

const getStudentOrder = (question, fallbackIndex) => {
  const order = Number(question.studentDisplayOrder ?? question.displayOrder ?? question.selectionOrder);
  return Number.isFinite(order) ? order : fallbackIndex + 1;
};

const prepareStudentQuestions = (questions) => (
  (questions || [])
    .filter(isSelectedForStudents)
    .sort((a, b) => getStudentOrder(a, 0) - getStudentOrder(b, 0))
    .map((question, index) => ({
      ...question,
      studentDisplayNumber: index + 1,
    }))
);

const PracticeSession = ({ config, onEnd }) => {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    startSession();
  }, []);

  const startSession = async () => {
    try {
      setLoading(true);

      const requestConfig = {
        ...config,
        year: isNaN(config.year) ? config.year : parseInt(config.year, 10),
      };

      const response = await practiceAPI.startSession(requestConfig);
      const studentQuestions = prepareStudentQuestions(response.data.questions);
      if (studentQuestions.length === 0) {
        toast.error('No selected questions are currently visible for this practice selection');
        onEnd();
        return;
      }

      setQuestions(studentQuestions);
      setSessionId(response.data.sessionId);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'No questions found for this selection';
      toast.error(errorMsg);
      console.error('Practice Session Error:', error.response?.data || error.message);
      onEnd();
    } finally {
      setLoading(false);
    }
  };

  const getQuestionType = (question) => question.questionType || (question.options?.length ? 'multiple-choice' : 'subjective');

  const handleAnswer = (questionId, selectedAnswer) => {
    setAnswers((prev) => {
      const existing = prev.findIndex((answer) => answer.questionId === questionId);
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = {
          ...updated[existing],
          selectedAnswer,
        };
        return updated;
      }
      return [
        ...prev,
        {
          questionId,
          year: config.year,
          subject: config.subject,
          selectedAnswer,
        },
      ];
    });

    if (currentIndex < questions.length - 1) {
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 500);
    }
  };

  const handleSubmit = async () => {
    const multipleChoiceQuestions = questions.filter((question) => getQuestionType(question) === 'multiple-choice');
    const subjectiveQuestions = questions.filter((question) => getQuestionType(question) === 'subjective');

    if (multipleChoiceQuestions.length === 0) {
      setResults({
        summary: {
          score: null,
          correct: 0,
          totalQuestions: questions.length,
          subjectiveCount: subjectiveQuestions.length,
        },
        results: [],
      });
      setSubmitted(true);
      toast.success('Practice completed!');
      return;
    }

    try {
      setLoading(true);
      const multipleChoiceQuestionIds = new Set(multipleChoiceQuestions.map((question) => question.questionId));
      const onlineAnswers = answers.filter((answer) => multipleChoiceQuestionIds.has(answer.questionId));
      const response = await practiceAPI.submitAnswers(sessionId, onlineAnswers);
      setResults({
        ...response.data,
        summary: {
          ...response.data.summary,
          subjectiveCount: subjectiveQuestions.length,
        },
      });
      setSubmitted(true);
      toast.success('Practice completed!');
    } catch (error) {
      toast.error('Failed to submit answers');
      console.error('Error submitting answers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="rounded-lg bg-white px-5 py-4 font-semibold text-slate-700 shadow-soft">Preparing your questions...</div>
      </div>
    );
  }

  if (submitted && results) {
    return (
      <div className="panel p-5 sm:p-7">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-slate-950">Practice complete</h2>

        <div className="mb-8 rounded-lg bg-slate-950 p-6 text-white">
          {results.summary.score === null ? (
            <>
              <div className="mb-2 text-3xl font-bold">Written practice completed</div>
              <div className="text-lg">
                You completed {results.summary.subjectiveCount || results.summary.totalQuestions} written question(s).
              </div>
            </>
          ) : (
            <>
              <div className="mb-2 text-4xl font-bold">{results.summary.score}%</div>
              <div className="text-lg">
                You got {results.summary.correct} out of {results.summary.totalQuestions} online-marked questions correct
              </div>
            </>
          )}
          {!!results.summary.subjectiveCount && (
            <div className="mt-3 text-sm opacity-90">
              {results.summary.subjectiveCount} written question(s) should be checked by the teacher.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="mb-4 text-xl font-semibold text-slate-950">Review your answers</h3>
          {results.results.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              These were written answer questions. Please give your paper answer to your teacher for checking.
            </div>
          )}
          {results.results.map((result, index) => {
            const question = questions.find((item) => item.questionId === result.questionId);
            return (
              <div key={result.questionId} className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="mb-2 font-medium text-slate-950">
                      Question {index + 1}: <MathText>{question?.questionText}</MathText>
                    </p>
                    <p className={`text-sm font-semibold ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {result.isCorrect ? 'Correct' : 'Incorrect'}
                    </p>
                    {!result.isCorrect && (
                      <p className="mt-2 text-sm text-slate-600">
                        <strong>Explanation:</strong> <MathText>{result.explanation}</MathText>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex">
          <button onClick={onEnd} className="primary-button">
            Start New Practice
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.find((answer) => answer.questionId === currentQuestion?.questionId);

  return (
    <div className="panel p-5 sm:p-7">
      <div className="mb-6">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="text-xl font-bold text-slate-950">
            Question {currentIndex + 1} of {questions.length}
          </h2>
          <div className="text-sm font-medium text-slate-600">
            {config.subject} - Year {config.year}
          </div>
        </div>

        <div className="h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-brand-600 transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {currentQuestion && (
        <QuizCard
          question={currentQuestion}
          displayNumber={currentIndex + 1}
          selectedAnswer={currentAnswer?.selectedAnswer}
          onAnswer={handleAnswer}
        />
      )}

      <div className="mt-6 flex justify-between gap-3">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="secondary-button disabled:opacity-50"
        >
          Previous
        </button>

        {currentIndex === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            className="inline-flex items-center justify-center rounded-lg bg-mint px-5 py-2.5 font-semibold text-white transition hover:bg-emerald-700"
          >
            Submit All Answers
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            className="primary-button px-5 py-2.5"
          >
            Next Question
          </button>
        )}
      </div>
    </div>
  );
};

export default PracticeSession;
