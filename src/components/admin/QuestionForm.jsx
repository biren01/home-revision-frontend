// frontend/src/components/admin/QuestionForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionAPI, adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const getQuestionImages = (question) => {
  const images = Array.isArray(question.imageUrls) ? question.imageUrls.filter(Boolean) : [];
  if (question.imageUrl && !images.includes(question.imageUrl)) {
    images.unshift(question.imageUrl);
  }
  return images;
};

const QuestionForm = ({ metadata, onSuccess }) => {
  const { year, subject, questionId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    year: year || '',
    subject: subject || '',
    topic: '',
    difficulty: 'Medium',
    questionType: 'multiple-choice',
    questionText: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    imageUrl: '',
    imageUrls: [],
    tags: [],
    selectedForStudents: false,
    visibleToStudents: false,
    studentDisplayOrder: null
  });

  const isEditMode = !!questionId;

  useEffect(() => {
    if (isEditMode) {
      loadQuestion();
    }
  }, [questionId]);

  const loadQuestion = async () => {
    try {
      setLoading(true);
      const response = await questionAPI.getQuestion(year, subject, questionId);
      const question = response.data;
      setFormData({
        year: question.year,
        subject: question.subject,
        topic: question.topic,
        difficulty: question.difficulty,
        questionType: question.questionType || (question.options?.length ? 'multiple-choice' : 'subjective'),
        questionText: question.questionText,
        options: question.options?.length ? question.options : ['', '', '', ''],
        correctAnswer: Number.isInteger(question.correctAnswer) ? question.correctAnswer : 0,
        explanation: question.explanation || '',
        imageUrl: question.imageUrl || '',
        imageUrls: getQuestionImages(question),
        tags: question.tags || [],
        selectedForStudents: question.selectedForStudents === true || question.visibleToStudents === true,
        visibleToStudents: question.selectedForStudents === true || question.visibleToStudents === true,
        studentDisplayOrder: question.studentDisplayOrder ?? question.displayOrder ?? question.selectionOrder ?? null
      });
    } catch (error) {
      toast.error('Failed to load question');
      console.error('Error loading question:', error);
      navigate('/admin/questions');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      setUploading(true);
      const uploadedUrls = [];

      for (const file of files) {
        const { data } = await questionAPI.getUploadUrl(file.name, file.type);

        const uploadResponse = await fetch(data.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        });

        if (!uploadResponse.ok) {
          throw new Error(`Image upload failed with status ${uploadResponse.status}`);
        }

        uploadedUrls.push(data.fileUrl);
      }

      setFormData((prev) => {
        const imageUrls = [...getQuestionImages(prev), ...uploadedUrls];
        return {
          ...prev,
          imageUrls,
          imageUrl: imageUrls[0] || ''
        };
      });
      toast.success(`${uploadedUrls.length} image${uploadedUrls.length === 1 ? '' : 's'} uploaded successfully`);
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || 'Failed to upload image');
      console.error('Error uploading image:', error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (imageUrl) => {
    setFormData((prev) => {
      const imageUrls = getQuestionImages(prev).filter((url) => url !== imageUrl);
      return {
        ...prev,
        imageUrls,
        imageUrl: imageUrls[0] || ''
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.year || !formData.subject || !formData.topic || !formData.questionText) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.questionType === 'multiple-choice' && formData.options.some(opt => !opt.trim())) {
      toast.error('All options must be filled for multiple choice questions');
      return;
    }

    const submissionData = {
      ...formData,
      questionType: formData.questionType,
      year: isNaN(formData.year) ? formData.year.trim() : parseInt(formData.year, 10),
      subject: formData.subject.trim(),
      topic: formData.topic.trim(),
      questionText: formData.questionText.trim(),
      options: formData.questionType === 'multiple-choice'
        ? formData.options.map(option => option.trim())
        : [],
      correctAnswer: formData.questionType === 'multiple-choice' ? formData.correctAnswer : null,
      explanation: formData.explanation?.trim(),
      imageUrls: getQuestionImages(formData),
      imageUrl: getQuestionImages(formData)[0] || ''
    };

    try {
      setLoading(true);

      if (isEditMode) {
        await adminAPI.updateQuestion(year, subject, questionId, submissionData);
        toast.success('Question updated successfully');
      } else {
        await adminAPI.createQuestion(submissionData);
        toast.success('Question created successfully');
      }

      onSuccess?.();
      navigate('/admin/questions');
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update question' : 'Failed to create question');
      console.error('Error saving question:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditMode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl">Loading question...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">
          {isEditMode ? 'Edit Question' : 'Create New Question'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
            <input
              type="text"
              value={formData.year}
              onChange={(e) => handleInputChange('year', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Year (e.g., 7)"
              list="year-options"
              required
              disabled={isEditMode}
            />
            <datalist id="year-options">
              {metadata?.years?.map(y => <option key={y} value={y} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter Subject (e.g., Mathematics)"
              list="subject-options"
              required
              disabled={isEditMode}
            />
            <datalist id="subject-options">
              {metadata?.subjects?.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Topic *</label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => handleInputChange('topic', e.target.value)}
              placeholder="e.g., Algebra, Physics, Grammar"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty *</label>
            <select
              value={formData.difficulty}
              onChange={(e) => handleInputChange('difficulty', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Question Type *</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer ${
              formData.questionType === 'multiple-choice' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                name="questionType"
                value="multiple-choice"
                checked={formData.questionType === 'multiple-choice'}
                onChange={(e) => handleInputChange('questionType', e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600"
              />
              <span>
                <span className="block font-medium text-gray-900">Multiple choice question</span>
                <span className="block text-sm text-gray-600">Student chooses an option and the system can mark it online.</span>
              </span>
            </label>

            <label className={`flex items-start gap-3 rounded-lg border p-4 cursor-pointer ${
              formData.questionType === 'subjective' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
            }`}>
              <input
                type="radio"
                name="questionType"
                value="subjective"
                checked={formData.questionType === 'subjective'}
                onChange={(e) => handleInputChange('questionType', e.target.value)}
                className="mt-1 h-4 w-4 text-blue-600"
              />
              <span>
                <span className="block font-medium text-gray-900">Subjective written question</span>
                <span className="block text-sm text-gray-600">Student answers on paper and the teacher checks it offline.</span>
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
          <textarea
            value={formData.questionText}
            onChange={(e) => handleInputChange('questionText', e.target.value)}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter your question here..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Images (Optional)</label>
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
              disabled={uploading}
              multiple
            />
            <label
              htmlFor="image-upload"
              className="inline-flex px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer"
            >
              {uploading ? 'Uploading...' : 'Choose Images'}
            </label>
            {getQuestionImages(formData).length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {getQuestionImages(formData).map((imageUrl, index) => (
                  <div key={imageUrl} className="rounded-lg border border-gray-200 bg-gray-50 p-2">
                    <img
                      src={imageUrl}
                      alt={`Question image ${index + 1}`}
                      className="h-28 w-full rounded object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(imageUrl)}
                      className="mt-2 w-full rounded bg-white px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {formData.questionType === 'multiple-choice' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Answer Options *</label>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={formData.correctAnswer === index}
                    onChange={() => handleInputChange('correctAnswer', index)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-600 w-6">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required={formData.questionType === 'multiple-choice'}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-500">Select the radio button next to the correct answer.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            This is a subjective written question. No answer options or online correct answer are required.
            The student will answer on paper and the teacher can check it manually.
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {formData.questionType === 'multiple-choice' ? 'Explanation (Optional)' : 'Teacher Notes / Mark Scheme (Optional)'}
          </label>
          <textarea
            value={formData.explanation}
            onChange={(e) => handleInputChange('explanation', e.target.value)}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder={formData.questionType === 'multiple-choice'
              ? 'Explain why the answer is correct...'
              : 'Add notes or a suggested answer for the teacher...'}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/admin/questions')}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : (isEditMode ? 'Update Question' : 'Create Question')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuestionForm;
