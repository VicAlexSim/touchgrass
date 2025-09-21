import { v } from "convex/values";
import { query, action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

export interface GitHubCommit {
    sha: string;
    commit: {
        message: string;
        author: {
            date: string;
        };
    };
    repository?: {
        name: string;
    };
    stats?: {
        additions: number;
        deletions: number;
        total: number;
    };
    files?: Array<{
        filename: string;
        additions: number;
        deletions: number;
        changes: number;
    }>;
}

// Fetch GitHub commits for a user
export const fetchGitHubCommits = action({
    args: {
        username: v.string(),
        days: v.optional(v.number()), // kept for backwards compatibility but now fetches all commits
    },
    returns: v.object({
        commits: v.array(v.object({
            sha: v.string(),
            message: v.string(),
            timestamp: v.number(),
            repository: v.string(),
            additions: v.optional(v.number()),
            deletions: v.optional(v.number()),
            filesChanged: v.optional(v.number()),
        })),
        totalCommits: v.number(),
    }),
    handler: async (ctx, args): Promise<{ commits: any[], totalCommits: number }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const userId = identity.subject;

        // Note: We now fetch all commits regardless of the days parameter
        const _days = args.days || 30; // kept for backwards compatibility

        try {
            // GitHub API has rate limits, so we'll use a more conservative approach
            // Fetch commits from the last 30 days for the user's repositories
            const commits: any[] = [];

            // First, get user's repositories
            const githubToken = process.env.GITHUB_TOKEN;
            const headers: Record<string, string> = {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'TouchGrass-App',
            };

            if (githubToken) {
                headers['Authorization'] = `Bearer ${githubToken}`;
                console.log("Using GitHub token for authentication");
            } else {
                console.warn("No GitHub token found. API requests will have lower rate limits. Add GITHUB_TOKEN to environment variables.");
            }

            try {
                // Use authenticated endpoint to get both public AND private repos
                const repoQueries = githubToken ? [
                    `https://api.github.com/user/repos?sort=pushed&per_page=50&affiliation=owner`,     // Your own repos (public + private)
                    `https://api.github.com/user/repos?sort=updated&per_page=30&affiliation=owner`,   // Recently updated
                    `https://api.github.com/user/repos?sort=created&per_page=20&affiliation=owner`    // Recently created
                ] : [
                    // Fallback to public-only if no token
                    `https://api.github.com/users/${args.username}/repos?sort=pushed&per_page=30`,  // Most recently pushed
                    `https://api.github.com/users/${args.username}/repos?sort=updated&per_page=30`, // Most recently updated
                    `https://api.github.com/users/${args.username}/repos?sort=created&per_page=20`  // Most recently created
                ];
                
                const allRepos = new Set();
                
                for (const repoQuery of repoQueries) {
                    try {
                        const reposResponse = await fetch(repoQuery, { headers });
                        if (reposResponse.ok) {
                            const repos = await reposResponse.json();
                            repos.forEach((repo: any) => allRepos.add(JSON.stringify(repo)));
                            console.log(`Fetched ${repos.length} repos from: ${repoQuery}`);
                        }
                    } catch (error) {
                        console.warn(`Failed to fetch repos from ${repoQuery}:`, error);
                    }
                }
                
                const userRepos = Array.from(allRepos).map(repoStr => JSON.parse(repoStr as string));
                console.log(`Found ${userRepos.length} unique repositories for ${args.username} across all queries`);
                console.log(`Private repos included: ${githubToken ? 'YES' : 'NO'}`);

                // Get commits from user's repositories, focusing on recently active ones
                console.log('Repository list:', userRepos.map(r => `${r.name} (${r.private ? 'private' : 'public'}, pushed: ${r.pushed_at})`).join(', '));
                
                for (const repo of userRepos) {
                    console.log(`Processing repository: ${repo.name} (last pushed: ${repo.pushed_at})`);
                    try {
                        let page = 1;
                        let hasMoreCommits = true;
                        let repoCommitCount = 0;

              // Fetch commits with pagination - focus on recent commits
              // Get commits from the last 60 days to ensure we capture recent activity
              const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
              
              while (hasMoreCommits && page <= 5) { // Increased to 5 pages to get more recent commits
                                const response = await fetch(
                                    `https://api.github.com/repos/${args.username}/${repo.name}/commits?per_page=100&page=${page}&author=${args.username}&since=${since}`,
                                    { headers }
                                );

                                if (response.ok) {
                                    const repoCommits = await response.json();

                                    if (repoCommits.length === 0) {
                                        hasMoreCommits = false;
                                    } else {
                                        repoCommitCount += repoCommits.length;

                                        for (const commit of repoCommits) {
                                            if (commit.commit.author && commit.commit.author.date) {
                                                const commitData: any = {
                                                    sha: commit.sha,
                                                    message: commit.commit.message,
                                                    timestamp: new Date(commit.commit.author.date).getTime(),
                                                    repository: repo.name,
                                                };

                                                // Only include optional fields if they have actual values
                                                if (commit.stats?.additions !== undefined) {
                                                    commitData.additions = commit.stats.additions;
                                                }
                                                if (commit.stats?.deletions !== undefined) {
                                                    commitData.deletions = commit.stats.deletions;
                                                }
                                                if (commit.files?.length !== undefined) {
                                                    commitData.filesChanged = commit.files.length;
                                                }

                                                commits.push(commitData);
                                            }
                                        }
                                        page++;
                                    }
                                } else {
                                    console.warn(`Failed to fetch commits for ${repo.name} (page ${page}): ${response.status}`);
                                    hasMoreCommits = false;
                                }
                            }

                            console.log(`Found ${repoCommitCount} total commits in ${repo.name}`);
                        } catch (error) {
                            console.warn(`Error fetching commits for ${repo.name}:`, error);
                        }
                    }
            } catch (error) {
                console.error("Error fetching user repositories:", error);
            }

      // Sort all commits by timestamp (newest first) - this gives us commits by updated date
      commits.sort((a, b) => b.timestamp - a.timestamp);
      
      // Limit total commits to prevent database overload (keep most recent)
      const maxCommits = 2000; // Increased limit to capture more recent activity
      if (commits.length > maxCommits) {
        const originalLength = commits.length;
        commits.splice(maxCommits); // Remove excess commits
        console.log(`Limited to ${maxCommits} most recent commits out of ${originalLength} total`);
      }
      
      console.log(`Total commits fetched: ${commits.length}`);
      if (commits.length > 0) {
        const oldestCommit = new Date(Math.min(...commits.map(c => c.timestamp)));
        const newestCommit = new Date(Math.max(...commits.map(c => c.timestamp)));
        console.log(`Date range: ${oldestCommit.toISOString().split('T')[0]} to ${newestCommit.toISOString().split('T')[0]}`);
      }

            // Store commits in database using mutation
            if (commits.length > 0) {
                await ctx.runMutation(internal.github.storeCommits, {
                    userId,
                    username: args.username,
                    commits,
                });
            }

            return {
                commits,
                totalCommits: commits.length,
            };
        } catch (error) {
            console.error("Error fetching GitHub commits:", error);
            throw new Error("Failed to fetch GitHub commits");
        }
    },
});

// Internal mutation to store commits
export const storeCommits = internalMutation({
    args: {
        userId: v.string(),
        username: v.string(),
        commits: v.array(v.object({
            sha: v.string(),
            message: v.string(),
            timestamp: v.number(),
            repository: v.string(),
            additions: v.optional(v.number()),
            deletions: v.optional(v.number()),
            filesChanged: v.optional(v.number()),
        })),
    },
  handler: async (ctx, args) => {
    // First, get all existing commit SHAs for this user to avoid duplicates
    const existingCommits = await ctx.db
      .query("githubCommits")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .collect();

    const existingSHAs = new Set(existingCommits.map(commit => commit.sha));
    
    // Filter out commits that already exist
    const newCommits = args.commits.filter(commit => !existingSHAs.has(commit.sha));
    
    console.log(`Filtering ${args.commits.length} commits: ${existingCommits.length} existing, ${newCommits.length} new`);

    // Insert only new commits
    for (const commit of newCommits) {
      await ctx.db.insert("githubCommits", {
        userId: args.userId,
        username: args.username,
        ...commit,
      });
    }
  },
});

// Get commit analytics for dashboard
export const getGitHubCommitAnalytics = query({
    args: {
        days: v.optional(v.number()),
    },
    returns: v.object({
        weeklyPattern: v.record(v.string(), v.number()), // day of week -> commit count
        hourlyPattern: v.record(v.string(), v.number()), // hour of day -> commit count
        lateNightCommits: v.number(), // commits between 10 PM and 6 AM
        weekendCommits: v.number(), // commits on Saturday/Sunday
        totalCommits: v.number(),
        averageCommitsPerDay: v.number(),
        recentCommitTrend: v.array(v.object({
            date: v.string(),
            commits: v.number(),
        })),
    }),
    handler: async (ctx, args): Promise<{
        weeklyPattern: Record<string, number>;
        hourlyPattern: Record<string, number>;
        lateNightCommits: number;
        weekendCommits: number;
        totalCommits: number;
        averageCommitsPerDay: number;
        recentCommitTrend: Array<{ date: string; commits: number }>;
    }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const userId = identity.subject;

        const days = args.days || 365; // Increased to 1 year to capture more historical data
        const since = Date.now() - days * 24 * 60 * 60 * 1000;

        // Get ALL commits for the user first
        const allCommits = await ctx.db
            .query("githubCommits")
            .withIndex("by_user_and_time", (q) =>
                q.eq("userId", userId)
            )
            .collect();

        console.log(`Found ${allCommits.length} total commits in database for userId: ${userId}`);

        // Debug: Show data summary
        if (allCommits.length > 0) {
          const sortedCommits = [...allCommits].sort((a, b) => b.timestamp - a.timestamp);
          const mostRecent = new Date(sortedCommits[0].timestamp);
          const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
          const recentCommits = allCommits.filter(commit => commit.timestamp >= thirtyDaysAgo);

          console.log(`Most recent commit: ${mostRecent.toISOString()} (${mostRecent.toLocaleDateString()})`);
          console.log(`Commits in last 30 days: ${recentCommits.length}`);
        }

        // Filter by time range for analytics (but keep more data for better patterns)
        const commits = allCommits.filter(commit => commit.timestamp >= since);
        
        console.log(`Using ${commits.length} commits from last ${days} days for analytics`);

        // Initialize patterns
        const weeklyPattern: Record<string, number> = {
            'Sunday': 0, 'Monday': 0, 'Tuesday': 0, 'Wednesday': 0,
            'Thursday': 0, 'Friday': 0, 'Saturday': 0
        };

        const hourlyPattern: Record<string, number> = {};
        for (let i = 0; i < 24; i++) {
            hourlyPattern[i.toString()] = 0;
        }

        let lateNightCommits = 0;
        let weekendCommits = 0;

        // Process commits
        for (const commit of commits) {
            const date = new Date(commit.timestamp);
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
            const hour = date.getHours();
            const day = date.getDay(); // 0 = Sunday, 6 = Saturday

            weeklyPattern[dayOfWeek]++;
            hourlyPattern[hour.toString()]++;

            // Late night: 10 PM to 6 AM
            if (hour >= 22 || hour <= 6) {
                lateNightCommits++;
            }

            // Weekend: Saturday (6) or Sunday (0)
            if (day === 0 || day === 6) {
                weekendCommits++;
            }
        }

        // Calculate recent trend (last 30 days)
        const recentCommitTrend: Array<{ date: string; commits: number }> = [];
        const now = Date.now();
        
        console.log('Calculating recent trend for last 30 days...');
        console.log('Total commits available for trend calculation:', commits.length);

        for (let i = 29; i >= 0; i--) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];

            const dayCommits = commits.filter(commit => {
                const commitDate = new Date(commit.timestamp).toISOString().split('T')[0];
                return commitDate === dateStr;
            });

            if (dayCommits.length > 0) {
                console.log(`Found ${dayCommits.length} commits on ${dateStr}`);
            }

            recentCommitTrend.push({
                date: dateStr,
                commits: dayCommits.length,
            });
        }
        
        const totalRecentCommits = recentCommitTrend.reduce((sum, day) => sum + day.commits, 0);
        console.log(`Recent trend: ${totalRecentCommits} total commits across 30 days`);

        const result = {
            weeklyPattern,
            hourlyPattern,
            lateNightCommits,
            weekendCommits,
            totalCommits: commits.length,
            averageCommitsPerDay: commits.length / days,
            recentCommitTrend,
        };

        console.log('Analytics result:', {
            totalCommits: result.totalCommits,
            lateNightCommits: result.lateNightCommits,
            weekendCommits: result.weekendCommits,
            averageCommitsPerDay: result.averageCommitsPerDay
        });

        return result;
    },
});

// Calculate commit patterns risk score
export const calculateCommitPatternsRisk = query({
    args: {
        days: v.optional(v.number()),
    },
    returns: v.number(), // 0-100 risk score
    handler: async (ctx, args): Promise<number> => {
        const analytics = await ctx.runQuery(api.github.getGitHubCommitAnalytics, args);

        let riskScore = 0;

        // Late night commits (10 PM - 6 AM) are concerning
        const lateNightRatio = analytics.lateNightCommits / Math.max(analytics.totalCommits, 1);
        riskScore += lateNightRatio * 40; // Max 40 points for late night work

        // Weekend commits indicate work-life imbalance
        const weekendRatio = analytics.weekendCommits / Math.max(analytics.totalCommits, 1);
        riskScore += weekendRatio * 30; // Max 30 points for weekend work

        // Very low or very high commit frequency can be concerning
        const avgCommits = analytics.averageCommitsPerDay;
        if (avgCommits < 0.5) {
            riskScore += 10; // Low activity might indicate disengagement
        } else if (avgCommits > 10) {
            riskScore += 20; // Very high activity might indicate overwork
        }

        // Check for burnout patterns in recent trend
        const recentTrend = analytics.recentCommitTrend;
        const recentCommits = recentTrend.slice(-3); // Last 3 days
        const avgRecent = recentCommits.reduce((sum: number, day: any) => sum + day.commits, 0) / 3;

        if (avgRecent > analytics.averageCommitsPerDay * 1.5) {
            riskScore += 15; // Recent spike might indicate crunch time
        }

        return Math.min(100, Math.max(0, riskScore));
    },
});
