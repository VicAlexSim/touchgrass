import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Create sample data for demo purposes
export const createSampleData = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = "demo-user-123";
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    // Create sample story points data for the last 14 days
    for (let i = 0; i < 14; i++) {
      const date = now - (i * oneDay);
      const points = Math.floor(Math.random() * 8) + 2; // 2-10 points per day
      
      await ctx.db.insert("storyPoints", {
        userId,
        projectId: "sample-project",
        issueId: `issue-${i}`,
        points,
        completedAt: date,
        cycleId: `cycle-${Math.floor(i / 7)}`,
      });
    }

    // Create sample mood data for the last 7 days
    for (let i = 0; i < 7; i++) {
      for (let hour = 9; hour < 18; hour++) {
        const timestamp = now - (i * oneDay) + (hour * 60 * 60 * 1000);
        const moodScore = Math.floor(Math.random() * 40) + 60; // 60-100 mood score
        const mood = moodScore > 80 ? "happy" : moodScore > 70 ? "neutral" : "stressed";
        
        await ctx.db.insert("moodData", {
          userId,
          timestamp,
          mood,
          moodScore,
          isPresent: Math.random() > 0.1, // 90% present
          confidence: 0.8 + Math.random() * 0.2,
        });
      }
    }

    // Create sample work sessions
    for (let i = 0; i < 7; i++) {
      const date = now - (i * oneDay);
      const startTime = date + (9 * 60 * 60 * 1000); // 9 AM
      const duration = Math.floor(Math.random() * 240) + 360; // 6-10 hours
      
      await ctx.db.insert("workSessions", {
        userId,
        startTime,
        endTime: startTime + (duration * 60 * 1000),
        duration,
        averageMood: Math.floor(Math.random() * 30) + 70,
        breaksTaken: Math.floor(Math.random() * 5) + 2,
      });
    }

    // Create sample burnout scores
    for (let i = 0; i < 7; i++) {
      const date = new Date(now - (i * oneDay)).toISOString().slice(0, 10);
      const riskScore = Math.floor(Math.random() * 60) + 20; // 20-80 risk score
      
      const velocityScore = Math.floor(Math.random() * 50) + 25;
      const moodScore = Math.floor(Math.random() * 40) + 30;
      const workHoursScore = Math.floor(Math.random() * 60) + 20;
      const breakScore = Math.floor(Math.random() * 30) + 10;
      const commitPatternsScore = Math.floor(Math.random() * 40) + 10;
      const wakatimeScore = Math.floor(Math.random() * 35) + 15;
      
      await ctx.db.insert("burnoutScores", {
        userId,
        date,
        riskScore,
        factors: {
          // Core burnout factor scores
          velocityScore,
          moodScore,
          workHoursScore,
          breakScore,
          commitPatternsScore,
          wakatimeScore,
          
          // Analysis metadata
          dataAvailability: {
            hasVelocityData: true,
            hasMoodData: true,
            hasWorkHoursData: true,
            hasBreakData: true,
            hasCommitData: true,
            hasWakatimeData: true,
          },
          appliedWeights: {
            velocityScore: 0.15,
            moodScore: 0.30,
            workHoursScore: 0.15,
            breakScore: 0.10,
            commitPatternsScore: 0.15,
            wakatimeScore: 0.15,
          },
          trendModifier: 0,
          severityModifier: 0,
          availableDataSources: 6,
          
          // Factor descriptions for UI
          factorDescriptions: {
            velocityScore: "Linear Velocity (Active)",
            moodScore: "AI Mood Analysis (Active)",
            workHoursScore: "Work Patterns (Active)",
            breakScore: "Break Frequency (Active)",
            commitPatternsScore: "GitHub Activity (Active)",
            wakatimeScore: "Coding Time (Active)",
          },
        },
        notificationSent: false,
      });
    }

    // Create user settings
    await ctx.db.insert("userSettings", {
      userId,
      riskThreshold: 75,
      notificationsEnabled: true,
      workingHoursStart: 9,
      workingHoursEnd: 17,
      targetBreakInterval: 120,
    });

    return null;
  },
});
