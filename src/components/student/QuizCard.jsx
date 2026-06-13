import React from 'react';
import MathText from '../common/MathText';

const getQuestionImages = (question) => {
  const images = Array.isArray(question.imageUrls) ? question.imageUrls.filter(Boolean) : [];
  if (question.imageUrl && !images.includes(question.imageUrl)) {
    images.unshift(question.imageUrl);
  }
  return images;
};

const QuizCard = ({ question, displayNumber, selectedAnswer, onAnswer }) => {
  const questionType = question.questionType || (question.options?.length ? 'multiple-choice' : 'subjective');
  const questionImages = getQuestionImages(question);

  const handleOptionClick = (index) => {
    onAnswer(question.questionId, index);
  };

  const handleWrittenComplete = () => {
    onAnswer(question.questionId, 'written-completed');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-slate-50 p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
            Question {displayNumber || question.studentDisplayNumber || 1}
          </span>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
            questionType === 'subjective' ? 'bg-amber-100 text-amber-800' : 'bg-brand-100 text-brand-700'
          }`}>
            {questionType === 'subjective' ? 'Written answer' : 'Multiple choice'}
          </span>
        </div>
        <p className="text-lg font-medium leading-8 text-slate-950">
          <MathText>{question.questionText}</MathText>
        </p>

        {questionImages.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {questionImages.map((imageUrl, index) => (
              <img
                key={imageUrl}
                src={imageUrl}
                alt={`Question diagram ${index + 1}`}
                className="max-h-96 w-full rounded-lg border border-slate-200 object-contain bg-white"
              />
            ))}
          </div>
        )}
      </div>

      {questionType === 'subjective' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h3 className="mb-2 font-semibold text-amber-900">Answer on paper</h3>
          <p className="mb-4 text-sm leading-6 text-amber-900">
            Write your answer in your notebook or answer sheet. This question will not be marked online.
            Your teacher can check it manually.
          </p>
          <button
            onClick={handleWrittenComplete}
            className={`rounded-lg border px-4 py-2 font-semibold transition-all ${
              selectedAnswer === 'written-completed'
                ? 'border-green-600 bg-green-50 text-green-700'
                : 'border-amber-300 bg-white text-amber-900 hover:bg-amber-100'
            }`}
          >
            {selectedAnswer === 'written-completed' ? 'Written answer completed' : 'I have answered this on paper'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {question.options?.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionClick(index)}
              className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                selectedAnswer === index
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className="mr-3 font-bold text-brand-700">
                {String.fromCharCode(65 + index)}.
              </span>
              <MathText>{option}</MathText>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizCard;
