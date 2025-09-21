import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const applicationTables = {
  // Linear integration data
  linearProjects: defineTable({
    userId: v.string(),
    projectId: v.string(),
    projectName: v.string(),
    teamId: v.string(),
    teamName: v.string(),
    accessToken: v.string(), // encrypted
  }).index("by_user", ["userId"]),

  // Story points and velocity tracking
  storyPoints: defineTable({
    userId: v.string(),
    projectId: v.string(),
    issueId: v.string(),
    points: v.number(),
    completedAt: v.number(),
    sprintId: v.optional(v.string()),
    cycleId: v.optional(v.string()),
  })
    .index("by_user_and_date", ["userId", "completedAt"])
    .index("by_project", ["projectId"]),

  // Webcam mood and presence data
  moodData: defineTable({
    userId: v.string(),
    timestamp: v.number(),
    isAtDesk: v.boolean(),
    mood: v.optional(v.number()), // -3 to 3
  }).index("by_user_and_time", ["userId", "timestamp"]),

  // Work sessions (continuous presence at desk)
  workSessions: defineTable({
    userId: v.string(),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    duration: v.optional(v.number()), // in minutes
    averageMood: v.optional(v.number()),
    breaksTaken: v.number(),
  }).index("by_user_and_date", ["userId", "startTime"]),

  // Burnout risk scores
  burnoutScores: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD format
    riskScore: v.number(), // 0-100 scale
    factors: v.object({
      velocityScore: v.number(),
      moodScore: v.number(),
      workHoursScore: v.number(),
      breakScore: v.number(),
    }),
    notificationSent: v.boolean(),
  }).index("by_user_and_date", ["userId", "date"]),

  // User settings and preferences
  userSettings: defineTable({
    userId: v.string(),
    riskThreshold: v.number(), // 0-100, default 75
    notificationsEnabled: v.boolean(),
    workingHoursStart: v.number(), // hour of day (0-23)
    workingHoursEnd: v.number(), // hour of day (0-23)
    targetBreakInterval: v.number(), // minutes between breaks
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...applicationTables,
});
