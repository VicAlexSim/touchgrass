import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";

// Calculate burnout risk score
export const calculateBurnoutScore = action({
  args: {},
  handler: async (
    ctx
  ): Promise<{ riskScore: number; factors: any; shouldNotify: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    const today = new Date().toISOString().slice(0, 10);

    // Get velocity data (last 14 days)
    const velocityScore: number = await ctx.runQuery(
      internal.burnout.getVelocityScore,
      { userId }
    );

    // Get mood data (last 7 days)
    const moodScore: number = await ctx.runQuery(
      internal.burnout.getMoodScore,
      { userId }
    );

    // Get work hours data (last 7 days)
    const workHoursScore: number = await ctx.runQuery(
      internal.burnout.getWorkHoursScore,
      { userId }
    );

    // Get break frequency score
    const breakScore: number = await ctx.runQuery(
      internal.burnout.getBreakScore,
      { userId }
    );

    // Get commit patterns score
    const commitPatternsScore: number = await ctx.runQuery(internal.burnout.getCommitPatternsScore, { userId });

    // Get Wakatime coding patterns score
    const wakatimeScore: number = await ctx.runQuery(internal.burnout.getWakatimeScore, { userId });

    // Enhanced burnout risk calculation with all data sources
    const rawFactors = {
      velocityScore: velocityScore || 0,
      moodScore: moodScore || 0,
      workHoursScore: workHoursScore || 0,
      breakScore: breakScore || 0,
      commitPatternsScore: commitPatternsScore || 0,
      wakatimeScore: wakatimeScore || 0,
    };

    // Calculate data availability weights (higher weight for available data)
    const dataAvailability = {
      hasVelocityData: velocityScore > 0,
      hasMoodData: moodScore > 0,
      hasWorkHoursData: workHoursScore > 0,
      hasBreakData: breakScore > 0,
      hasCommitData: commitPatternsScore > 0,
      hasWakatimeData: wakatimeScore > 0,
    };

    // Adaptive weighting based on available data
    const weights = {
      velocityScore: 0.15,    // Linear velocity changes
      moodScore: 0.30,        // Mood is crucial - increased from 0.25
      workHoursScore: 0.15,   // Work session patterns
      breakScore: 0.10,       // Break frequency
      commitPatternsScore: 0.15, // GitHub commit patterns
      wakatimeScore: 0.15,    // Wakatime coding patterns - reduced from 0.20
    };

    // Redistribute weights if some data is missing
    const availableDataCount = Object.values(dataAvailability).filter(Boolean).length;
    if (availableDataCount < 6) {
      // Redistribute missing data weights to available data
      const totalMissingWeight = 
        (!dataAvailability.hasVelocityData ? weights.velocityScore : 0) +
        (!dataAvailability.hasMoodData ? weights.moodScore : 0) +
        (!dataAvailability.hasWorkHoursData ? weights.workHoursScore : 0) +
        (!dataAvailability.hasBreakData ? weights.breakScore : 0) +
        (!dataAvailability.hasCommitData ? weights.commitPatternsScore : 0) +
        (!dataAvailability.hasWakatimeData ? weights.wakatimeScore : 0);

      // Redistribute to available data proportionally
      if (availableDataCount > 0) {
        const redistributionFactor = totalMissingWeight / availableDataCount;
        if (dataAvailability.hasVelocityData) weights.velocityScore += redistributionFactor;
        if (dataAvailability.hasMoodData) weights.moodScore += redistributionFactor;
        if (dataAvailability.hasWorkHoursData) weights.workHoursScore += redistributionFactor;
        if (dataAvailability.hasBreakData) weights.breakScore += redistributionFactor;
        if (dataAvailability.hasCommitData) weights.commitPatternsScore += redistributionFactor;
        if (dataAvailability.hasWakatimeData) weights.wakatimeScore += redistributionFactor;
      }
    }

    // Calculate base risk score
    const baseRiskScore = 
      (rawFactors.velocityScore * weights.velocityScore) +
      (rawFactors.moodScore * weights.moodScore) +
      (rawFactors.workHoursScore * weights.workHoursScore) +
      (rawFactors.breakScore * weights.breakScore) +
      (rawFactors.commitPatternsScore * weights.commitPatternsScore) +
      (rawFactors.wakatimeScore * weights.wakatimeScore);

    // Apply trend analysis modifier
    const recentScores = await ctx.runQuery(internal.burnout.getRecentBurnoutTrend, { userId });
    let trendModifier = 0;
    
    if (recentScores.length >= 3) {
      // Calculate if burnout is trending up or down
      const trend = (recentScores[0] - recentScores[recentScores.length - 1]) / recentScores.length;
      if (trend > 5) trendModifier = 5; // Increasing trend
      else if (trend < -5) trendModifier = -3; // Decreasing trend
    }

    // Apply severity amplification for high-risk combinations
    let severityModifier = 0;
    const highRiskFactors = Object.values(rawFactors).filter(score => score >= 70).length;
    
    if (highRiskFactors >= 3) severityModifier = 10; // Multiple high-risk factors
    else if (highRiskFactors >= 2) severityModifier = 5; // Two high-risk factors

    // Calculate final risk score with modifiers
    const riskScore = Math.round(
      Math.max(0, Math.min(100, baseRiskScore + trendModifier + severityModifier))
    );

    // Enhanced factors object with more context
    const factors = {
      // Core scores
      velocityScore: rawFactors.velocityScore,
      moodScore: rawFactors.moodScore,
      workHoursScore: rawFactors.workHoursScore,
      breakScore: rawFactors.breakScore,
      commitPatternsScore: rawFactors.commitPatternsScore,
      wakatimeScore: rawFactors.wakatimeScore,
      
      // Analysis metadata
      dataAvailability,
      appliedWeights: weights,
      trendModifier,
      severityModifier,
      availableDataSources: availableDataCount,
      
      // Factor descriptions for UI
      factorDescriptions: {
        velocityScore: `Linear Velocity (${dataAvailability.hasVelocityData ? 'Active' : 'No Data'})`,
        moodScore: `AI Mood Analysis (${dataAvailability.hasMoodData ? 'Active' : 'No Data'})`,
        workHoursScore: `Work Patterns (${dataAvailability.hasWorkHoursData ? 'Active' : 'No Data'})`,
        breakScore: `Break Frequency (${dataAvailability.hasBreakData ? 'Active' : 'No Data'})`,
        commitPatternsScore: `GitHub Activity (${dataAvailability.hasCommitData ? 'Active' : 'No Data'})`,
        wakatimeScore: `Coding Time (${dataAvailability.hasWakatimeData ? 'Active' : 'No Data'})`,
      }
    };

    // Store the score
    await ctx.runMutation(internal.burnout.storeBurnoutScore, {
      userId,
      date: today,
      riskScore,
      factors,
    });

    // Check if notification should be sent
    const settings = await ctx.runQuery(internal.burnout.getUserSettings, {
      userId,
    });
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
    const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const recentPoints = await ctx.db
      .query("storyPoints")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("completedAt"), oneWeekAgo))
      .collect();

    const previousPoints = await ctx.db
      .query("storyPoints")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .filter(
        (q) =>
          q.gte(q.field("completedAt"), twoWeeksAgo) &&
          q.lt(q.field("completedAt"), oneWeekAgo)
      )
      .collect();

    const recentVelocity = recentPoints.reduce((sum, sp) => sum + sp.points, 0);
    const previousVelocity = previousPoints.reduce(
      (sum, sp) => sum + sp.points,
      0
    );

    if (previousVelocity === 0) return 0;

    const velocityChange =
      (recentVelocity - previousVelocity) / previousVelocity;

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
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const moodData = await ctx.db
      .query("moodData")
      .withIndex("by_user_and_time", (q) =>
        q.eq("userId", args.userId).gte("timestamp", oneWeekAgo)
      )
      .collect();

    if (moodData.length === 0) return 0;

    // Helper function to normalize mood to numeric value
    const normalizeMood = (moodValue: number | string | undefined): number => {
      if (typeof moodValue === 'number') return moodValue;
      if (typeof moodValue === 'string') {
        // Map string moods to numeric scale -3 to 3
        const moodMap: Record<string, number> = {
          'very happy': 3, 'happy': 2, 'content': 1, 'satisfied': 1,
          'neutral': 0, 'calm': 0,
          'tired': -1, 'stressed': -2, 'frustrated': -2, 'sad': -3, 'angry': -3
        };
        return moodMap[moodValue.toLowerCase()] || 0;
      }
      return 0;
    };

    const averageMood =
      moodData.reduce((sum, m) => sum + normalizeMood(m.mood), 0) / moodData.length;

    // Lower mood = higher burnout risk (convert to 0-100 scale where higher = more risk)
    // -3 to 3 scale -> 0 to 100 scale where negative mood = higher risk
    const riskScore = Math.round(50 - (averageMood * 16.67)); // Map -3 to 100, 3 to 0
    return Math.max(0, Math.min(100, riskScore));
  },
});

export const getWorkHoursScore = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).gte("startTime", oneWeekAgo)
      )
      .collect();

    const totalHours =
      sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
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
    const today = new Date().toISOString().slice(0, 10);

    // Get today's break data
    const todayBreaks = await ctx.db
      .query("breaks")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).eq("date", today)
      )
      .collect();

    // Get today's work sessions
    const todaySessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", args.userId).gte("startTime", new Date().setHours(0, 0, 0, 0))
      )
      .collect();

    const validBreaks = todayBreaks.filter(b => b.isValidBreak);
    const totalWorkTime = todaySessions.reduce(
      (sum, s) => sum + (s.duration || 0),
      0
    );

    if (totalWorkTime === 0) return 0;

    const breaksPerHour = validBreaks.length / (totalWorkTime / 60);

    // Enhanced break scoring with additional factors
    let score = 10; // Base good score

    // Factor 1: Break frequency (primary factor)
    if (breaksPerHour < 0.3) score = 90; // Less than 1 break per 3 hours = very high risk
    else if (breaksPerHour < 0.5) score = 80; // Less than 1 break per 2 hours = high risk
    else if (breaksPerHour < 1) score = 50; // Less than 1 break per hour = moderate risk

    // Factor 2: Average break duration
    const totalBreakTime = validBreaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    const averageBreakDuration = validBreaks.length > 0 ? totalBreakTime / validBreaks.length : 0;

    // Too short breaks = higher risk (indicates rushing)
    if (averageBreakDuration < 120 && validBreaks.length > 0) { // Less than 2 minutes average
      score = Math.min(100, score + 20);
    }

    // Factor 3: Long work periods without breaks
    if (totalWorkTime > 120 && validBreaks.length === 0) { // 2+ hours with no breaks
      score = 95;
    } else if (totalWorkTime > 60 && validBreaks.length === 0) { // 1+ hour with no breaks
      score = Math.max(score, 70);
    }

    // Factor 4: Check for very long continuous work periods
    const workSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("startTime"), Date.now() - 7 * 24 * 60 * 60 * 1000))
      .collect();

    const longSessions = workSessions.filter(s =>
      (s.duration || 0) > 180 && (s.breaksTaken || 0) === 0 // 3+ hours with no breaks
    ).length;

    if (longSessions > 2) score = Math.max(score, 85); // Multiple long sessions without breaks

    return Math.min(100, Math.max(0, score));
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

export const getWakatimeScore = internalQuery({
  args: { userId: v.string() },
  returns: v.number(),
  handler: async (ctx, _args): Promise<number> => {
    try {
      return await ctx.runQuery(api.wakatime.calculateWakatimeRisk, {});
    } catch (error) {
      console.warn("Failed to calculate Wakatime risk:", error);
      return 0; // Return 0 if Wakatime data is unavailable
    }
  },
});

// Get recent burnout trend for trend analysis
export const getRecentBurnoutTrend = internalQuery({
  args: { userId: v.string() },
  returns: v.array(v.number()),
  handler: async (ctx, args) => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    
    const recentScores = await ctx.db
      .query("burnoutScores")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", args.userId).gte("date", new Date(sevenDaysAgo).toISOString().slice(0, 10))
      )
      .order("desc")
      .take(7);
    
    return recentScores.map(score => score.riskScore);
  },
});

export const storeBurnoutScore = internalMutation({
  args: {
    userId: v.string(),
    date: v.string(),
    riskScore: v.number(),
    factors: v.object({
      // Core burnout factor scores
      velocityScore: v.number(),
      moodScore: v.number(),
      workHoursScore: v.number(),
      breakScore: v.number(),
      commitPatternsScore: v.optional(v.number()),
      wakatimeScore: v.optional(v.number()),

      // Analysis metadata
      dataAvailability: v.object({
        hasVelocityData: v.boolean(),
        hasMoodData: v.boolean(),
        hasWorkHoursData: v.boolean(),
        hasBreakData: v.boolean(),
        hasCommitData: v.boolean(),
        hasWakatimeData: v.boolean(),
      }),
      appliedWeights: v.object({
        velocityScore: v.number(),
        moodScore: v.number(),
        workHoursScore: v.number(),
        breakScore: v.number(),
        commitPatternsScore: v.number(),
        wakatimeScore: v.number(),
      }),
      trendModifier: v.number(),
      severityModifier: v.number(),
      availableDataSources: v.number(),

      // Factor descriptions for UI
      factorDescriptions: v.object({
        velocityScore: v.string(),
        moodScore: v.string(),
        workHoursScore: v.string(),
        breakScore: v.string(),
        commitPatternsScore: v.string(),
        wakatimeScore: v.string(),
      }),
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
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

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

// Migration function to clear old burnout scores that don't match the new schema
export const clearOldBurnoutScores = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get all burnout scores for this user
    const scores = await ctx.db
      .query("burnoutScores")
      .withIndex("by_user_and_date", (q) => q.eq("userId", identity.subject))
      .collect();

    // Delete them all
    for (const score of scores) {
      await ctx.db.delete(score._id);
    }

    console.log(`Cleared ${scores.length} old burnout scores for schema migration`);
    return { deleted: scores.length };
  },
});
