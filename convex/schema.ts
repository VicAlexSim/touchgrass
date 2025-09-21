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
    completedAt: v.optional(v.number()), // undefined for active issues, timestamp for completed
    sprintId: v.optional(v.string()),
    cycleId: v.optional(v.string()),
  })
    .index("by_user_and_date", ["userId", "completedAt"])
    .index("by_project", ["projectId"]),

  // Webcam mood and presence data
  moodData: defineTable({
    userId: v.string(),
    timestamp: v.number(),
    // Face-api.js fields
    isAtDesk: v.optional(v.boolean()),
    // TwelveLabs fields  
    isPresent: v.optional(v.boolean()),
    mood: v.optional(v.union(v.number(), v.string())), // -3 to 3 for face-api or string for TwelveLabs
    moodScore: v.optional(v.number()), // TwelveLabs numerical mood score
    confidence: v.optional(v.number()), // TwelveLabs confidence score
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
      commitPatternsScore: v.optional(v.number()), // based on late night commits, weekend work, etc.
      wakatimeScore: v.optional(v.number()), // based on coding time patterns and intensity
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

  // GitHub commit tracking
  githubCommits: defineTable({
    userId: v.string(),
    username: v.string(), // GitHub username
    sha: v.string(), // commit hash
    message: v.string(),
    timestamp: v.number(), // commit timestamp
    repository: v.string(), // repo name
    additions: v.optional(v.number()),
    deletions: v.optional(v.number()),
    filesChanged: v.optional(v.number()),
  }).index("by_user_and_time", ["userId", "timestamp"])
    .index("by_username", ["username"]),

  // Wakatime coding time tracking
  wakatimeSettings: defineTable({
    userId: v.string(),
    apiKey: v.string(), // Wakatime API key (should be encrypted in production)
    endpoint: v.optional(v.string()), // Custom API endpoint
    lastSync: v.optional(v.number()),
    isActive: v.boolean(),
    defaultRange: v.optional(v.string()), // "today", "last_7_days", "last_30_days", "all_time"
  }).index("by_user", ["userId"]),

  // Daily Wakatime coding data
  wakatimeDailyData: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD format
    codingTime: v.number(), // in seconds
    languages: v.optional(v.array(v.object({
      name: v.string(),
      time: v.number(),
      percentage: v.number(),
    }))),
    projects: v.optional(v.array(v.object({
      name: v.string(),
      time: v.number(),
      percentage: v.number(),
    }))),
    lastUpdated: v.number(),
  }).index("by_user_and_date", ["userId", "date"]),
};

export default defineSchema({
  ...applicationTables,
});
