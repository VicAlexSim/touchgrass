// Frontend utility for generating mock data for testing/development

export interface MockBurnoutScore {
  userId: string;
  date: string;
  riskScore: number;
  factors: {
    velocityScore: number;
    moodScore: number;
    workHoursScore: number;
    breakScore: number;
    commitPatternsScore?: number;
    wakatimeScore?: number;
    dataAvailability: {
      hasVelocityData: boolean;
      hasMoodData: boolean;
      hasWorkHoursData: boolean;
      hasBreakData: boolean;
      hasCommitData: boolean;
      hasWakatimeData: boolean;
    };
    appliedWeights: {
      velocityScore: number;
      moodScore: number;
      workHoursScore: number;
      breakScore: number;
      commitPatternsScore: number;
      wakatimeScore: number;
    };
    trendModifier: number;
    severityModifier: number;
    availableDataSources: number;
    factorDescriptions: {
      velocityScore: string;
      moodScore: string;
      workHoursScore: string;
      breakScore: string;
      commitPatternsScore: string;
      wakatimeScore: string;
    };
  };
  notificationSent: boolean;
}

export interface MockBreak {
  userId: string;
  startTime: number;
  endTime: number;
  duration: number;
  isValidBreak: boolean;
  date: string;
}

export interface MockWorkSession {
  userId: string;
  startTime: number;
  endTime: number;
  duration: number;
  averageMood: number;
  breaksTaken: number;
}

export function generateMockBurnoutData(userId: string, days: number = 30): MockBurnoutScore[] {
  const burnoutData: MockBurnoutScore[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().slice(0, 10);

    // Simulate varying burnout risk patterns
    const baseRisk = 45 + Math.sin(i * 0.2) * 20; // Cyclical pattern
    const weekendModifier = date.getDay() === 0 || date.getDay() === 6 ? -15 : 0;
    const randomVariation = (Math.random() - 0.5) * 20;

    const riskScore = Math.max(0, Math.min(100, baseRisk + weekendModifier + randomVariation));

    // Generate factor scores that contribute to the total risk
    const velocityScore = 30 + Math.random() * 40;
    const moodScore = 20 + Math.random() * 50;
    const workHoursScore = 25 + Math.random() * 45;
    const breakScore = 15 + Math.random() * 35;
    const commitPatternsScore = Math.random() > 0.3 ? 20 + Math.random() * 40 : undefined;
    const wakatimeScore = Math.random() > 0.4 ? 25 + Math.random() * 35 : undefined;

    const factorDescriptions = {
      velocityScore: velocityScore > 60 ? "High velocity detected - consider pacing" :
                   velocityScore > 40 ? "Moderate velocity - sustainable pace" :
                   "Low velocity - room for increased productivity",
      moodScore: moodScore > 60 ? "Elevated stress levels detected" :
               moodScore > 40 ? "Moderate mood fluctuations" :
               "Good mood stability maintained",
      workHoursScore: workHoursScore > 60 ? "Extended work hours - high burnout risk" :
                    workHoursScore > 40 ? "Moderate work hours - monitor closely" :
                    "Healthy work hours - good balance",
      breakScore: breakScore > 60 ? "Insufficient break frequency" :
                 breakScore > 40 ? "Break patterns need improvement" :
                 "Good break frequency maintained",
      commitPatternsScore: commitPatternsScore ?
                         (commitPatternsScore > 60 ? "Irregular commit patterns detected" :
                          commitPatternsScore > 40 ? "Moderate commit patterns" :
                          "Healthy commit patterns") : "No commit data available",
      wakatimeScore: wakatimeScore ?
                     (wakatimeScore > 60 ? "High coding intensity detected" :
                      wakatimeScore > 40 ? "Moderate coding activity" :
                      "Balanced coding time") : "No coding time data available",
    };

    burnoutData.push({
      userId,
      date: dateString,
      riskScore: Math.round(riskScore),
      factors: {
        velocityScore: Math.round(velocityScore),
        moodScore: Math.round(moodScore),
        workHoursScore: Math.round(workHoursScore),
        breakScore: Math.round(breakScore),
        commitPatternsScore: commitPatternsScore ? Math.round(commitPatternsScore) : undefined,
        wakatimeScore: wakatimeScore ? Math.round(wakatimeScore) : undefined,
        dataAvailability: {
          hasVelocityData: Math.random() > 0.2,
          hasMoodData: Math.random() > 0.1,
          hasWorkHoursData: Math.random() > 0.15,
          hasBreakData: Math.random() > 0.05,
          hasCommitData: commitPatternsScore !== undefined,
          hasWakatimeData: wakatimeScore !== undefined,
        },
        appliedWeights: {
          velocityScore: 0.25,
          moodScore: 0.2,
          workHoursScore: 0.2,
          breakScore: 0.15,
          commitPatternsScore: 0.1,
          wakatimeScore: 0.1,
        },
        trendModifier: i > 0 ? (Math.random() - 0.5) * 10 : 0,
        severityModifier: riskScore > 70 ? 15 : riskScore > 50 ? 5 : 0,
        availableDataSources: 5 + Math.floor(Math.random() * 2),
        factorDescriptions,
      },
      notificationSent: riskScore > 75 && Math.random() > 0.3,
    });
  }

  return burnoutData;
}

export function generateMockBreakData(userId: string, days: number = 30): MockBreak[] {
  const breakData: MockBreak[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().slice(0, 10);

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Generate realistic break patterns
    const totalBreaks = isWeekend ? Math.floor(Math.random() * 8) + 4 : Math.floor(Math.random() * 6) + 3;

    for (let j = 0; j < totalBreaks; j++) {
      // Simulate work day hours (9 AM - 6 PM on weekdays, more variable on weekends)
      const startHour = isWeekend ?
        10 + Math.random() * 8 :
        9 + Math.random() * 9;

      const startTime = new Date(date);
      startTime.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);
      const startTimeStamp = startTime.getTime();

      // Break duration (30 seconds to 15 minutes, with preference for 2-5 minute breaks)
      const duration = Math.random() < 0.1 ?
        30 + Math.random() * 30 : // Short breaks (30s-1min)
        Math.random() < 0.8 ?
        60 + Math.random() * 240 : // Normal breaks (1-5min)
        300 + Math.random() * 600; // Long breaks (5-15min)

      const endTimeStamp = startTimeStamp + duration;
      const isValidBreak = duration >= 60; // 1 minute minimum

      breakData.push({
        userId,
        startTime: startTimeStamp,
        endTime: endTimeStamp,
        duration: Math.round(duration),
        isValidBreak,
        date: dateString,
      });
    }
  }

  return breakData;
}

export function generateMockWorkSessions(userId: string, days: number = 30): MockWorkSession[] {
  const workSessions: MockWorkSession[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (!isWeekend || Math.random() > 0.3) { // 70% chance of work on weekends
      // Simulate work start time
      const startHour = 8 + Math.random() * 3; // 8 AM - 11 AM start
      const startTime = new Date(date);
      startTime.setHours(startHour, Math.floor(Math.random() * 60), 0, 0);
      const startTimeStamp = startTime.getTime();

      // Work duration (6-10 hours on weekdays, 2-6 hours on weekends)
      const workDuration = isWeekend ?
        2 * 3600 + Math.random() * 4 * 3600 :
        6 * 3600 + Math.random() * 4 * 3600;

      const endTimeStamp = startTimeStamp + workDuration;

      // Average mood and breaks taken
      const averageMood = -1 + Math.random() * 4; // -1 to 3 scale
      const breaksTaken = Math.floor(workDuration / 3600) + Math.floor(Math.random() * 3);

      workSessions.push({
        userId,
        startTime: startTimeStamp,
        endTime: endTimeStamp,
        duration: Math.round(workDuration / 60), // Convert to minutes
        averageMood: Math.round(averageMood * 10) / 10,
        breaksTaken,
      });
    }
  }

  return workSessions;
}

// Helper function to get risk level description
export function getRiskLevelDescription(score: number): string {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Moderate";
  if (score >= 20) return "Low";
  return "Minimal";
}

// Helper function to get risk level color
export function getRiskLevelColor(score: number): string {
  if (score >= 80) return "text-red-600 bg-red-50";
  if (score >= 60) return "text-orange-600 bg-orange-50";
  if (score >= 40) return "text-yellow-600 bg-yellow-50";
  if (score >= 20) return "text-blue-600 bg-blue-50";
  return "text-green-600 bg-green-50";
}