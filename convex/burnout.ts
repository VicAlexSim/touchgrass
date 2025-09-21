import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";

// Calculate burnout risk score
export const calculateBurnoutScore = action({
  args: {},
  handler: async (ctx): Promise<{ riskScore: number; factors: any; shouldNotify: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    const today = new Date().toISOString().slice(0, 10);

    // Get velocity data (last 14 days)
    const velocityScore: number = await ctx.runQuery(internal.burnout.getVelocityScore, { userId });
    
    // Get mood data (last 7 days)
    const moodScore: number = await ctx.runQuery(internal.burnout.getMoodScore, { userId });
    
    // Get work hours data (last 7 days)
    const workHoursScore: number = await ctx.runQuery(internal.burnout.getWorkHoursScore, { userId });
    
    // Get break frequency score
    const breakScore: number = await ctx.runQuery(internal.burnout.getBreakScore, { userId });

    // Get commit patterns score
    const commitPatternsScore: number = await ctx.runQuery(internal.burnout.getCommitPatternsScore, { userId });

    // Calculate weighted risk score (0-100)
    const factors = {
      velocityScore: velocityScore || 0,
      moodScore: moodScore || 0,
      workHoursScore: workHoursScore || 0,
      breakScore: breakScore || 0,
      commitPatternsScore: commitPatternsScore || 0,
    };

    const riskScore = Math.round(
      (factors.velocityScore * 0.20) +
      (factors.moodScore * 0.30) +
      (factors.workHoursScore * 0.20) +
      (factors.breakScore * 0.10) +
      (factors.commitPatternsScore * 0.20)
    );

    // Store the score
    await ctx.runMutation(internal.burnout.storeBurnoutScore, {
      userId,
      date: today,
      riskScore,
      factors,
    });

    // Check if notification should be sent
    const settings = await ctx.runQuery(internal.burnout.getUserSettings, { userId });
    const threshold = settings?.riskThreshold || 75;

    if (riskScore >= threshold && settings?.notificationsEnabled !== false) {
      await ctx.runMutation(internal.burnout.markNotificationSent, {
        userId,
        date: today,
      });
      
      return { riskScore, factors, shouldNotify: true };
    }

    return { riskScore, factors, shouldNotify: false };
  },
});

// Internal scoring functions
export const getVelocityScore = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const recentPoints = await ctx.db
      .query("storyPoints")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", args.userId)
      )
      .filter((q) => q.gte(q.field("completedAt"), oneWeekAgo))
      .collect();

    const previousPoints = await ctx.db
      .query("storyPoints")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", args.userId)
      )
      .filter((q) => q.gte(q.field("completedAt"), twoWeeksAgo) && q.lt(q.field("completedAt"), oneWeekAgo))
      .collect();

    const recentVelocity = recentPoints.reduce((sum, sp) => sum + sp.points, 0);
    const previousVelocity = previousPoints.reduce((sum, sp) => sum + sp.points, 0);

    if (previousVelocity === 0) return 0;

    const velocityChange = (recentVelocity - previousVelocity) / previousVelocity;
    
    // High velocity increase = higher burnout risk
    if (velocityChange > 0.5) return 80; // 50%+ increase
    if (velocityChange > 0.3) return 60; // 30%+ increase
    if (velocityChange > 0.1) return 40; // 10%+ increase
    if (velocityChange < -0.3) return 70; // 30%+ decrease (also risky)
    
    return 20; // Normal velocity
  },
});

export const getMoodScore = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const moodData = await ctx.db
      .query("moodData")
      .withIndex("by_user_and_time", (q) => 
        q.eq("userId", args.userId).gte("timestamp", oneWeekAgo)
      )
      .collect();

    if (moodData.length === 0) return 0;

    const averageMood = moodData.reduce((sum, m) => sum + m.moodScore, 0) / moodData.length;
    
    // Lower mood = higher burnout risk (invert the score)
    return Math.round(100 - averageMood);
  },
});

export const getWorkHoursScore = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", args.userId).gte("startTime", oneWeekAgo)
      )
      .collect();

    const totalHours = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
    const averageHoursPerDay = totalHours / 7;

    // More than 10 hours/day = high risk
    if (averageHoursPerDay > 10) return 90;
    if (averageHoursPerDay > 8) return 60;
    if (averageHoursPerDay > 6) return 30;
    if (averageHoursPerDay < 2) return 20; // Too little work might indicate disengagement
    
    return 10; // Normal work hours
  },
});

export const getBreakScore = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const today = Date.now();
    const startOfDay = new Date(today).setHours(0, 0, 0, 0);

    const todaySessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", args.userId).gte("startTime", startOfDay)
      )
      .collect();

    const totalBreaks = todaySessions.reduce((sum, s) => sum + s.breaksTaken, 0);
    const totalWorkTime = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    if (totalWorkTime === 0) return 0;

    const breaksPerHour = totalBreaks / (totalWorkTime / 60);
    
    // Less than 1 break per 2 hours = high risk
    if (breaksPerHour < 0.5) return 80;
    if (breaksPerHour < 1) return 50;
    
    return 10; // Good break frequency
  },
});

export const getCommitPatternsScore = internalQuery({
  args: { userId: v.string() },
  returns: v.number(),
  handler: async (ctx, _args): Promise<number> => {
    try {
      return await ctx.runQuery(api.github.calculateCommitPatternsRisk, {});
    } catch (error) {
      console.warn("Failed to calculate commit patterns risk:", error);
      return 0; // Return 0 if GitHub data is unavailable
    }
  },
});

export const storeBurnoutScore = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    riskScore: v.number(),
    factors: v.object({
      velocityScore: v.number(),
      moodScore: v.number(),
      workHoursScore: v.number(),
      breakScore: v.number(),
      commitPatternsScore: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("burnoutScores")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        riskScore: args.riskScore,
        factors: args.factors,
      });
    }

    return await ctx.db.insert("burnoutScores", {
      ...args,
      notificationSent: false,
    });
  },
});

export const getUserSettings = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const markNotificationSent = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const score = await ctx.db
      .query("burnoutScores")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();

    if (score) {
      await ctx.db.patch(score._id, { notificationSent: true });
    }
  },
});

// Get burnout history
export const getBurnoutHistory = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const days = args.days || 30;
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
      .toISOString().slice(0, 10);

    const scores = await ctx.db
      .query("burnoutScores")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", userId).gte("date", since)
      )
      .collect();

    return scores.sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Get current risk score
export const getCurrentRiskScore = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const today = new Date().toISOString().slice(0, 10);

    return await ctx.db
      .query("burnoutScores")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", userId).eq("date", today)
      )
      .first();
  },
});

// Update user settings
export const updateUserSettings = mutation({
  args: {
    riskThreshold: v.optional(v.number()),
    notificationsEnabled: v.optional(v.boolean()),
    workingHoursStart: v.optional(v.number()),
    workingHoursEnd: v.optional(v.number()),
    targetBreakInterval: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const settings = {
      userId,
      riskThreshold: args.riskThreshold ?? 75,
      notificationsEnabled: args.notificationsEnabled ?? true,
      workingHoursStart: args.workingHoursStart ?? 9,
      workingHoursEnd: args.workingHoursEnd ?? 17,
      targetBreakInterval: args.targetBreakInterval ?? 120,
    };

    if (existing) {
      await ctx.db.patch(existing._id, settings);
      return existing._id;
    }

    return await ctx.db.insert("userSettings", settings);
  },
});
