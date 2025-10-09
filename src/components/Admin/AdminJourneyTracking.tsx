import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Users, Target, BookOpen, X } from 'lucide-react';
import { GoalService } from '../../services/dataServices';
import { PhaseService } from '../../services/dataServices';
import { TopicService } from '../../services/dataServices';
import { UserService, COLLECTIONS } from '../../services/firestore';

interface StudentStats {
  studentId: string;
  studentName: string;
  phaseId: string;
  topicId: string;
  daysSpent: number;
  earliestGoalDate: Date;
}

interface PhaseData {
  phaseId: string;
  phaseName: string;
  totalStudents: number;
  averageDaysSpent: number;
  topics: TopicData[];
  order: number;
}

interface TopicData {
  topicId: string;
  topicName: string;
  studentCount: number;
  averageDaysSpent: number;
}

const AdminJourneyTracking: React.FC = () => {
  const [phaseData, setPhaseData] = useState<PhaseData[]>([]);
  const [standalonePhases, setStandalonePhases] = useState<PhaseData[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [studentStats, setStudentStats] = useState<StudentStats[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<{
    topicId: string;
    topicName: string;
    students: Array<{ studentName: string; totalDays: number; goalCount: number; latestActivity: Date }>;
  } | null>(null);

  const calculateStudentStats = useCallback(async (): Promise<StudentStats[]> => {
    try {
      const [goals, users] = await Promise.all([
        GoalService.getAllGoals(),
        UserService.getAll(COLLECTIONS.USERS)
      ]);

      // Filter to get only students (non-admin users)
      const students = users.filter((user: any) => !user.isAdmin);
      const studentIds = new Set(students.map((user: any) => user.id));
      const userMap = new Map(students.map((user: any) => [user.id, user.name || 'Unknown Student']));

      // Filter goals to only include goals from students
      const studentGoals = goals.filter((goal: any) => studentIds.has(goal.student_id));

      // Group goals by student and find joining date or earliest goal date per student
      const studentGoalGroups = new Map<string, any[]>();
      studentGoals.forEach((goal: any) => {
        if (!studentGoalGroups.has(goal.student_id)) {
          studentGoalGroups.set(goal.student_id, []);
        }
        studentGoalGroups.get(goal.student_id)!.push(goal);
      });

      const stats: StudentStats[] = [];
      studentGoalGroups.forEach((studentGoalsList, studentId) => {
        // Find the student's joining date, or fall back to earliest goal date
        const student = students.find((s: any) => s.id === studentId);
        let startDate: Date;

        if (student && (student as any).campus_joining_date) {
          startDate = new Date((student as any).campus_joining_date);
        } else {
          // Fallback to earliest goal date if no joining date
          const earliestGoal = studentGoalsList.reduce((earliest, current) => {
            const currentDate = new Date(current.created_at);
            const earliestDate = new Date(earliest.created_at);
            return currentDate < earliestDate ? current : earliest;
          });
          startDate = new Date(earliestGoal.created_at);
        }

        const now = new Date();
        const daysSpent = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        // Create stats for each goal
        studentGoalsList.forEach(goal => {
          stats.push({
            studentId,
            studentName: userMap.get(studentId) || 'Unknown Student',
            phaseId: goal.phase_id,
            topicId: goal.topic_id,
            daysSpent,
            earliestGoalDate: startDate
          });
        });
      });

      return stats;
    } catch (error) {
      console.error('Error calculating student stats:', error);
      return [];
    }
  }, []);

  const loadTrackingData = useCallback(async () => {
    try {
      setLoading(true);
      const [stats, phases, topics] = await Promise.all([
        calculateStudentStats(),
        PhaseService.getAllPhases(),
        TopicService.getAll(COLLECTIONS.TOPICS)
      ]);

      // Get unique student IDs who have goals (active students)
      const activeStudentIds = new Set(stats.map(stat => stat.studentId));
      setTotalStudents(activeStudentIds.size);

      // Group stats by phase
      const phaseStats = new Map<string, StudentStats[]>();
      stats.forEach(stat => {
        if (!phaseStats.has(stat.phaseId)) {
          phaseStats.set(stat.phaseId, []);
        }
        phaseStats.get(stat.phaseId)!.push(stat);
      });

      // Group topics by phase
      const topicsByPhase = new Map<string, any[]>();
      topics.forEach((topic: any) => {
        if (!topicsByPhase.has(topic.phase_id)) {
          topicsByPhase.set(topic.phase_id, []);
        }
        topicsByPhase.get(topic.phase_id)!.push(topic);
      });

      // Sort phases by order to handle parallel phases correctly
      const sortedPhases = phases.sort((a: any, b: any) => a.order - b.order);

      // Separate standalone phases (order -1) from ordered phases
      const orderedPhases = sortedPhases.filter((phase: any) => phase.order >= 0);
      const standalonePhases = sortedPhases.filter((phase: any) => phase.order < 0);

      // Calculate phase data for ordered phases
      const orderedPhaseDataArray: PhaseData[] = [];
      orderedPhases.forEach((phase: any) => {
        const phaseStudentStats = phaseStats.get(phase.id) || [];
        const phaseTopics = topicsByPhase.get(phase.id) || [];

        // Calculate average days spent for phase
        const totalDays = phaseStudentStats.reduce((sum, stat) => sum + stat.daysSpent, 0);
        const averageDaysSpent = phaseStudentStats.length > 0 ? Math.round(totalDays / phaseStudentStats.length) : 0;

        // Calculate topic data
        const topicData: TopicData[] = [];
        phaseTopics.forEach(topic => {
          const topicStats = phaseStudentStats.filter(stat => stat.topicId === topic.id);
          const topicTotalDays = topicStats.reduce((sum, stat) => sum + stat.daysSpent, 0);
          const topicAverageDays = topicStats.length > 0 ? Math.round(topicTotalDays / topicStats.length) : 0;

          topicData.push({
            topicId: topic.id,
            topicName: topic.name,
            studentCount: topicStats.length,
            averageDaysSpent: topicAverageDays
          });
        });

        orderedPhaseDataArray.push({
          phaseId: phase.id,
          phaseName: phase.name,
          totalStudents: phaseStudentStats.length,
          averageDaysSpent,
          topics: topicData,
          order: phase.order
        });
      });

      // Calculate phase data for standalone phases
      const standalonePhaseDataArray: PhaseData[] = [];
      standalonePhases.forEach((phase: any) => {
        const phaseStudentStats = phaseStats.get(phase.id) || [];
        const phaseTopics = topicsByPhase.get(phase.id) || [];

        // Calculate average days spent for phase
        const totalDays = phaseStudentStats.reduce((sum, stat) => sum + stat.daysSpent, 0);
        const averageDaysSpent = phaseStudentStats.length > 0 ? Math.round(totalDays / phaseStudentStats.length) : 0;

        // Calculate topic data
        const topicData: TopicData[] = [];
        phaseTopics.forEach(topic => {
          const topicStats = phaseStudentStats.filter(stat => stat.topicId === topic.id);
          const topicTotalDays = topicStats.reduce((sum, stat) => sum + stat.daysSpent, 0);
          const topicAverageDays = topicStats.length > 0 ? Math.round(topicTotalDays / topicStats.length) : 0;

          topicData.push({
            topicId: topic.id,
            topicName: topic.name,
            studentCount: topicStats.length,
            averageDaysSpent: topicAverageDays
          });
        });

        standalonePhaseDataArray.push({
          phaseId: phase.id,
          phaseName: phase.name,
          totalStudents: phaseStudentStats.length,
          averageDaysSpent,
          topics: topicData,
          order: phase.order
        });
      });

      setPhaseData(orderedPhaseDataArray);
      setStandalonePhases(standalonePhaseDataArray);
      setStudentStats(stats);
    } catch (error) {
      console.error('Error loading tracking data:', error);
    } finally {
      setLoading(false);
    }
  }, [calculateStudentStats]);

  const handleTopicClick = useCallback((topicId: string, topicName: string, phaseId: string) => {
    // Find all students who have goals for this topic
    const topicStudents = studentStats.filter((stat: StudentStats) => stat.topicId === topicId);

    // Deduplicate students and aggregate their data
    const studentMap = new Map<string, { studentName: string; totalDays: number; goalCount: number; latestActivity: Date }>();

    topicStudents.forEach((stat: StudentStats) => {
      const existing = studentMap.get(stat.studentId);
      if (existing) {
        // Update existing student data
        existing.totalDays = Math.max(existing.totalDays, stat.daysSpent); // Use the maximum days spent
        existing.goalCount += 1;
        if (stat.earliestGoalDate > existing.latestActivity) {
          existing.latestActivity = stat.earliestGoalDate;
        }
      } else {
        // Add new student
        studentMap.set(stat.studentId, {
          studentName: stat.studentName,
          totalDays: stat.daysSpent,
          goalCount: 1,
          latestActivity: stat.earliestGoalDate
        });
      }
    });

    // Convert map to array and sort by days spent descending
    const studentDetails = Array.from(studentMap.values())
      .sort((a, b) => b.totalDays - a.totalDays);

    setSelectedTopic({
      topicId,
      topicName,
      students: studentDetails
    });
  }, [studentStats]);

  useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading journey tracking data...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Student Journey Tracking</h2>
          <p className="text-muted-foreground">
            Track student progress across curriculum phases and topics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            <Users className="h-4 w-4 mr-2" />
            {totalStudents} Active Students
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {phaseData.map((phase) => {
          const progressPercentage = totalStudents > 0 ? Math.round((phase.totalStudents / totalStudents) * 100) : 0;

          return (
            <div key={phase.phaseId} className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col">
              <div className="p-6 pb-3">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{phase.phaseName}</h3>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {phase.totalStudents} students
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Active students in phase</span>
                    <span className="font-medium text-gray-900">{progressPercentage}% of active students</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 pt-0 space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600">Average days spent:</span>
                  <span className="font-medium text-gray-900">{phase.averageDaysSpent} days</span>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-gray-900">
                    <BookOpen className="h-4 w-4" />
                    Topics
                  </h4>
                  <div className="grid gap-2">
                    {phase.topics.map((topic) => (
                      <div
                        key={topic.topicId}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md text-sm border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleTopicClick(topic.topicId, topic.topicName, phase.phaseId)}
                      >
                        <span className="text-gray-900 font-medium break-words pr-2">{topic.topicName}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                          <span>{topic.studentCount} students</span>
                          <span>•</span>
                          <span>{topic.averageDaysSpent}d avg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Self Learning Space Section */}
      {standalonePhases.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px bg-gray-300 flex-1"></div>
            <h3 className="text-lg font-semibold text-gray-900 bg-white px-4">Self Learning Space</h3>
            <div className="h-px bg-gray-300 flex-1"></div>
          </div>
          <p className="text-muted-foreground text-center">
            Standalone learning areas for personal development and career preparation
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {standalonePhases.map((phase) => {
              const progressPercentage = totalStudents > 0 ? Math.round((phase.totalStudents / totalStudents) * 100) : 0;

              return (
                <div key={phase.phaseId} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-md border border-purple-200 flex flex-col">
                  <div className="p-6 pb-3">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-purple-600 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">S</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{phase.phaseName}</h3>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {phase.totalStudents} students
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Students engaged</span>
                        <span className="font-medium text-gray-900">{progressPercentage}% of active students</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-6 pt-0 space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Average days spent:</span>
                      <span className="font-medium text-gray-900">{phase.averageDaysSpent} days</span>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-2 text-gray-900">
                        <BookOpen className="h-4 w-4" />
                        Learning Areas
                      </h4>
                      <div className="grid gap-2">
                        {phase.topics.map((topic) => (
                          <div
                            key={topic.topicId}
                            className="flex items-center justify-between p-3 bg-white rounded-md text-sm border border-gray-100 cursor-pointer hover:bg-purple-50 transition-colors"
                            onClick={() => handleTopicClick(topic.topicId, topic.topicName, phase.phaseId)}
                          >
                            <span className="text-gray-900 font-medium break-words pr-2">{topic.topicName}</span>
                            <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                              <span>{topic.studentCount} students</span>
                              <span>•</span>
                              <span>{topic.averageDaysSpent}d avg</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {phaseData.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No journey data available</h3>
          <p className="text-muted-foreground">
            Student goals and progress will appear here once they start their learning journey.
          </p>
        </div>
      )}
    </div>

    {/* Topic Details Modal */}
    {selectedTopic && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-6 w-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedTopic.topicName}</h2>
                <p className="text-sm text-gray-600">Student Progress Details</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTopic(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Total Students: {selectedTopic.students.length}</span>
                <span>Average Days: {selectedTopic.students.length > 0 ? Math.round(selectedTopic.students.reduce((sum, s) => sum + s.totalDays, 0) / selectedTopic.students.length) : 0} days</span>
              </div>
            </div>

            <div className="space-y-2">
              {selectedTopic.students
                .sort((a, b) => b.totalDays - a.totalDays) // Sort by days spent descending
                .map((student) => (
                <div
                  key={student.studentName}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gray-900 font-medium">{student.studentName}</span>
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      {student.goalCount} goal{student.goalCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{student.totalDays} days</span>
                  </div>
                </div>
              ))}
            </div>

            {selectedTopic.students.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No students have started this topic yet.
              </div>
            )}
          </div>

          <div className="flex justify-end p-6 border-t bg-gray-50">
            <button
              onClick={() => setSelectedTopic(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AdminJourneyTracking;