import React, { useState, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Toast from '../Common/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { 
  PhaseService, 
  TopicService, 
  GoalService,
  ReflectionService
} from '../../services/dataServices';
import { DataSeedingService } from '../../services/dataSeedingService';
import { Phase, Topic, DailyGoal, DailyReflection, GoalFormData } from '../../types';
import { getSmartFeedback } from '../../services/geminiClientApi';
import DailyReflectionForm from './DailyReflectionForm';
import { detailedTopics } from '../../data/initialData';
import { 
  Target,
  TrendingUp, 
  BookOpen, 
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Edit,
  MessageSquare,
  Lightbulb
} from 'lucide-react';

const GoalSetting: React.FC = () => {
  // const navigate = useNavigate();
  const { userData } = useAuth();
  
  // Core state
  const [phases, setPhases] = useState<Phase[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [todaysGoal, setTodaysGoal] = useState<DailyGoal | null>(null);
  const [todaysReflection, setTodaysReflection] = useState<DailyReflection | null>(null);
  const [formData, setFormData] = useState<GoalFormData>({
    phase_id: '',
    topic_id: '',
    goal_text: '',
    target_percentage: 80,
    goal_date: new Date()
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [dataStatus, setDataStatus] = useState({ 
    phasesCount: 0, 
    topicsCount: 0, 
    isSeeded: false 
  });
  // SMART feedback state
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackHtml, setFeedbackHtml] = useState('');
  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Convert markdown to sanitized HTML using marked + DOMPurify
  const markdownToHtml = (md: string) => {
    if (!md) return '';
    const raw = marked.parse(md);
    // DOMPurify expects a DOM; in SSR contexts this can fail. This app runs in the browser.
    const clean = DOMPurify.sanitize(raw);
    return clean;
  };

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!userData?.id) return;
    
    setIsLoading(true);
    try {
      const [phasesData, goalData] = await Promise.all([
        PhaseService.getAllPhases(),
        GoalService.getTodaysGoal(userData.id)
      ]);

      setPhases(phasesData);
      setTodaysGoal(goalData);
      // Get topics count for all phases
      const topicsData = await Promise.all(phasesData.map(phase => TopicService.getTopicsByPhase(phase.id)));
      const totalTopics = topicsData.reduce((acc, topics) => acc + topics.length, 0);
      
      setDataStatus({
        phasesCount: phasesData.length,
        topicsCount: totalTopics,
        isSeeded: phasesData.length > 0
      });

      if (goalData) {
        const reflectionData = await ReflectionService.getReflectionByGoal(goalData.id);
        setTodaysReflection(reflectionData);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [userData?.id]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (formData.phase_id) {
      loadTopics(formData.phase_id);
    }
  }, [formData.phase_id]);

  // Load topics for selected phase
  const loadTopics = async (phaseId: string) => {
    try {
      const topicsData = await TopicService.getTopicsByPhase(phaseId);
      setTopics(topicsData);
    } catch (error) {
      console.error('Error loading topics:', error);
      setError('Failed to load topics');
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'target_percentage' ? Number(value) : 
              name === 'goal_date' ? new Date(value) : value
    }));
  };

  // Handle goal form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const goalId = todaysGoal?.id;
      let result = true;
      
      if (goalId) {
        // Update existing goal
        await GoalService.updateGoal(goalId, {
          ...formData,
          status: 'pending'
        });
      } else {
        // Create new goal
        await GoalService.createGoal({
          ...formData,
          student_id: userData?.id || '',
          status: 'pending',
          created_at: formData.goal_date || new Date()
        });
      }
      
      if (result) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        await loadInitialData();
        setIsEditing(false);
      } else {
        setError('Failed to save goal');
      }
    } catch (error) {
      console.error('Error saving goal:', error);
      setError('Failed to save goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle reflection submission
  const handleReflectionSubmit = async () => {
    if (todaysGoal) {
      const reflectionData = await ReflectionService.getReflectionByGoal(todaysGoal.id);
      setTodaysReflection(reflectionData);
    }
  };

  // Handle data seeding
  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      setError('');
      
      const success = await DataSeedingService.seedInitialData();
      if (success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        await loadInitialData();
      } else {
        setError('Failed to initialize curriculum data');
      }
    } catch (error) {
      console.error('Error seeding data:', error);
      setError('Failed to initialize curriculum data');
    } finally {
      setIsSeeding(false);
    }
  };

  // Render goal form
  const renderGoalForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="phase_id" className="block text-sm font-medium text-gray-700 mb-2">
            Phase <span className="text-red-500">*</span>
          </label>
          <select
            id="phase_id"
            name="phase_id"
            value={formData.phase_id}
            onChange={handleInputChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">Select a phase</option>
            {phases.map((phase) => (
              <option key={phase.id} value={phase.id}>
                {phase.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="topic_id" className="block text-sm font-medium text-gray-700 mb-2">
            Topic <span className="text-red-500">*</span>
          </label>
          <select
            id="topic_id"
            name="topic_id"
            value={formData.topic_id}
            onChange={handleInputChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          >
            <option value="">Select a topic</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="goal_text" className="block text-sm font-medium text-gray-700 mb-2">
          Goal Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="goal_text"
          name="goal_text"
          rows={4}
          value={formData.goal_text}
          onChange={handleInputChange}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          required
        ></textarea>
      </div>

      <div className="mt-2">
        <label htmlFor="goal_date" className="block text-sm font-medium text-gray-700 mb-2">
          Goal Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="goal_date"
          name="goal_date"
          value={formData.goal_date ? formData.goal_date.toISOString().split('T')[0] : ''}
          onChange={handleInputChange}
          className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          required
        />
        <p className="text-xs text-gray-500 mt-1">Select the date for this goal (defaults to today)</p>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Goal'}
        </button>
      </div>
    </form>
  );

  // Render goal card
  const renderGoalCard = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Set Learning Goal</h3>
          <p className="text-gray-600 mb-4">{todaysGoal?.goal_text}</p>
          
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <TrendingUp className="h-4 w-4" />
            <span>Target Achievement: {todaysGoal?.target_percentage}%</span>
          </div>
        </div>
        
        {(todaysGoal?.status === 'pending' || todaysGoal?.status === 'reviewed') && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <Edit className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {todaysGoal?.status === 'reviewed' && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
          <h4 className="text-sm font-medium text-orange-900 mb-2 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4" />
            <span>Mentor Feedback - Revision Needed</span>
          </h4>
          <p className="text-orange-800">Your mentor has reviewed your goal and is requesting changes. Please edit and resubmit.</p>
        </div>
      )}
      
      {todaysGoal?.status === 'approved' && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <h4 className="text-sm font-medium text-green-900 mb-2 flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span>Goal Approved</span>
          </h4>
          <p className="text-green-800">Your mentor has approved your goal. You can now complete your reflection at the end of the day.</p>
        </div>
      )}
    </div>
  );

  // Render reflection section
  const renderReflectionSection = () => (
    <div className="mt-6">
      {!todaysReflection ? (
        <div className="text-center py-8 bg-white rounded-lg shadow-sm">
          <MessageSquare className="h-12 w-12 text-primary-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Time to Reflect</h3>
          <p className="text-gray-600 mb-4">Your goal has been approved. Take a moment to reflect on your progress.</p>
          <DailyReflectionForm goal={todaysGoal!} studentId={userData?.id || ''} onSubmitSuccess={handleReflectionSubmit} />
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span>Reflection Completed</span>
          </h3>
          <p className="text-green-800 mb-2">{todaysReflection.reflection_answers.workedWell}</p>
          <div className="mt-4 text-sm text-green-700 font-medium">
            Achievement Level: {todaysReflection.achieved_percentage}%
          </div>
        </div>
      )}
    </div>
  );

  return (
    <React.Fragment>
      <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-sm rounded-lg relative">
        {isLoading && (
          <div className="absolute top-0 left-0 right-0">
            <div className="h-1 bg-primary-100 overflow-hidden rounded-t-lg">
              <div 
                className="h-1 bg-primary-500 transition-all duration-500 ease-in-out animate-progress"
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Target className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {isEditing ? "Update Goal" : 'Set Learning Goal'}
              </h1>
              <p className="text-sm text-gray-500">
                {isEditing ? 'Modify your learning objective for today' : 'Track and reflect on your daily progress'}
              </p>
            </div>
            {/* AI Feedback Button */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-2">
              {(!todaysGoal || isEditing) && (
                <>
                  <button
                    type="button"
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 flex items-center gap-2"
                    onClick={async () => {
                      setShowFeedback(true);
                      setFeedbackLoading(true);
                      setFeedbackError('');
                      setFeedback('');
                      setFeedbackHtml('');
                      try {
                        if (!formData.goal_text) {
                          setFeedbackError('Please enter your goal first.');
                          setFeedbackLoading(false);
                          return;
                        }

                        // Build structured context from selected phase/topic using detailedTopics
                        const selectedTopic = topics.find(t => t.id === formData.topic_id);
                        const selectedPhase = phases.find(p => p.id === formData.phase_id);
                        let contextObj: any = { phase: selectedPhase?.name || 'General', topic: selectedTopic?.name || 'General' };
                        try {
                          if (selectedPhase && selectedTopic) {
                            const phaseName = selectedPhase.name;
                            const dt = (detailedTopics as any)[phaseName] as any[] | undefined;
                            const topicDetails = dt ? dt.find(x => x.name === selectedTopic.name) : undefined;
                            if (topicDetails) {
                              contextObj.description = topicDetails.description;
                              contextObj.keyTags = topicDetails.keyTags;
                              contextObj.deliverable = topicDetails.deliverable;
                            }
                          }
                        } catch (e) {
                          // ignore context building errors and send minimal context
                        }

                        const response = await getSmartFeedback({
                          goalText: formData.goal_text,
                          apiKey: userData?.gemini_api_key || '',
                          context: contextObj
                        });

                        const aiText = response.feedback || 'No feedback received.';
                        setFeedback(aiText);
                        const html = markdownToHtml(aiText);
                        setFeedbackHtml(html);

                        // Show notification if using fallback (no API key)
                        if (response.provider === 'fallback') {
                          setToastMessage('💡 Add your Gemini API key in profile settings for personalized AI feedback tailored to your curriculum!');
                          setShowToast(true);
                        }
                      } catch (err: any) {
                        setFeedbackError(err?.response?.data?.error || err.message || 'Failed to get feedback.');
                      } finally {
                        setFeedbackLoading(false);
                      }
                    }}
                    disabled={!formData.goal_text || feedbackLoading}
                    aria-label="Get SMART Feedback"
                  >
                    <Lightbulb className="h-4 w-4" />
                    {feedbackLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Getting Feedback...</span>
                      </>
                    ) : (
                      <span>Get SMART Feedback</span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Status Messages */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Goal saved successfully! Your mentor will review it soon.</span>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
                {!dataStatus.isSeeded && (
                  <button
                    onClick={handleSeedData}
                    disabled={isSeeding}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
                  >
                    {isSeeding ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Initializing...</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-4 w-4" />
                        <span>Initialize Curriculum</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {dataStatus.isSeeded && !todaysGoal && (
            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Curriculum loaded: {dataStatus.phasesCount} phases, {dataStatus.topicsCount} topics</span>
              </div>
            </div>
          )}

          {/* Content based on state */}
          {(!todaysGoal || isEditing) ? (
            renderGoalForm()
          ) : (
            <>
              {renderGoalCard()}
              {todaysGoal.status === 'approved' && renderReflectionSection()}
            </>
          )}
        </div>
      </div>
    </div>

    {/* Slide-in drawer for AI-generated feedback (shown when feedback is requested) */}
    {showFeedback && (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40"
          onClick={() => setShowFeedback(false)}
          aria-hidden
        />

        {/* Drawer */}
        <aside className="fixed right-0 top-0 h-full w-96 bg-white z-50 shadow-xl transform transition-transform duration-300" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-purple-700">SMART Feedback</h3>
            <button onClick={() => setShowFeedback(false)} className="text-gray-500 hover:text-gray-700" aria-label="Close feedback panel">✕</button>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">
            <div className="mb-4 text-sm text-gray-700">
              <strong>SMART Hints</strong>
              <ul className="list-disc pl-5 mt-2 text-xs text-gray-600">
                <li><strong>S</strong>pecific: Is your goal clear and well-defined?</li>
                <li><strong>M</strong>easurable: Can you track progress or completion?</li>
                <li><strong>A</strong>chievable: Is it realistic given your resources?</li>
                <li><strong>R</strong>elevant: Does it align with your learning objectives?</li>
                <li><strong>T</strong>ime-bound: Is there a clear deadline or timeframe?</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded p-3 text-gray-700 min-h-[120px]">
              {feedbackError && <div className="text-red-600">{feedbackError}</div>}
              {!feedback && !feedbackError && feedbackLoading && <div>Loading feedback...</div>}
              {feedbackHtml && (
                <div className="prose text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: feedbackHtml }} />
              )}
              {!feedbackHtml && feedback && !feedbackError && (
                <div className="text-sm text-gray-800"><em>{feedback}</em></div>
              )}
            </div>
          </div>
        </aside>
      </>
    )}
    <Toast message={toastMessage} visible={showToast} onClose={() => setShowToast(false)} />
    </React.Fragment>
  );
};

export default GoalSetting;