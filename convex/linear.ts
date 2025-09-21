import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
// Internal functions
import { internalQuery, internalMutation } from "./_generated/server";

// Store Linear project connection
export const connectLinearProject = mutation({
  args: {
    projectId: v.string(),
    projectName: v.string(),
    teamId: v.string(),
    teamName: v.string(),
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    // Check if project already exists
    const existing = await ctx.db
      .query("linearProjects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("projectId"), args.projectId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        projectName: args.projectName,
        teamName: args.teamName,
      });
      return existing._id;
    }

    return await ctx.db.insert("linearProjects", {
      userId,
      ...args,
    });
  },
});

export const getProjectCredentials = internalQuery({
  args: {
    userId: v.string(),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("linearProjects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("projectId"), args.projectId))
      .first();
  },
});

export const storeStoryPoints = internalMutation({
  args: {
    userId: v.string(),
    projectId: v.string(),
    issueId: v.string(),
    points: v.number(),
    completedAt: v.optional(v.number()), // undefined for active issues
    cycleId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("storyPoints")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("issueId"), args.issueId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("storyPoints", args);
  },
});

// Get velocity metrics
export const getVelocityMetrics = query({
  args: {
    days: v.optional(v.number()),
  },
  returns: v.union(
    v.null(),
    v.object({
      velocityData: v.array(v.object({
        date: v.string(),
        points: v.number(),
      })),
      totalPoints: v.number(),
      averageVelocity: v.number(),
      currentTrend: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const days = args.days || 30;
    const since = Date.now() - (days * 24 * 60 * 60 * 1000);

    const storyPoints = await ctx.db
      .query("storyPoints")
      .withIndex("by_user_and_date", (q) => 
        q.eq("userId", userId)
      )
      .filter((q) => 
        q.and(
          q.neq(q.field("completedAt"), undefined), // Only completed issues
          q.gte(q.field("completedAt"), since)  // Within date range
        )
      )
      .collect();

    // Group by week
    const weeklyVelocity = new Map<string, number>();
    
    storyPoints.forEach(sp => {
      // completedAt should not be null here due to our filter, but add safety check
      if (sp.completedAt) {
        const week = new Date(sp.completedAt).toISOString().slice(0, 10); // YYYY-MM-DD
        weeklyVelocity.set(week, (weeklyVelocity.get(week) || 0) + sp.points);
      }
    });

    const velocityData = Array.from(weeklyVelocity.entries())
      .map(([date, points]) => ({ date, points }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalPoints = storyPoints.reduce((sum, sp) => sum + sp.points, 0);
    const averageVelocity = velocityData.length > 0 
      ? totalPoints / velocityData.length 
      : 0;

    return {
      velocityData,
      totalPoints,
      averageVelocity,
      currentTrend: velocityData.length >= 2 
        ? velocityData[velocityData.length - 1].points - velocityData[velocityData.length - 2].points
        : 0,
    };
  },
});

// Get user's connected Linear projects
export const getConnectedProjects = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("linearProjects"),
    projectId: v.string(),
    projectName: v.string(),
    teamId: v.string(),
    teamName: v.string(),
  })),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    const projects = await ctx.db
      .query("linearProjects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return projects.map(p => ({
      _id: p._id,
      projectId: p.projectId,
      projectName: p.projectName,
      teamId: p.teamId,
      teamName: p.teamName,
    }));
  },
});
