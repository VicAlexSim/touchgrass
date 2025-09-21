import { v } from "convex/values";
import { query, action, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

export interface WakatimeHeartbeat {
    id: string;
    branch: string;
    category: string;
    created_at: string;
    editor: string;
    entity: string;
    type: string;
    is_write: boolean;
    language: string;
    machine: string;
    os: string;
    project: string;
    time: number;
    user_id: string;
}

export interface WakatimeSummary {
    start?: string;
    end?: string;
    range?: {
        date: string;
        start: string;
        end: string;
        text: string;
        timezone: string;
    };
    grand_total: {
        decimal: string;
        digital: string;
        hours: number;
        minutes: number;
        seconds?: number;
        text: string;
        total_seconds: number;
    };
    categories: Array<{
        name: string;
        digital: string;
        hours: number;
        minutes: number;
        seconds: number;
        text: string;
        total_seconds: number;
    }>;
    languages: Array<{
        name: string;
        digital: string;
        hours: number;
        minutes: number;
        seconds: number;
        text: string;
        total_seconds: number;
        percent: number;
    }>;
    projects: Array<{
        name: string;
        digital: string;
        hours: number;
        minutes: number;
        seconds: string;
        text: string;
        total_seconds: number;
        percent: number;
    }>;
}

// Fetch Wakatime data using custom API endpoint
export const fetchWakatimeData = action({
    args: {
        apiKey: v.string(),
        range: v.optional(v.string()), // "today", "last_7_days", "last_30_days", "all_time"
        endpoint: v.optional(v.string()), // custom endpoint URL
    },
    returns: v.object({
        codingTime: v.number(),
        projectBreakdown: v.array(v.object({
            name: v.string(),
            time: v.number(),
            percentage: v.number(),
        })),
        languageBreakdown: v.array(v.object({
            name: v.string(),
            time: v.number(),
            percentage: v.number(),
        })),
        dailyCodingHours: v.array(v.object({
            date: v.string(),
            hours: v.number(),
            languages: v.optional(v.array(v.object({
                name: v.string(),
                time: v.number(),
                percentage: v.number(),
            }))),
            projects: v.optional(v.array(v.object({
                name: v.string(),
                time: v.number(),
                percentage: v.number(),
            }))),
        })),
        lastUpdated: v.number(),
    }),
    handler: async (ctx, args): Promise<{
        codingTime: number;
        projectBreakdown: Array<{ name: string; time: number; percentage: number }>;
        languageBreakdown: Array<{ name: string; time: number; percentage: number }>;
        dailyCodingHours: Array<{ date: string; hours: number }>;
        lastUpdated: number;
    }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const userId = identity.subject;

        const range = args.range || "last_7_days";
        const endpoint = args.endpoint || "https://wakatime.com/api/v1";

        try {
            // Get user's coding summary
            const summaryResponse = await fetch(`${endpoint}/users/current/summaries?range=${range}`, {
                headers: {
                    'Authorization': `Basic ${btoa(args.apiKey)}`,
                    'Accept': 'application/json',
                    'User-Agent': 'TouchGrass-App',
                },
            });


            if (!summaryResponse.ok) {
                throw new Error(`Wakatime API error: ${summaryResponse.status} ${summaryResponse.statusText}`);
            }

            const summaryData = await summaryResponse.json() as { data: WakatimeSummary[] };
            
            if (!summaryData.data || summaryData.data.length === 0) {
                throw new Error("No Wakatime data available for the selected range");
            }
            
            const summary = summaryData.data[0];

            // For daily breakdown, use the summaries endpoint with a different range to get daily data
            let dailyCodingHours: Array<{ date: string; hours: number }> = [];

            try {
                const dailySummariesResponse = await fetch(`${endpoint}/users/current/summaries?range=last_7_days`, {
                    headers: {
                        'Authorization': `Basic ${btoa(args.apiKey)}`,
                        'Accept': 'application/json',
                        'User-Agent': 'TouchGrass-App',
                    },
                });

                if (dailySummariesResponse.ok) {
                    const dailySummariesData = await dailySummariesResponse.json() as { data: WakatimeSummary[] };
                    console.log('Daily summaries data:', JSON.stringify(dailySummariesData, null, 2));
                    
                    // Process each day's summary with detailed breakdown
                    dailyCodingHours = dailySummariesData.data.map(dailySummary => {
                        // Extract date from range.start (the actual day start) rather than range.date
                        let dateStr = '';
                        if (dailySummary.range?.start) {
                            // Extract just the date part from the start timestamp
                            dateStr = dailySummary.range.start.split('T')[0];
                        } else if (dailySummary.range?.end) {
                            dateStr = dailySummary.range.end.split('T')[0];
                        } else if (dailySummary.range?.date) {
                            dateStr = dailySummary.range.date.split('T')[0];
                        } else if (dailySummary.start) {
                            dateStr = dailySummary.start.split('T')[0];
                        } else {
                            // Fallback to current date if no date found
                            dateStr = new Date().toISOString().split('T')[0];
                        }
                        
                        const totalSeconds = dailySummary.grand_total?.total_seconds || 0;
                        console.log(`Processing day: ${dateStr} - ${totalSeconds} seconds (${(totalSeconds/3600).toFixed(2)} hours)`);
                        
                        // Extract daily language breakdown
                        const dailyLanguages = (dailySummary.languages || []).map(lang => ({
                            name: lang.name,
                            time: lang.total_seconds,
                            percentage: lang.percent,
                        }));
                        
                        // Extract daily project breakdown  
                        const dailyProjects = (dailySummary.projects || []).map(project => ({
                            name: project.name,
                            time: project.total_seconds,
                            percentage: project.percent,
                        }));
                        
                        return {
                            date: dateStr,
                            hours: totalSeconds / 3600, // Convert seconds to hours
                            languages: dailyLanguages,
                            projects: dailyProjects,
                        };
                    }) // Keep all days to show connection is working, even with 0 hours
                    .sort((a, b) => a.date.localeCompare(b.date));
                }
            } catch (dailyError) {
                console.warn('Failed to fetch daily summaries, using single summary:', dailyError);
                // Fallback: create a single day entry from the main summary
                if (summary.grand_total.total_seconds > 0) {
                    let fallbackDate = new Date().toISOString().split('T')[0]; // Default to today
                    
                    // Try to get date from summary
                    if (summary.range?.date) {
                        fallbackDate = summary.range.date.split('T')[0];
                    } else if (summary.range?.start) {
                        fallbackDate = summary.range.start.split('T')[0];
                    } else if (summary.start) {
                        fallbackDate = summary.start.split('T')[0];
                    }
                    
                    dailyCodingHours = [{
                        date: fallbackDate,
                        hours: summary.grand_total.total_seconds / 3600
                    }];
                }
            }

            // Process project breakdown
            const projectBreakdown = (summary.projects || []).map(project => ({
                name: project.name,
                time: project.total_seconds,
                percentage: project.percent,
            }));

            // Process language breakdown
            const languageBreakdown = (summary.languages || []).map(language => ({
                name: language.name,
                time: language.total_seconds,
                percentage: language.percent,
            }));

            const result = {
                codingTime: summary.grand_total.total_seconds,
                projectBreakdown,
                languageBreakdown,
                dailyCodingHours,
                lastUpdated: Date.now(),
            };

            console.log('Wakatime data processed:', {
                codingTime: result.codingTime,
                codingTimeFormatted: `${Math.floor(result.codingTime / 3600)}h ${Math.floor((result.codingTime % 3600) / 60)}m`,
                projectsCount: result.projectBreakdown.length,
                languagesCount: result.languageBreakdown.length,
                dailyDataPoints: result.dailyCodingHours.length,
                hasData: result.codingTime > 0,
                dailyBreakdown: result.dailyCodingHours.map(day => ({
                    date: day.date,
                    hours: Math.round(day.hours * 10) / 10
                }))
            });

            // Log if no data found
            if (result.codingTime === 0) {
                console.warn('No coding time data found. This could mean:');
                console.warn('1. The Wakatime account has no activity for the selected range');
                console.warn('2. Wakatime tracking is not properly set up');
                console.warn('3. The API key may not have access to the data');
            }

            // Store the data
            await ctx.runMutation(internal.wakatime.storeWakatimeData, {
                userId,
                apiKey: args.apiKey, // Store encrypted in production
                range,
                endpoint: args.endpoint,
                ...result,
            });

            return result;
        } catch (error) {
            console.error("Error fetching Wakatime data:", error);
            
            // Provide more specific error messages
            if (error instanceof Error) {
                if (error.message.includes("401")) {
                    throw new Error("Invalid Wakatime API key. Please check your API key and try again.");
                } else if (error.message.includes("403")) {
                    throw new Error("Access denied. Please check your Wakatime API permissions.");
                } else if (error.message.includes("404")) {
                    throw new Error("Wakatime API endpoint not found. Please check your custom endpoint URL.");
                } else if (error.message.includes("No Wakatime data available")) {
                    throw new Error("No coding activity found for the selected time range. Try a different range or ensure Wakatime is tracking your activity.");
                }
            }
            
            throw new Error(`Failed to fetch Wakatime data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },
});

// Internal mutation to store Wakatime data
export const storeWakatimeData = internalMutation({
    args: {
        userId: v.string(),
        apiKey: v.string(),
        range: v.string(),
        endpoint: v.optional(v.string()),
        codingTime: v.number(),
        projectBreakdown: v.array(v.object({
            name: v.string(),
            time: v.number(),
            percentage: v.number(),
        })),
        languageBreakdown: v.array(v.object({
            name: v.string(),
            time: v.number(),
            percentage: v.number(),
        })),
        dailyCodingHours: v.array(v.object({
            date: v.string(),
            hours: v.number(),
            languages: v.optional(v.array(v.object({
                name: v.string(),
                time: v.number(),
                percentage: v.number(),
            }))),
            projects: v.optional(v.array(v.object({
                name: v.string(),
                time: v.number(),
                percentage: v.number(),
            }))),
        })),
        lastUpdated: v.number(),
    },
    handler: async (ctx, args) => {
        // Store user settings
        const existingSettings = await ctx.db
            .query("wakatimeSettings")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .first();

        if (existingSettings) {
            await ctx.db.patch(existingSettings._id, {
                apiKey: args.apiKey,
                endpoint: args.endpoint,
                lastSync: args.lastUpdated,
                isActive: true,
            });
        } else {
            await ctx.db.insert("wakatimeSettings", {
                userId: args.userId,
                apiKey: args.apiKey,
                endpoint: args.endpoint,
                lastSync: args.lastUpdated,
                isActive: true,
            });
        }

        // Store daily data points
        console.log(`Storing ${args.dailyCodingHours.length} daily data points for user ${args.userId}`);
        
        for (const dailyData of args.dailyCodingHours) {
            const codingTimeInSeconds = Math.round(dailyData.hours * 3600); // Convert hours to seconds and round
            console.log(`Storing daily data: ${dailyData.date} - ${dailyData.hours} hours (${codingTimeInSeconds} seconds)`);
            
            const existingDaily = await ctx.db
                .query("wakatimeDailyData")
                .withIndex("by_user_and_date", (q) =>
                    q.eq("userId", args.userId).eq("date", dailyData.date)
                )
                .first();

            if (existingDaily) {
                await ctx.db.patch(existingDaily._id, {
                    codingTime: codingTimeInSeconds,
                    languages: dailyData.languages,
                    projects: dailyData.projects,
                    lastUpdated: args.lastUpdated,
                });
                console.log(`Updated existing daily data for ${dailyData.date}: ${codingTimeInSeconds} seconds, ${dailyData.languages?.length || 0} languages, ${dailyData.projects?.length || 0} projects`);
            } else {
                await ctx.db.insert("wakatimeDailyData", {
                    userId: args.userId,
                    date: dailyData.date,
                    codingTime: codingTimeInSeconds,
                    languages: dailyData.languages,
                    projects: dailyData.projects,
                    lastUpdated: args.lastUpdated,
                });
                console.log(`Created new daily data for ${dailyData.date}: ${codingTimeInSeconds} seconds, ${dailyData.languages?.length || 0} languages, ${dailyData.projects?.length || 0} projects`);
            }
        }

        // If no daily data was provided, create at least one entry for today to show connection is working
        if (args.dailyCodingHours.length === 0) {
            const today = new Date().toISOString().split('T')[0];
            console.log(`No daily data provided, creating entry for today (${today}) with 0 time`);
            
            const existingDaily = await ctx.db
                .query("wakatimeDailyData")
                .withIndex("by_user_and_date", (q) =>
                    q.eq("userId", args.userId).eq("date", today)
                )
                .first();

            if (existingDaily) {
                await ctx.db.patch(existingDaily._id, {
                    codingTime: 0,
                    lastUpdated: args.lastUpdated,
                });
            } else {
                await ctx.db.insert("wakatimeDailyData", {
                    userId: args.userId,
                    date: today,
                    codingTime: 0,
                    lastUpdated: args.lastUpdated,
                });
            }
        }
    },
});

// Get user's Wakatime settings
export const getWakatimeSettings = query({
    args: {},
    returns: v.union(
        v.null(),
        v.object({
            _id: v.id("wakatimeSettings"),
            _creationTime: v.number(),
            userId: v.string(),
            apiKey: v.string(),
            endpoint: v.optional(v.string()),
            lastSync: v.optional(v.number()),
            isActive: v.boolean(),
            defaultRange: v.optional(v.string()),
        })
    ),
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const userId = identity.subject;

        const settings = await ctx.db
            .query("wakatimeSettings")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        return settings;
    },
});

// Get Wakatime analytics for dashboard
export const getWakatimeAnalytics = query({
    args: {
        days: v.optional(v.number()),
    },
    returns: v.object({
        totalCodingTime: v.number(),
        averageDailyCodingTime: v.number(),
        codingTrend: v.array(v.object({
            date: v.string(),
            hours: v.number(),
        })),
        mostUsedLanguages: v.array(v.object({
            name: v.string(),
            time: v.number(),
            percentage: v.number(),
        })),
        mostUsedProjects: v.array(v.object({
            name: v.string(),
            time: v.number(),
            percentage: v.number(),
        })),
        isConnected: v.boolean(),
        lastSync: v.optional(v.number()),
    }),
    handler: async (ctx, args): Promise<{
        totalCodingTime: number;
        averageDailyCodingTime: number;
        codingTrend: Array<{ date: string; hours: number }>;
        mostUsedLanguages: Array<{ name: string; time: number; percentage: number }>;
        mostUsedProjects: Array<{ name: string; time: number; percentage: number }>;
        isConnected: boolean;
        lastSync?: number;
    }> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");
        const userId = identity.subject;

        const days = args.days || 7;

        // Check if user has Wakatime connected
        const settings = await ctx.db
            .query("wakatimeSettings")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .first();

        if (!settings || !settings.isActive) {
            return {
                totalCodingTime: 0,
                averageDailyCodingTime: 0,
                codingTrend: [],
                mostUsedLanguages: [],
                mostUsedProjects: [],
                isConnected: false,
            };
        }

        // Get daily coding data
        const dailyData = await ctx.db
            .query("wakatimeDailyData")
            .withIndex("by_user_and_date", (q) => q.eq("userId", userId))
            .order("desc")
            .take(days);

        // Calculate totals and averages
        const totalCodingTime = dailyData.reduce((sum, day) => sum + (day.codingTime || 0), 0);
        const daysWithData = dailyData.filter(day => day.codingTime > 0).length;
        const averageDailyCodingTime = daysWithData > 0 ? totalCodingTime / daysWithData : 0;

        // Prepare trend data
        const codingTrend = dailyData
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(day => ({
                date: day.date,
                hours: day.codingTime / 3600, // Convert seconds to hours
            }));

        // Aggregate language breakdown from daily data
        const languageMap = new Map<string, number>();
        dailyData.forEach(day => {
            if (day.languages) {
                day.languages.forEach(lang => {
                    const existing = languageMap.get(lang.name) || 0;
                    languageMap.set(lang.name, existing + lang.time);
                });
            }
        });

        const mostUsedLanguages = Array.from(languageMap.entries())
            .map(([name, time]) => ({
                name,
                time,
                percentage: totalCodingTime > 0 ? (time / totalCodingTime) * 100 : 0,
            }))
            .sort((a, b) => b.time - a.time)
            .slice(0, 10); // Top 10 languages

        // Aggregate project breakdown from daily data
        const projectMap = new Map<string, number>();
        dailyData.forEach(day => {
            if (day.projects) {
                day.projects.forEach(project => {
                    const existing = projectMap.get(project.name) || 0;
                    projectMap.set(project.name, existing + project.time);
                });
            }
        });

        const mostUsedProjects = Array.from(projectMap.entries())
            .map(([name, time]) => ({
                name,
                time,
                percentage: totalCodingTime > 0 ? (time / totalCodingTime) * 100 : 0,
            }))
            .sort((a, b) => b.time - a.time)
            .slice(0, 10); // Top 10 projects

        return {
            totalCodingTime,
            averageDailyCodingTime,
            codingTrend,
            mostUsedLanguages,
            mostUsedProjects,
            isConnected: true,
            lastSync: settings.lastSync,
        };
    },
});

// Calculate Wakatime-based risk score
export const calculateWakatimeRisk = query({
    args: {
        days: v.optional(v.number()),
    },
    returns: v.number(), // 0-100 risk score
    handler: async (ctx, args): Promise<number> => {
        const analytics = await ctx.runQuery(api.wakatime.getWakatimeAnalytics, args);

        if (!analytics.isConnected) {
            return 0; // No data, no risk assessment
        }

        let riskScore = 0;

        // Excessive coding time (more than 8 hours/day average)
        const avgHoursPerDay = analytics.averageDailyCodingTime / 3600;
        if (avgHoursPerDay > 10) {
            riskScore += 30;
        } else if (avgHoursPerDay > 8) {
            riskScore += 20;
        } else if (avgHoursPerDay > 6) {
            riskScore += 10;
        }

        // Very low coding time might indicate disengagement
        if (avgHoursPerDay < 1) {
            riskScore += 10;
        }

        // Check for consistent long hours (little variation)
        if (analytics.codingTrend.length > 3) {
            const hours = analytics.codingTrend.map(d => d.hours);
            const avg = hours.reduce((a, b) => a + b, 0) / hours.length;
            const variance = hours.reduce((sum, hour) => sum + Math.pow(hour - avg, 2), 0) / hours.length;
            const stdDev = Math.sqrt(variance);

            // Low variation might indicate consistent overwork
            if (stdDev < 1 && avg > 6) {
                riskScore += 15;
            }
        }

        // Check for weekend coding (if data includes weekends)
        const weekendCoding = analytics.codingTrend.filter(day => {
            const date = new Date(day.date);
            const dayOfWeek = date.getDay();
            return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
        });

        const weekendRatio = weekendCoding.length / Math.max(analytics.codingTrend.length, 1);
        if (weekendRatio > 0.3) {
            riskScore += 15;
        }

        return Math.min(100, Math.max(0, riskScore));
    },
});