"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { LinearClient } from "@linear/sdk";
import { internal } from "./_generated/api";

// Fetch velocity data from Linear API using SDK
export const syncLinearData = action({
  args: {
    projectId: v.string(),
  },
  returns: v.object({
    synced: v.number(),
  }),
  handler: async (ctx, args): Promise<{ synced: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const userId = identity.subject;

    // Get project credentials
    const project: any = await ctx.runQuery(internal.linear.getProjectCredentials, {
      userId,
      projectId: args.projectId,
    });

    console.log("Project:", project);

    if (!project) throw new Error("Project not found");

    try {
      
      // Create Linear client with access token
      const linearClient = new LinearClient({
        apiKey: project.accessToken
      });

      console.log(`Syncing Linear data for team: ${project.teamName} (${project.teamId})`);

      // Get the current user to filter by assignee
      const currentUser = await linearClient.viewer;
      console.log(`Syncing for user: ${currentUser.displayName} (${currentUser.id})`);

      // Get the team
      const team = await linearClient.team(project.teamId);
      if (!team) {
        throw new Error(`Team not found: ${project.teamId}`);
      }

      // Get issues assigned to the current user with story points
      const issues = await team.issues({
        filter: {
          assignee: { id: { eq: currentUser.id } },
          estimate: { null: false } // Only issues with story points
        },
        first: 100
      });

      console.log(`Found ${issues.nodes.length} issues assigned to you with story points`);

      // Store story points data
      let syncedCount = 0;
      let skippedCount = 0;
      
      for (const issue of issues.nodes) {
        const completedDate = issue.completedAt ? new Date(issue.completedAt).toISOString() : 'Not completed';
        console.log(`Processing issue: ${issue.title} (${issue.identifier}) - Points: ${issue.estimate}, Completed: ${completedDate}`);
        
        if (issue.estimate) {
          // Get cycle ID if exists
          let cycleId: string | undefined;
          if (issue.cycle) {
            const cycle = await issue.cycle;
            cycleId = cycle?.id;
          }

          // Only store completedAt for actually completed issues
          // Active issues will have undefined completedAt and won't count in velocity
          const completedAt = issue.completedAt 
            ? new Date(issue.completedAt).getTime()
            : undefined;

          await ctx.runMutation(internal.linear.storeStoryPoints, {
            userId,
            projectId: args.projectId,
            issueId: issue.id,
            points: issue.estimate,
            completedAt,
            cycleId,
          });
          syncedCount++;
          console.log(`✓ Synced: ${issue.identifier} - ${issue.estimate} points`);
        } else {
          skippedCount++;
          console.log(`✗ Skipped: ${issue.identifier} - No story points`);
        }
      }

      console.log(`Successfully synced ${syncedCount} issues with story points, skipped ${skippedCount} without points`);
      return { synced: syncedCount };

    } catch (error) {
      console.error("Linear sync error:", error);
      throw new Error(`Failed to sync Linear data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Get user's teams and projects to help with setup
export const getLinearTeams = action({
  args: {
    accessToken: v.string(),
  },
  returns: v.object({
    viewer: v.object({
      id: v.string(),
      name: v.string(),
      displayName: v.string(),
      email: v.string(),
    }),
    teams: v.array(v.object({
      id: v.string(),
      name: v.string(),
      key: v.string(),
      projects: v.array(v.object({
        id: v.string(),
        name: v.string(),
        description: v.optional(v.string()),
        state: v.string(),
      }))
    }))
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    try {
      // Create Linear client with access token
      const linearClient = new LinearClient({
        apiKey: args.accessToken
      });

      console.log("Fetching Linear teams and projects...");

      // Get user's teams
      const viewer = await linearClient.viewer;
      const teams = await viewer.teams();
      
      console.log(`Found ${teams.nodes.length} teams`);

      // Get projects for each team (first 10 teams to avoid rate limiting)
      const teamsWithProjects = [];
      for (const team of teams.nodes.slice(0, 10)) {
        try {
          const projects = await team.projects({ first: 20 });
          
          teamsWithProjects.push({
            id: team.id,
            name: team.name,
            key: team.key,
            projects: projects.nodes.map(project => ({
              id: project.id,
              name: project.name,
              description: project.description,
              state: project.state,
            }))
          });
        } catch (error) {
          console.warn(`Error fetching projects for team ${team.name}:`, error);
          // Include team without projects if projects fetch fails
          teamsWithProjects.push({
            id: team.id,
            name: team.name,
            key: team.key,
            projects: []
          });
        }
      }

      console.log(`Successfully fetched ${teamsWithProjects.length} teams with projects`);
      
      return {
        viewer: {
          id: viewer.id,
          name: viewer.name,
          displayName: viewer.displayName,
          email: viewer.email,
        },
        teams: teamsWithProjects
      };

    } catch (error) {
      console.error("Error fetching Linear teams:", error);
      throw new Error(`Failed to fetch Linear teams: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});
