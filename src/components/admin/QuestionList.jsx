// frontend/src/components/admin/QuestionList.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI, questionAPI } from '../../services/api';
import toast from 'react-hot-toast';

const isSelectedForStudents = (question) => (
  question.selectedForStudents === true ||
  question.visibleToStudents === true ||
  question.isSelectedForStudents === true ||
  question.isVisibleToStudents === true
);

const getQuestionType = (question) => (
  question.questionType || (question.options?.length ? 'multiple-choice' : 'subjective')
);

const getQuestionImages = (question) => {
  const images = Array.isArray(question.imageUrls) ? question.imageUrls.filter(Boolean) : [];
  if (question.imageUrl && !images.includes(question.imageUrl)) {
    images.unshift(question.imageUrl);
  }
  return images;
};

const getAskedCount = (question) => {
  const count = question.askedCount ?? question.timesAsked ?? question.studentAskedCount ?? 0;
  return Number.isFinite(Number(count)) ? Number(count) : 0;
};

const QuestionList = ({ metadata, onRefresh }) => {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [filters, setFilters] = useState({
    year: '',
    subject: '',
    topic: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (filters.year && filters.subject) {
      loadQuestions();
    }
  }, [filters]);

  const selectedQuestions = useMemo(
    () => questions.filter(isSelectedForStudents),
    [questions]
  );

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const params = {
        year: filters.year,
        subject: filters.subject,
        ...(filters.topic && { topic: filters.topic }),
      };
      const response = await questionAPI.getQuestions(params);
      const loadedQuestions = response.data.questions || [];
      setQuestions(sortQuestionsForAdmin(loadedQuestions));
    } catch (error) {
      toast.error('Failed to load questions');
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudentVisibility = (questionId) => {
    setQuestions((currentQuestions) => {
      const selectedOrders = currentQuestions
        .filter(isSelectedForStudents)
        .map((question) => Number(question.studentDisplayOrder ?? question.displayOrder ?? question.selectionOrder))
        .filter(Number.isFinite);
      const nextOrder = selectedOrders.length > 0 ? Math.max(...selectedOrders) + 1 : 1;

      const toggledQuestions = currentQuestions.map((question) => {
        if (question.questionId !== questionId) return question;
        const selected = !isSelectedForStudents(question);
        return {
          ...question,
          selectedForStudents: selected,
          visibleToStudents: selected,
          studentDisplayOrder: selected ? nextOrder : null,
        };
      });

      return renumberSelectedQuestions(toggledQuestions);
    });
  };

  const saveStudentVisibility = async () => {
    try {
      setSavingVisibility(true);
      const orderedQuestions = renumberSelectedQuestions(questions);
      setQuestions(orderedQuestions);

      await Promise.all(
        orderedQuestions.map((question) => {
          const selected = isSelectedForStudents(question);
          return adminAPI.updateQuestion(
            question.year,
            question.subject,
            question.questionId,
            buildQuestionUpdatePayload(question, selected)
          );
        })
      );

      toast.success('Student question visibility saved');
      loadQuestions();
      onRefresh?.();
    } catch (error) {
      toast.error('Failed to save student visibility');
      console.error('Error saving student visibility:', error);
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleDelete = async (question) => {
    try {
      await adminAPI.deleteQuestion(
        question.year,
        question.subject,
        question.questionId
      );
      toast.success('Question deleted successfully');
      loadQuestions();
      onRefresh?.();
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('Failed to delete question');
      console.error('Error deleting question:', error);
    }
  };

  const getSelectedOrder = (question) => {
    const explicitOrder = question.studentDisplayOrder ?? question.displayOrder ?? question.selectionOrder;
    if (Number.isFinite(Number(explicitOrder))) return Number(explicitOrder);
    return selectedQuestions.findIndex((item) => item.questionId === question.questionId) + 1;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Questions</h2>
          <p className="mt-1 text-sm text-gray-600">
            Select which questions students can practise. The selected order is the student display order.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {questions.length > 0 && (
            <button
              onClick={saveStudentVisibility}
              disabled={savingVisibility}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {savingVisibility ? 'Saving...' : `Save Student Selection (${selectedQuestions.length})`}
            </button>
          )}
          <button
            onClick={() => navigate('/admin/questions/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add New Question
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium mb-4">Filter Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              value={filters.year}
              onChange={(event) => setFilters({ ...filters, year: event.target.value, topic: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Year</option>
              {metadata?.years.map((year) => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              value={filters.subject}
              onChange={(event) => setFilters({ ...filters, subject: event.target.value, topic: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!filters.year}
            >
              <option value="">Select Subject</option>
              {metadata?.subjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topic (Optional)
            </label>
            <select
              value={filters.topic}
              onChange={(event) => setFilters({ ...filters, topic: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!filters.subject}
            >
              <option value="">All Topics</option>
              {filters.subject && metadata?.topics?.[filters.subject]?.map((topic) => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {filters.year && filters.subject && (
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading questions...</div>
          ) : questions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No questions found for this selection.</p>
              <button
                onClick={() => navigate('/admin/questions/new')}
                className="text-blue-600 hover:text-blue-700"
              >
                Add your first question
              </button>
            </div>
          ) : (
            <div className="divide-y">
              <div className="bg-blue-50 border-b border-blue-100 px-6 py-4 text-sm text-blue-900">
                Selected questions are visible to students and will be shown in the numbered order displayed here.
              </div>

              {questions.map((question) => {
                const selectedForStudents = isSelectedForStudents(question);
                return (
                  <div key={question.questionId} className="p-6 hover:bg-gray-50">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex-1">
                        <label className="mb-4 flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-800">
                          <input
                            type="checkbox"
                            checked={selectedForStudents}
                            onChange={() => toggleStudentVisibility(question.questionId)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>
                            Visible to students
                            {selectedForStudents && (
                              <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                                Student question {getSelectedOrder(question)}
                              </span>
                            )}
                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                              Asked {getAskedCount(question)} time{getAskedCount(question) === 1 ? '' : 's'}
                            </span>
                          </span>
                        </label>

                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                          <span className="text-sm text-gray-500">
                            Topic: {question.topic}
                          </span>
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                            {getQuestionType(question) === 'subjective' ? 'Subjective' : 'Multiple Choice'}
                          </span>
                          {question.timesUsed > 0 && (
                            <span className="text-sm text-gray-500">
                              Success Rate: {Math.round((question.correctCount / question.timesUsed) * 100)}%
                            </span>
                          )}
                        </div>

                        <p className="text-gray-900 mb-2">{question.questionText}</p>

                        {getQuestionImages(question).length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {getQuestionImages(question).map((imageUrl, index) => (
                              <img
                                key={imageUrl}
                                src={imageUrl}
                                alt={`Question image ${index + 1}`}
                                className="h-16 w-16 rounded border border-gray-200 object-cover"
                              />
                            ))}
                          </div>
                        )}

                        {getQuestionType(question) === 'subjective' ? (
                          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                            Written answer question. Student answers on paper; teacher checks manually.
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {question.options?.map((option, index) => (
                              <p
                                key={index}
                                className={`text-sm ${index === question.correctAnswer ? 'text-green-600 font-medium' : 'text-gray-600'}`}
                              >
                                {String.fromCharCode(65 + index)}. {option}
                                {index === question.correctAnswer && ' Correct'}
                              </p>
                            ))}
                          </div>
                        )}

                        {question.explanation && (
                          <p className="mt-2 text-sm text-gray-500">
                            <strong>{getQuestionType(question) === 'subjective' ? 'Teacher notes:' : 'Explanation:'}</strong> {question.explanation}
                          </p>
                        )}
                      </div>

                      <div className="flex space-x-2 lg:ml-4">
                        <button
                          onClick={() => navigate(`/admin/questions/edit/${question.year}/${question.subject}/${question.questionId}`)}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(question)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const renumberSelectedQuestions = (questions) => {
  const selectedOrderById = new Map(
    questions
      .filter(isSelectedForStudents)
      .sort((a, b) => {
        const aOrder = Number(a.studentDisplayOrder ?? a.displayOrder ?? a.selectionOrder);
        const bOrder = Number(b.studentDisplayOrder ?? b.displayOrder ?? b.selectionOrder);

        if (Number.isFinite(aOrder) && Number.isFinite(bOrder)) return aOrder - bOrder;
        if (Number.isFinite(aOrder)) return -1;
        if (Number.isFinite(bOrder)) return 1;
        return 0;
      })
      .map((question, index) => [question.questionId, index + 1])
  );

  return questions.map((question) => {
    const selected = isSelectedForStudents(question);
    return {
      ...question,
      selectedForStudents: selected,
      visibleToStudents: selected,
      studentDisplayOrder: selected ? selectedOrderById.get(question.questionId) : null,
    };
  });
};

const sortQuestionsForAdmin = (questions) => (
  [...questions].sort((a, b) => {
    const aOrder = Number(a.studentDisplayOrder ?? a.displayOrder ?? a.selectionOrder);
    const bOrder = Number(b.studentDisplayOrder ?? b.displayOrder ?? b.selectionOrder);

    if (Number.isFinite(aOrder) && Number.isFinite(bOrder)) return aOrder - bOrder;
    if (Number.isFinite(aOrder)) return -1;
    if (Number.isFinite(bOrder)) return 1;
    return 0;
  })
);

const buildQuestionUpdatePayload = (question, selected) => {
  const questionType = getQuestionType(question);

  return {
    year: isNaN(question.year) ? String(question.year).trim() : parseInt(question.year, 10),
    subject: String(question.subject || '').trim(),
    topic: String(question.topic || '').trim(),
    difficulty: question.difficulty || 'Medium',
    questionType,
    questionText: String(question.questionText || '').trim(),
    options: questionType === 'multiple-choice' ? question.options || [] : [],
    correctAnswer: questionType === 'multiple-choice' ? question.correctAnswer : null,
    explanation: question.explanation || '',
    imageUrl: getQuestionImages(question)[0] || '',
    imageUrls: getQuestionImages(question),
    tags: question.tags || [],
    selectedForStudents: selected,
    visibleToStudents: selected,
    studentDisplayOrder: selected ? question.studentDisplayOrder : null,
  };
};

export default QuestionList;
