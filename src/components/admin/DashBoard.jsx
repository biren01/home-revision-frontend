// frontend/src/components/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { questionAPI } from '../../services/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer 
} from 'recharts';

const Dashboard = ({ metadata }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalQuestions: 0,
    bySubject: {},
    byYear: {},
    byDifficulty: {},
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Get all questions (this might need pagination for large datasets)
      const allQuestions = [];
      
      for (const year of metadata?.years || []) {
        for (const subject of metadata?.subjects || []) {
          try {
            const response = await questionAPI.getQuestions({ year, subject });
            allQuestions.push(...response.data.questions);
          } catch (error) {
            console.error(`Error loading questions for Year ${year} ${subject}:`, error);
          }
        }
      }

      // Calculate statistics
      const bySubject = {};
      const byYear = {};
      const byDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
      
      allQuestions.forEach(q => {
        // By subject
        bySubject[q.subject] = (bySubject[q.subject] || 0) + 1;
        
        // By year
        byYear[q.year] = (byYear[q.year] || 0) + 1;
        
        // By difficulty
        if (q.difficulty) {
          byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
        }
      });

      // Recent activity (last 5 questions)
      const recent = allQuestions
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5);

      setStats({
        totalQuestions: allQuestions.length,
        bySubject,
        byYear,
        byDifficulty,
        recentActivity: recent
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const subjectData = Object.entries(stats.bySubject).map(([name, value]) => ({
    name,
    value
  }));

  const yearData = Object.entries(stats.byYear)
    .map(([name, value]) => ({
      name: `Year ${name}`,
      questions: value
    }))
    .sort((a, b) => parseInt(a.name.split(' ')[1]) - parseInt(b.name.split(' ')[1]));

  const difficultyData = Object.entries(stats.byDifficulty).map(([name, value]) => ({
    name,
    value
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        <button
          onClick={loadStats}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Total Questions</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {stats.totalQuestions}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Subjects</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {Object.keys(stats.bySubject).length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Year Levels</div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {Object.keys(stats.byYear).length}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-500">Most Questions</div>
          <div className="mt-2 text-xl font-semibold text-gray-900">
            {subjectData.length > 0 
              ? subjectData.reduce((a, b) => a.value > b.value ? a : b).name 
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Questions by Subject */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Questions by Subject</h3>
          {subjectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={subjectData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-12">No data available</p>
          )}
        </div>

        {/* Questions by Year */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Questions by Year Level</h3>
          {yearData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="questions" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-12">No data available</p>
          )}
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Difficulty Distribution</h3>
        {difficultyData.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {difficultyData.map((item, index) => (
              <div key={item.name} className="text-center">
                <div className="text-2xl font-bold" style={{ color: COLORS[index] }}>
                  {item.value}
                </div>
                <div className="text-sm text-gray-600">{item.name}</div>
                <div className="mt-2 text-xs text-gray-500">
                  {((item.value / stats.totalQuestions) * 100).toFixed(1)}% of total
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No data available</p>
        )}
      </div>

      {/* Recent Activity */}
      {stats.recentActivity.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Recently Added Questions</h3>
          <div className="space-y-3">
            {stats.recentActivity.map((question) => (
              <div 
                key={question.questionId} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => navigate(`/admin/questions/edit/${question.year}/${question.subject}/${question.questionId}`)}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {question.questionText}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">
                      Year {question.year} • {question.subject} • {question.topic}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                    question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {question.difficulty}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/admin/questions/new')}
            className="p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="text-blue-600 font-medium">Add New Question</div>
            <div className="text-sm text-blue-500">Create a single question</div>
          </button>
          
          <button
            onClick={() => navigate('/admin/bulk-upload')}
            className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <div className="text-green-600 font-medium">Bulk Upload</div>
            <div className="text-sm text-green-500">Import multiple questions</div>
          </button>
          
          <button
            onClick={() => navigate('/admin/questions')}
            className="p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <div className="text-purple-600 font-medium">View All Questions</div>
            <div className="text-sm text-purple-500">Browse and manage questions</div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;