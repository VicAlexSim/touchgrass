import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

// Process webcam frame with face-api.js real analysis
export const processWebcamFrame = action({
  args: {
    imageData: v.string(), // base64 encoded image
    mood: v.string(), // detected mood from face-api.js
    moodScore: v.number(), // mood score from face-api.js
    isPresent: v.boolean(), // face detected
    confidence: v.number(), // detection confidence
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    // Use real analysis data from face-api.js
    const moodAnalysis = {
      mood: args.mood,
      moodScore: args.moodScore,
      isPresent: args.isPresent,
      confidence: args.confidence,
    };

    // Only store data if confidence is above threshold
    if (moodAnalysis.confidence > 0.5) {
      // Store mood data
      await ctx.runMutation(internal.webcam.storeMoodData, {
        userId,
        timestamp: Date.now(),
        ...moodAnalysis,
      });

      // Update or create work session
      await ctx.runMutation(internal.webcam.updateWorkSession, {
        userId,
        isPresent: moodAnalysis.isPresent,
        moodScore: moodAnalysis.moodScore,
      });
    }

    return moodAnalysis;
  },
});

export const storeMoodData = internalMutation({
  args: {
    userId: v.string(),
    timestamp: v.number(),
    mood: v.string(),
    moodScore: v.number(),
    isPresent: v.boolean(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("moodData", args);
  },
});

export const updateWorkSession = internalMutation({
  args: {
    userId: v.string(),
    isPresent: v.boolean(),
    moodScore: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000);

    // Get current active session
    const activeSession = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .first();

    if (args.isPresent) {
      if (!activeSession) {
        // Start new session
        await ctx.db.insert("workSessions", {
          userId: args.userId,
          startTime: now,
          averageMood: args.moodScore,
          breaksTaken: 0,
        });
      } else {
        // Update existing session
        const sessionMoods = await ctx.db
          .query("moodData")
          .withIndex("by_user_and_time", (q) => 
            q.eq("userId", args.userId)
          )
          .filter((q) => q.gte(q.field("timestamp"), activeSession.startTime))
          .collect();

        const avgMood = sessionMoods.length > 0
          ? sessionMoods.reduce((sum, m) => sum + m.moodScore, 0) / sessionMoods.length
          : args.moodScore;

        await ctx.db.patch(activeSession._id, {
          averageMood: avgMood,
        });
      }
    } else {
      if (activeSession) {
        // End current session
        const duration = Math.floor((now - activeSession.startTime) / (60 * 1000)); // minutes
        await ctx.db.patch(activeSession._id, {
          endTime: now,
          duration,
        });
      }
    }
  },
});

// Get mood analytics
export const getMoodAnalytics = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const days = args.days || 7;
    const since = Date.now() - (days * 24 * 60 * 60 * 1000);

    const moodData = await ctx.db
      .query("moodData")
      .withIndex("by_user_and_time", (q) => 
        q.eq("userId", userId)
      )
      .filter((q) => q.gte(q.field("timestamp"), since))
      .collect();

    // Group by day
    const dailyMood = new Map<string, { total: number; count: number }>();
    
    moodData.forEach(mood => {
      const day = new Date(mood.timestamp).toISOString().slice(0, 10);
      const current = dailyMood.get(day) || { total: 0, count: 0 };
      dailyMood.set(day, {
        total: current.total + mood.moodScore,
        count: current.count + 1,
      });
    });

    const moodTrend = Array.from(dailyMood.entries())
      .map(([date, data]) => ({
        date,
        averageMood: Math.round(data.total / data.count),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      moodTrend,
      currentMood: moodData.length > 0 ? moodData[moodData.length - 1] : null,
      totalDataPoints: moodData.length,
    };
  },
});

// Get work session analytics
export const getWorkSessionAnalytics = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const days = args.days || 7;
    const since = Date.now() - (days * 24 * 60 * 60 * 1000);

    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", userId)
      )
      .filter((q) => q.gte(q.field("startTime"), since))
      .collect();

    // Group by day
    const dailyHours = new Map<string, number>();
    
    sessions.forEach(session => {
      const day = new Date(session.startTime).toISOString().slice(0, 10);
      const hours = session.duration ? session.duration / 60 : 0;
      dailyHours.set(day, (dailyHours.get(day) || 0) + hours);
    });

    const workHoursTrend = Array.from(dailyHours.entries())
      .map(([date, hours]) => ({ date, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalHours = Array.from(dailyHours.values()).reduce((sum, h) => sum + h, 0);
    const averageHours = workHoursTrend.length > 0 ? totalHours / workHoursTrend.length : 0;

    return {
      workHoursTrend,
      totalHours: Math.round(totalHours * 10) / 10,
      averageHours: Math.round(averageHours * 10) / 10,
      activeSessions: sessions.filter(s => !s.endTime).length,
    };
  },
});
