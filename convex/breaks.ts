import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Start tracking a break when user leaves desk
export const startBreak = mutation({
  args: {
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    // Get the active work session
    const activeSession = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .first();

    const today = new Date(args.timestamp).toISOString().slice(0, 10);

    // Create new break record
    const breakId = await ctx.db.insert("breaks", {
      userId,
      startTime: args.timestamp,
      isValidBreak: false, // Will be updated when break ends
      workSessionId: activeSession?._id,
      date: today,
    });

    return breakId;
  },
});

// End tracking a break and calculate duration
export const endBreak = mutation({
  args: {
    timestamp: v.number(),
  },
  handler: async (ctx, args): Promise<{
    breakId: any;
    duration: number;
    isValidBreak: boolean;
    breakMinutes: number;
  } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    // Find the most recent break without end time
    const activeBreak = await ctx.db
      .query("breaks")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .order("desc")
      .first();

    if (!activeBreak) {
      // No active break found, create a new one (edge case)
      await ctx.runMutation(internal.breaks.startBreakInternal, {
        userId,
        timestamp: args.timestamp,
      });
      return null;
    }

    const duration = Math.floor((args.timestamp - activeBreak.startTime) / 1000); // in seconds
    const isValidBreak = duration >= 60; // 1 minute minimum

    // Update the break record
    await ctx.db.patch(activeBreak._id, {
      endTime: args.timestamp,
      duration,
      isValidBreak,
    });

    // If valid break, update the associated work session
    if (isValidBreak && activeBreak.workSessionId) {
      const session = await ctx.db.get(activeBreak.workSessionId);
      if (session) {
        await ctx.db.patch(session._id, {
          breaksTaken: (session.breaksTaken || 0) + 1,
        });
      }
    }

    return {
      breakId: activeBreak._id,
      duration,
      isValidBreak,
      breakMinutes: Math.round(duration / 60 * 10) / 10
    };
  },
});

// Process break status from webcam detection
export const processBreakStatus = internalMutation({
  args: {
    userId: v.string(),
    isAtDesk: v.boolean(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Get the user's last break/mood status to detect transitions
    const lastStatus = await ctx.db
      .query("moodData")
      .withIndex("by_user_and_time", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();

    const wasAtDesk = lastStatus?.isAtDesk ?? true;

    // Detect transition from desk to break
    if (wasAtDesk && !args.isAtDesk) {
      // User just left desk - start break tracking
      await ctx.runMutation(internal.breaks.startBreakInternal, {
        userId: args.userId,
        timestamp: args.timestamp,
      });
    }
    // Detect transition from break to desk
    else if (!wasAtDesk && args.isAtDesk) {
      // User just returned to desk - end break tracking
      await ctx.runMutation(internal.breaks.endBreakInternal, {
        userId: args.userId,
        timestamp: args.timestamp,
      });
    }
  },
});

// Internal function to start break (used by processBreakStatus)
export const startBreakInternal = internalMutation({
  args: {
    userId: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Get the active work session
    const activeSession = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .first();

    const today = new Date(args.timestamp).toISOString().slice(0, 10);

    // Check if there's already an active break
    const activeBreak = await ctx.db
      .query("breaks")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .first();

    if (activeBreak) {
      // Already have an active break, just update its start time
      await ctx.db.patch(activeBreak._id, {
        startTime: args.timestamp,
      });
      return activeBreak._id;
    }

    // Create new break record
    return await ctx.db.insert("breaks", {
      userId: args.userId,
      startTime: args.timestamp,
      isValidBreak: false,
      workSessionId: activeSession?._id,
      date: today,
    });
  },
});

// Internal function to end break (used by processBreakStatus)
export const endBreakInternal = internalMutation({
  args: {
    userId: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args): Promise<{
    breakId: any;
    duration: number;
    isValidBreak: boolean;
    breakMinutes: number;
  } | null> => {
    // Find the most recent break without end time
    const activeBreak = await ctx.db
      .query("breaks")
      .withIndex("by_user_and_date", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("endTime"), undefined))
      .order("desc")
      .first();

    if (!activeBreak) {
      return null;
    }

    const duration = Math.floor((args.timestamp - activeBreak.startTime) / 1000);
    const isValidBreak = duration >= 60;

    // Update the break record
    await ctx.db.patch(activeBreak._id, {
      endTime: args.timestamp,
      duration,
      isValidBreak,
    });

    // If valid break, update the associated work session
    if (isValidBreak && activeBreak.workSessionId) {
      const session = await ctx.db.get(activeBreak.workSessionId);
      if (session) {
        await ctx.db.patch(session._id, {
          breaksTaken: (session.breaksTaken || 0) + 1,
        });
      }
    }

    return {
      breakId: activeBreak._id,
      duration,
      isValidBreak,
      breakMinutes: Math.round(duration / 60 * 10) / 10
    };
  },
});

// Get today's break statistics
export const getTodayBreakStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const today = new Date().toISOString().slice(0, 10);

    const todayBreaks = await ctx.db
      .query("breaks")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).eq("date", today))
      .collect();

    const validBreaks = todayBreaks.filter(b => b.isValidBreak);
    const totalBreakTime = validBreaks.reduce((sum, b) => sum + (b.duration || 0), 0);
    const averageBreakDuration = validBreaks.length > 0 ? totalBreakTime / validBreaks.length : 0;

    // Check if user is currently on break
    const activeBreak = todayBreaks.find(b => !b.endTime);

    return {
      totalBreaks: validBreaks.length,
      totalBreakMinutes: Math.round(totalBreakTime / 60 * 10) / 10,
      averageBreakMinutes: Math.round(averageBreakDuration / 60 * 10) / 10,
      isOnBreak: !!activeBreak,
      currentBreakStart: activeBreak?.startTime || null,
      currentBreakDuration: activeBreak ? Math.round((Date.now() - activeBreak.startTime) / 1000 / 60 * 10) / 10 : 0,
      lastBreak: validBreaks.length > 0 ? validBreaks[validBreaks.length - 1] : null,
    };
  },
});

// Get break analytics for dashboard
export const getBreakAnalytics = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const days = args.days || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const breaks = await ctx.db
      .query("breaks")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId).gte("date", since))
      .collect();

    // Group by day
    const dailyBreaks = new Map<string, { count: number; totalDuration: number; totalWorkTime: number }>();

    breaks.forEach((breakRecord) => {
      const day = breakRecord.date;
      const current = dailyBreaks.get(day) || { count: 0, totalDuration: 0, totalWorkTime: 0 };

      if (breakRecord.isValidBreak) {
        current.count++;
        current.totalDuration += breakRecord.duration || 0;
      }

      dailyBreaks.set(day, current);
    });

    // Get work sessions for context
    const workSessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("startTime"), Date.now() - days * 24 * 60 * 60 * 1000))
      .collect();

    // Calculate total work time per day
    workSessions.forEach((session) => {
      const day = new Date(session.startTime).toISOString().slice(0, 10);
      const current = dailyBreaks.get(day) || { count: 0, totalDuration: 0, totalWorkTime: 0 };
      current.totalWorkTime += session.duration || 0;
      dailyBreaks.set(day, current);
    });

    const breakTrend = Array.from(dailyBreaks.entries())
      .map(([date, data]) => ({
        date,
        breakCount: data.count,
        breakMinutes: Math.round(data.totalDuration / 60 * 10) / 10,
        workMinutes: Math.round(data.totalWorkTime * 10) / 10,
        breaksPerHour: data.totalWorkTime > 0 ? Math.round((data.count / (data.totalWorkTime / 60)) * 100) / 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalBreaks = breaks.filter(b => b.isValidBreak).length;
    const totalBreakTime = breaks.filter(b => b.isValidBreak).reduce((sum, b) => sum + (b.duration || 0), 0);
    const totalWorkTime = workSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const averageBreaksPerDay = breakTrend.length > 0 ? totalBreaks / breakTrend.length : 0;
    const averageBreakDuration = totalBreaks > 0 ? totalBreakTime / totalBreaks : 0;
    const breaksPerWorkHour = totalWorkTime > 0 ? totalBreaks / (totalWorkTime / 60) : 0;

    return {
      breakTrend,
      totalBreaks,
      totalBreakMinutes: Math.round(totalBreakTime / 60 * 10) / 10,
      averageBreaksPerDay: Math.round(averageBreaksPerDay * 100) / 100,
      averageBreakMinutes: Math.round(averageBreakDuration / 60 * 10) / 10,
      breaksPerWorkHour: Math.round(breaksPerWorkHour * 100) / 100,
    };
  },
});

// Clean up orphaned breaks (breaks that were started but never ended)
export const cleanupOrphanedBreaks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Find breaks that were started more than an hour ago but never ended
    const orphanedBreaks = await ctx.db
      .query("breaks")
      .filter((q) =>
        q.and(
          q.eq(q.field("endTime"), undefined),
          q.lt(q.field("startTime"), oneHourAgo)
        )
      )
      .collect();

    let cleanedCount = 0;

    for (const breakRecord of orphanedBreaks) {
      const duration = Math.floor((now - breakRecord.startTime) / 1000);
      const isValidBreak = duration >= 60;

      await ctx.db.patch(breakRecord._id, {
        endTime: now,
        duration,
        isValidBreak,
      });

      if (isValidBreak && breakRecord.workSessionId) {
        const session = await ctx.db.get(breakRecord.workSessionId);
        if (session) {
          await ctx.db.patch(session._id, {
            breaksTaken: (session.breaksTaken || 0) + 1,
          });
        }
      }

      cleanedCount++;
    }

    return { cleanedCount, totalOrphaned: orphanedBreaks.length };
  },
});