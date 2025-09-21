import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { TwelveLabs } from "twelvelabs-js";

const client = new TwelveLabs({
  apiKey: "tlk_3Z8XC5Y14KJJ9X25XM4EJ01GEVZ1",
});

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
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

    const videoUrl = await ctx.storage.getUrl(args.videoStorageId);
    console.log(`Video URL: ${videoUrl}`);

    if (!videoUrl) {
      throw new Error("Video URL is null");
    }

    const createTaskResponse = await client.tasks.create({
      indexId: "68cf5bc93f033d1477504725",
      videoUrl: videoUrl,
      // enableVideoStream: true,
    });
    console.log(`Created task: id=${createTaskResponse.id}`);

    const task = await client.tasks.waitForDone(createTaskResponse.id!);
    if (task.status !== "ready") {
      throw new Error(`Indexing failed with status ${task.status}`);
    }
    console.log(
      `Upload complete. The unique identifier of your video is ${task.videoId}`
    );

    const text = await client.analyze({
      videoId: task.videoId!,
      prompt:
        "This is a webcam clip from a software engineer's laptop. If they are at their desk at any moment during the clip, set isAtDesk to true, otherwise set it to false. If they are at their desk, rate their perceived mood on a scale of -3 to 3. -3 is extremely stressed or sad, 0 is neutral, and 3 is extremely happy or relaxed.",
      maxTokens: 2048,
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          type: "object",
          properties: {
            isAtDesk: {
              type: "boolean",
              required: true,
            },
            mood: {
              type: "number",
              required: false,
            },
          },
        },
      },
    });
    console.log(`${JSON.stringify(text, null, 2)}`);
    console.log(`Finish reason: ${text.finishReason}`);
    return "success";
  },
});

export const storeMoodData = internalMutation({
  args: {
    userId: v.id("users"),
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
    userId: v.id("users"),
    isPresent: v.boolean(),
    moodScore: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

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
          .collect();

        const avgMood =
          sessionMoods.length > 0
            ? sessionMoods.reduce((sum, m) => sum + m.moodScore, 0) /
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const days = args.days || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const moodData = await ctx.db
      .query("moodData")
      .withIndex("by_user_and_time", (q) =>
        q.eq("userId", userId).gte("timestamp", since)
      )
      .collect();

    // Group by day
    const dailyMood = new Map<string, { total: number; count: number }>();

    moodData.forEach((mood) => {
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
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const days = args.days || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;

    const sessions = await ctx.db
      .query("workSessions")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", userId).gte("startTime", since)
      )
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

// Generate a short-lived upload URL for webcam clips
export const generateClipUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

// Process an uploaded webcam clip on the server (call external APIs here)
export const processUploadedClip = action({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) throw new Error("Uploaded clip not found");

    // TODO: Integrate Twelve Labs here using a server-side API key.
    // Example (pseudo):
    // const client = new TwelveLabs({ apiKey: process.env.TWELVE_LABS_API_KEY! });
    // await client.tasks.create({ indexId: userId, videoFile: blob });

    console.log("Received webcam clip for user:", userId, "size:", blob.size);
    return null;
  },
});
