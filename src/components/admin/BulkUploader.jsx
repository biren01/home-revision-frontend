// frontend/src/components/admin/BulkUploader.jsx
import React, { useState } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const BulkUploader = ({ onSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [jsonText, setJsonText] = useState('');

  const exampleJSON = [
    {
      "year": 7,
      "subject": "Math",
      "topic": "Algebra",
      "difficulty": "Easy",
      "questionText": "What is 2 + 2?",
      "options": ["3", "4", "5", "6"],
      "correctAnswer": 1,
      "explanation": "Basic addition"
    },
    {
      "year": 8,
      "subject": "Science",
      "topic": "Biology",
      "difficulty": "Medium",
      "questionText": "What is the powerhouse of the cell?",
      "options": ["Nucleus", "Mitochondria", "Ribosome", "Golgi body"],
      "correctAnswer": 1,
      "explanation": "Mitochondria produce ATP energy"
    }
  ];

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        setJsonText(JSON.stringify(parsed, null, 2));
        toast.success('File loaded successfully');
      } catch (error) {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  const validateQuestions = (questions) => {
    const errors = [];
    
    if (!Array.isArray(questions)) {
      errors.push('Data must be an array of questions');
      return errors;
    }

    questions.forEach((q, index) => {
      if (!q.year) errors.push(`Question ${index + 1}: Missing year`);
      if (!q.subject) errors.push(`Question ${index + 1}: Missing subject`);
      if (!q.topic) errors.push(`Question ${index + 1}: Missing topic`);
      if (!q.questionText) errors.push(`Question ${index + 1}: Missing question text`);
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`Question ${index + 1}: Must have at least 2 options`);
      }
      if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer >= q.options?.length) {
        errors.push(`Question ${index + 1}: Invalid correct answer index`);
      }
    });

    return errors;
  };

  const handleUpload = async () => {
    try {
      const questions = JSON.parse(jsonText);
      
      // Validate
      const errors = validateQuestions(questions);
      if (errors.length > 0) {
        toast.error(`Validation failed:\n${errors.join('\n')}`);
        return;
      }

      setUploading(true);
      const response = await adminAPI.bulkImport(questions);
      setResults(response.data);
      
      if (response.data.failed === 0) {
        toast.success(`Successfully imported ${response.data.succeeded} questions!`);
        setTimeout(() => onSuccess?.(), 2000);
      } else {
        toast.warning(`Imported ${response.data.succeeded} questions, ${response.data.failed} failed`);
      }
    } catch (error) {
      toast.error('Failed to parse JSON or upload questions');
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const loadExample = () => {
    setJsonText(JSON.stringify(exampleJSON, null, 2));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Bulk Upload Questions</h2>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Upload a JSON file or paste JSON content below</li>
              <li>• Each question must have: year, subject, topic, questionText, options (array), correctAnswer (index)</li>
              <li>• Optional fields: difficulty (default: Medium), explanation, tags</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload JSON File
            </label>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                JSON Content
              </label>
              <button
                type="button"
                onClick={loadExample}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Load Example
              </button>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows="15"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Paste your JSON here..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setJsonText('')}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={uploading}
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={!jsonText || uploading}
              className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Questions'}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Upload Results</h3>
          
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{results.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{results.succeeded}</div>
              <div className="text-sm text-green-700">Succeeded</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{results.failed}</div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
          </div>

          {results.failed > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Failed Items:</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.results.filter(r => !r.success).map((result, index) => (
                  <div key={index} className="p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-800">{result.error}</p>
                    <pre className="mt-1 text-xs text-gray-600 overflow-x-auto">
                      {JSON.stringify(result.question, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkUploader;