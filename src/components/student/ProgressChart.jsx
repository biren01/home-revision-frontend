// frontend/src/components/student/ProgressChart.jsx
import React, { useState, useEffect } from 'react';
import { questionAPI } from '../../services/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const ProgressChart = ({ metadata }) => {
  const [progressData, setProgressData] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      
      // Get all questions and their performance
      const allQuestions = [];
      
      for (const year of metadata?.years || []) {
        for (const subject of metadata?.subjects || []) {
          try {
            const response = await questionAPI.getQuestions({ year, subject });
            allQuestions.push(...response.data.questions);
          } catch (error) {
            console.error(`Error loading questions:`, error);
          }
        }
      }

      // Group by subject and calculate performance
      const subjectPerformance = {};
      
      allQuestions.forEach(q => {
        if (!subjectPerformance[q.subject]) {
          subjectPerformance[q.subject] = {
            total: 0,
            correct: 0,
            attempts: 0
          };
        }
        
        if (q.timesUsed > 0) {
          subjectPerformance[q.subject].total++;
          subjectPerformance[q.subject].correct += q.correctCount || 0;
          subjectPerformance[q.subject].attempts += q.timesUsed || 0;
        }
      });

      // Format data for charts
      const chartData = Object.entries(subjectPerformance).map(([subject, data]) => ({
        subject,
        accuracy: data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0,
        questionsAttempted: data.total,
        totalAttempts: data.attempts
      }));

      setProgressData(chartData);
    } catch (error) {
      console.error('Error loading progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = selectedSubject === 'all' 
    ? progressData 
    : progressData.filter(d => d.subject === selectedSubject);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl">Loading progress data...</div>
      </div>
    );
  }

  if (progressData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-500">No practice data available yet.</p>
        <p className="text-sm text-gray-400 mt-2">Complete some practice sessions to see your progress!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subject Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Performance Overview</h3>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg"
          >
            <option value="all">All Subjects</option>
            {progressData.map(d => (
              <option key={d.subject} value={d.subject}>{d.subject}</option>
            ))}
          </select>
        </div>

        {/* Accuracy Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="subject" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Bar dataKey="accuracy" fill="#3B82F6" name="Accuracy %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Questions Attempted</h3>
          <div className="space-y-3">
            {filteredData.map(data => (
              <div key={data.subject} className="flex items-center justify-between">
                <span className="text-gray-700">{data.subject}</span>
                <span className="font-semibold">{data.questionsAttempted}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Overall Performance</h3>
          <div className="space-y-3">
            {filteredData.map(data => (
              <div key={data.subject}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-700">{data.subject}</span>
                  <span className={`font-semibold ${
                    data.accuracy >= 70 ? 'text-green-600' :
                    data.accuracy >= 50 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {data.accuracy}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      data.accuracy >= 70 ? 'bg-green-600' :
                      data.accuracy >= 50 ? 'bg-yellow-600' :
                      'bg-red-600'
                    }`}
                    style={{ width: `${data.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Study Tips</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Focus on subjects with lower accuracy scores</li>
          <li>• Practice regularly to improve retention</li>
          <li>• Review explanations for questions you got wrong</li>
          <li>• Try mixing difficulty levels to challenge yourself</li>
        </ul>
      </div>
    </div>
  );
};

export default ProgressChart;