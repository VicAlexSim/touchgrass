import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { TwelveLabs } from "twelvelabs-js";

const client = new TwelveLabs({
  apiKey: process.env.TL_API_KEY,
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Update break status from face-api.js detection
export const updateBreakStatus = mutation({
  args: {
    isAtDesk: v.boolean(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    // Store mood data first
    await ctx.db.insert("moodData", {
      userId,
      timestamp: args.timestamp,
      isAtDesk: args.isAtDesk,
      isPresent: args.isAtDesk, // For backwards compatibility
      mood: undefined, // Face-api.js doesn't provide mood in this context
    });

    // Process break tracking
    await ctx.runMutation(internal.breaks.processBreakStatus, {
      userId,
      isAtDesk: args.isAtDesk,
      timestamp: args.timestamp,
    });
  },
});

// Process chunk of webcam video
export const processChunk = action({
  args: { videoStorageId: v.id("_storage") },
  handler: async (ctx, args) => {
    // const index = await client.indexes.create({
    //   indexName: "test",
    //   models: [
    //     {
    //       modelName: "pegasus1.2",
    //       modelOptions: ["visual"],
    //     },
    //   ],
    // });
    // console.log(`Created index: id=${index.id}`);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    const videoUrl = await ctx.storage.getUrl(args.videoStorageId);
    console.log(`Video URL: ${videoUrl}`);

    if (!videoUrl) {
      throw new Error("Video URL is null");
    }

    const createTaskResponse = await client.tasks.create({
      indexId: "68cf5bc93f033d1477504725",
      videoUrl,
      // enableVideoStream: true,
    });
    console.log(`Created task: id=${createTaskResponse.id}`);

    if (!createTaskResponse.id) {
      throw new Error("Failed to create task - no ID returned");
    }
    const task = await client.tasks.waitForDone(createTaskResponse.id);
    if (task.status !== "ready") {
      throw new Error(`Indexing failed with status ${task.status}`);
    }
    console.log(
      `Upload complete. The unique identifier of your video is ${task.videoId}`
    );

    if (!task.videoId) {
      throw new Error("No video ID returned from task");
    }

    const text = await client.analyze({
      videoId: task.videoId,
      prompt:
        "This is a webcam clip from a software engineer's laptop. If they are at their desk at any moment during the clip, set isAtDesk to true, otherwise set it to false. If they are at their desk, rate their perceived mood on a scale of -3 to 3. -3 is extremely stressed or sad, 0 is neutral, and 3 is extremely happy or relaxed.",
      maxTokens: 2048,
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          type: "object",
          required: ["isAtDesk"],
          properties: {
            isAtDesk: {
              type: "boolean",
            },
            mood: {
              type: "number",
            },
          },
        },
      },
    });
    console.log(`${JSON.stringify(text, null, 2)}`);
    console.log(`Finish reason: ${text.finishReason}`);

    if (!text.data) {
      throw new Error("No data returned from analysis");
    }
    const dataJson = JSON.parse(text.data);

    await ctx.runMutation(internal.webcam.storeMoodData, {
      userId: userId,
      timestamp: Date.now(),
      isAtDesk: dataJson.isAtDesk!,
      isPresent: dataJson.isAtDesk!, // For backwards compatibility
      mood: dataJson.mood || undefined,
    });

    return "success";
  },
});

export const storeMoodData = internalMutation({
  args: {
    userId: v.string(),
    timestamp: v.number(),
    // Face-api.js fields
    isAtDesk: v.optional(v.boolean()),
    mood: v.optional(v.union(v.number(), v.string())),
    // TwelveLabs fields
    isPresent: v.optional(v.boolean()),
    moodScore: v.optional(v.number()),
    confidence: v.optional(v.number()),
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
            q
              .eq("userId", args.userId)
              .gte("timestamp", activeSession.startTime)
          )
          .filter((q) => q.gte(q.field("timestamp"), activeSession.startTime))
          .collect();

        // Helper function to normalize mood to numeric value
        const normalizeMood = (
          moodValue: number | string | undefined
        ): number => {
          if (typeof moodValue === "number") return moodValue;
          if (typeof moodValue === "string") {
            // Map string moods to numeric scale -3 to 3
            const moodMap: Record<string, number> = {
              "very happy": 3,
              happy: 2,
              content: 1,
              satisfied: 1,
              neutral: 0,
              calm: 0,
              tired: -1,
              stressed: -2,
              frustrated: -2,
              sad: -3,
              angry: -3,
            };
            return moodMap[moodValue.toLowerCase()] || 0;
          }
          return 0;
        };

        const avgMood =
          sessionMoods.length > 0
            ? sessionMoods.reduce((sum, m) => sum + normalizeMood(m.mood), 0) /
              sessionMoods.length
            : args.moodScore;

        await ctx.db.patch(activeSession._id, {
          averageMood: avgMood,
        });
      }
    } else {
      if (activeSession) {
        // End current session
        const duration = Math.floor(
          (now - activeSession.startTime) / (60 * 1000)
        ); // minutes
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
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const moodData = await ctx.db
      .query("moodData")
      .withIndex("by_user_and_time", (q) =>
        q.eq("userId", userId).gte("timestamp", since)
      )
      .filter((q) => q.gte(q.field("timestamp"), since))
      .collect();

    // Group by day
    const dailyMood = new Map<string, { total: number; count: number }>();

    // Helper function to normalize mood to numeric value
    const normalizeMood = (moodValue: number | string | undefined): number => {
      if (typeof moodValue === "number") return moodValue;
      if (typeof moodValue === "string") {
        // Map string moods to numeric scale -3 to 3
        const moodMap: Record<string, number> = {
          "very happy": 3,
          happy: 2,
          content: 1,
          satisfied: 1,
          neutral: 0,
          calm: 0,
          tired: -1,
          stressed: -2,
          frustrated: -2,
          sad: -3,
          angry: -3,
        };
        return moodMap[moodValue.toLowerCase()] || 0;
      }
      return 0;
    };

    moodData.forEach((mood) => {
      const day = new Date(mood.timestamp).toISOString().slice(0, 10);
      const current = dailyMood.get(day) || { total: 0, count: 0 };
      const moodValue = normalizeMood(mood.mood);
      dailyMood.set(day, {
        total: current.total + moodValue,
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
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).gte("startTime", since)
      )
      .filter((q) => q.gte(q.field("startTime"), since))
      .collect();

    // Group by day
    const dailyHours = new Map<string, number>();

    sessions.forEach((session) => {
      const day = new Date(session.startTime).toISOString().slice(0, 10);
      const hours = session.duration ? session.duration / 60 : 0;
      dailyHours.set(day, (dailyHours.get(day) || 0) + hours);
    });

    const workHoursTrend = Array.from(dailyHours.entries())
      .map(([date, hours]) => ({ date, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalHours = Array.from(dailyHours.values()).reduce(
      (sum, h) => sum + h,
      0
    );
    const averageHours =
      workHoursTrend.length > 0 ? totalHours / workHoursTrend.length : 0;

    return {
      workHoursTrend,
      totalHours: Math.round(totalHours * 10) / 10,
      averageHours: Math.round(averageHours * 10) / 10,
      activeSessions: sessions.filter((s) => !s.endTime).length,
    };
  },
});
