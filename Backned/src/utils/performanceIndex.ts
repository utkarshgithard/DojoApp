export interface PerformanceScoreBreakdown {
  score: number;
  studyHours: number;
  studyPoints: number;
  lectureScore: number;
  taskPoints: number;
  tasksCompleted: number;
  tasksTotal: number;
  sessionPoints: number;
  sessionsCount: number;
  communityPoints: number;
  postedToday: boolean;
  lectureAwarded: boolean;
  studyDurationSeconds: number;
}

interface DailyPerformanceParams {
  studyDurationSeconds: number;
  scheduledSubjects: Array<{ name: string }>;
  attendanceEntries: Array<{ subject: string; status: string }>;
  completedTasks: number;
  totalTasks: number;
  sessionsCount: number;
  postedToday: boolean;
}

export function calculateDailyPerformanceScore({
  studyDurationSeconds,
  scheduledSubjects,
  attendanceEntries,
  completedTasks,
  totalTasks,
  sessionsCount,
  postedToday,
}: DailyPerformanceParams): PerformanceScoreBreakdown {
  const studyHours = studyDurationSeconds / 3600;
  const studyPoints = Math.min(Math.round(studyHours * 10 * 10) / 10, 40);

  const hasScheduledClasses = scheduledSubjects.length > 0;
  let lectureScore = 0;
  let lectureAwarded = false;

  if (!hasScheduledClasses) {
    lectureScore = 20;
    lectureAwarded = true;
  } else if (attendanceEntries.length > 0) {
    const requiredSubjects = scheduledSubjects.map((subject) => subject.name);
    const entryMap = new Map(attendanceEntries.map((entry) => [entry.subject, entry.status]));
    const allComplete = requiredSubjects.every((subject) => {
      const status = entryMap.get(subject);
      return status === 'attended' || status === 'cancelled';
    });

    if (allComplete) {
      lectureScore = 20;
      lectureAwarded = true;
    }
  }

  const taskPoints = Math.min(completedTasks * 10, 20);
  const sessionPoints = Math.min(sessionsCount * 5, 10);
  const communityPoints = postedToday ? 10 : 0;

  const score = Math.min(
    studyPoints + lectureScore + taskPoints + sessionPoints + communityPoints,
    100
  );

  return {
    score,
    studyHours,
    studyPoints,
    lectureScore,
    taskPoints,
    tasksCompleted: completedTasks,
    tasksTotal: totalTasks,
    sessionPoints,
    sessionsCount,
    communityPoints,
    postedToday,
    lectureAwarded,
    studyDurationSeconds,
  };
}
