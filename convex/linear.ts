import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";

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

// Fetch velocity data from Linear API
export const syncLinearData = action({
  args: {
    projectId: v.string(),
  },
  handler: async (ctx, args): Promise<{ synced: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    // Get project credentials
    const project: any = await ctx.runQuery(internal.linear.getProjectCredentials, {
      userId,
      projectId: args.projectId,
    });

    if (!project) throw new Error("Project not found");

    // Fetch completed issues from Linear API
    const response: Response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${project.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query GetCompletedIssues($teamId: String!, $after: DateTime) {
            team(id: $teamId) {
              issues(
                filter: { 
                  state: { type: { eq: "completed" } }
                  completedAt: { gte: $after }
                }
                first: 100
              ) {
                nodes {
                  id
                  title
                  estimate
                  completedAt
                  cycle {
                    id
                    name
                  }
                }
              }
            }
          }
        `,
        variables: {
          teamId: project.teamId,
          after: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
        },
      }),
    });

    const data: any = await response.json();
    
    if (data.errors) {
      throw new Error(`Linear API error: ${data.errors[0].message}`);
    }

    // Store story points data
    const issues: any[] = data.data.team.issues.nodes;
    for (const issue of issues) {
      if (issue.estimate && issue.completedAt) {
        await ctx.runMutation(internal.linear.storeStoryPoints, {
          userId,
          projectId: args.projectId,
          issueId: issue.id,
          points: issue.estimate,
          completedAt: new Date(issue.completedAt).getTime(),
          cycleId: issue.cycle?.id,
        });
      }
    }

    return { synced: issues.length };
  },
});

// Internal functions
import { internal } from "./_generated/api";
import { internalQuery, internalMutation } from "./_generated/server";

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
    completedAt: v.number(),
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
      .filter((q) => q.gte(q.field("completedAt"), since))
      .collect();

    // Group by week
    const weeklyVelocity = new Map<string, number>();
    
    storyPoints.forEach(sp => {
      const week = new Date(sp.completedAt).toISOString().slice(0, 10); // YYYY-MM-DD
      weeklyVelocity.set(week, (weeklyVelocity.get(week) || 0) + sp.points);
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
