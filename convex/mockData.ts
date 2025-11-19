import { mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { faker } from '@faker-js/faker';
import { api } from "./_generated/api";

// Internal handler for generating burnout data
async function generateMockBurnoutHistoryHandler(ctx: any, args: { userId: string; days?: number }) {
  const { userId, days = 30 } = args;
  
  // Initialize Faker with a random seed for varied data
  faker.seed();
  
  const burnoutData = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().slice(0, 10);

    // Simulate varying burnout risk patterns using Faker
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseRisk = faker.number.int({ min: 35, max: 65 }); // More realistic base risk
    const weekendModifier = isWeekend ? faker.number.int({ min: -20, max: -5 }) : 0;
    const dailyVariation = faker.number.int({ min: -15, max: 15 });

    const riskScore = Math.max(0, Math.min(100, baseRisk + weekendModifier + dailyVariation));

    // Generate factor scores using Faker for more realistic distributions
    const velocityScore = faker.number.int({ min: 25, max: 75 });
    const moodScore = faker.number.int({ min: 15, max: 85 });
    const workHoursScore = faker.number.int({ min: 20, max: 80 });
    const breakScore = faker.number.int({ min: 10, max: 70 });
    
    // Simulate data availability (some days might not have all data sources)
    const hasCommitData = faker.datatype.boolean({ probability: 0.7 });
    const hasWakatimeData = faker.datatype.boolean({ probability: 0.6 });
    
    const commitPatternsScore = hasCommitData ? faker.number.int({ min: 15, max: 65 }) : null;
    const wakatimeScore = hasWakatimeData ? faker.number.int({ min: 20, max: 60 }) : null;

    const factorDescriptions = {
      velocityScore: velocityScore > 60 ? "High velocity detected - consider pacing" :
                   velocityScore > 40 ? "Moderate velocity - sustainable pace" :
                   "Low velocity - room for increased productivity",
      moodScore: moodScore > 60 ? "Elevated stress levels detected" :
               moodScore > 40 ? "Moderate mood fluctuations" :
               "Good mood stability maintained",
      workHoursScore: workHoursScore > 60 ? "Extended work hours - high burnout risk" :
                    workHoursScore > 40 ? "Moderate work hours - monitor closely" :
                    "Healthy work hours - good balance",
      breakScore: breakScore > 60 ? "Insufficient break frequency" :
                 breakScore > 40 ? "Break patterns need improvement" :
                 "Good break frequency maintained",
      commitPatternsScore: commitPatternsScore ?
                         (commitPatternsScore > 60 ? "Irregular commit patterns detected" :
                          commitPatternsScore > 40 ? "Moderate commit patterns" :
                          "Healthy commit patterns") : "No commit data available",
      wakatimeScore: wakatimeScore ?
                     (wakatimeScore > 60 ? "High coding intensity detected" :
                      wakatimeScore > 40 ? "Moderate coding activity" :
                      "Balanced coding time") : "No coding time data available",
    };

    burnoutData.push({
      userId,
      date: dateString,
      riskScore: Math.round(riskScore),
      factors: {
        velocityScore: Math.round(velocityScore),
        moodScore: Math.round(moodScore),
        workHoursScore: Math.round(workHoursScore),
        breakScore: Math.round(breakScore),
        commitPatternsScore: commitPatternsScore ? Math.round(commitPatternsScore) : undefined,
        wakatimeScore: wakatimeScore ? Math.round(wakatimeScore) : undefined,
        dataAvailability: {
          hasVelocityData: faker.datatype.boolean({ probability: 0.8 }),
          hasMoodData: faker.datatype.boolean({ probability: 0.9 }),
          hasWorkHoursData: faker.datatype.boolean({ probability: 0.85 }),
          hasBreakData: faker.datatype.boolean({ probability: 0.95 }),
          hasCommitData: hasCommitData,
          hasWakatimeData: hasWakatimeData,
        },
        appliedWeights: {
          velocityScore: 0.25,
          moodScore: 0.2,
          workHoursScore: 0.2,
          breakScore: 0.15,
          commitPatternsScore: 0.1,
          wakatimeScore: 0.1,
        },
        trendModifier: i > 0 ? faker.number.int({ min: -5, max: 5 }) : 0,
        severityModifier: riskScore > 70 ? faker.number.int({ min: 10, max: 20 }) : riskScore > 50 ? faker.number.int({ min: 2, max: 8 }) : 0,
        availableDataSources: faker.number.int({ min: 4, max: 6 }),
        factorDescriptions,
      },
      notificationSent: riskScore > 75 && faker.datatype.boolean({ probability: 0.7 }),
    });
  }

  return burnoutData;
}

// Mock burnout risk history data for the last 30 days
export const generateMockBurnoutHistory = action({
  args: {
    userId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await generateMockBurnoutHistoryHandler(ctx, args);
  },
});

// Internal handler for generating break data
async function generateMockBreakDataHandler(ctx: any, args: { userId: string; days?: number }) {
  const { userId, days = 30 } = args;
  
  // Initialize Faker with a random seed for varied data
  faker.seed();
  
  const breakData = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().slice(0, 10);

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Generate realistic break patterns using Faker
    const totalBreaks = isWeekend ? 
      faker.number.int({ min: 4, max: 12 }) : 
      faker.number.int({ min: 3, max: 9 });

    for (let j = 0; j < totalBreaks; j++) {
      // Simulate work day hours (9 AM - 6 PM on weekdays, more variable on weekends)
      const startHour = isWeekend ?
        faker.number.float({ min: 10, max: 18 }) :
        faker.number.float({ min: 9, max: 18 });

      const startTime = new Date(date);
      startTime.setHours(startHour, faker.number.int({ min: 0, max: 59 }), 0, 0);
      const startTimeStamp = startTime.getTime();

      // Break duration using Faker for more realistic patterns
      const breakType = faker.helpers.weightedArrayElement([
        { weight: 1, value: 'short' },   // 10% short breaks (30s-1min)
        { weight: 8, value: 'normal' },  // 80% normal breaks (1-5min) 
        { weight: 1, value: 'long' }     // 10% long breaks (5-15min)
      ]);

      const duration = breakType === 'short' ?
        faker.number.int({ min: 30, max: 60 }) : // Short breaks
        breakType === 'normal' ?
        faker.number.int({ min: 60, max: 300 }) : // Normal breaks
        faker.number.int({ min: 300, max: 900 }); // Long breaks

      const endTimeStamp = startTimeStamp + duration;
      const isValidBreak = duration >= 60; // 1 minute minimum

      breakData.push({
        userId,
        startTime: startTimeStamp,
        endTime: endTimeStamp,
        duration: Math.round(duration),
        isValidBreak,
        date: dateString,
      });
    }
  }

  return breakData;
}

// Mock break analysis data for the last 30 days
export const generateMockBreakData = action({
  args: {
    userId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await generateMockBreakDataHandler(ctx, args);
  },
});

// Internal handler for generating work sessions data
async function generateMockWorkSessionsHandler(ctx: any, args: { userId: string; days?: number }) {
  const { userId, days = 30 } = args;
  
  // Initialize Faker with a random seed for varied data
  faker.seed();
  
  const workSessions = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Use Faker for more realistic work patterns
    const shouldWork = !isWeekend || faker.datatype.boolean({ probability: 0.7 }); // 70% chance of work on weekends
    
    if (shouldWork) {
      // Simulate work start time using Faker
      const startHour = faker.number.float({ min: 8, max: 11 }); // 8 AM - 11 AM start
      const startTime = new Date(date);
      startTime.setHours(startHour, faker.number.int({ min: 0, max: 59 }), 0, 0);
      const startTimeStamp = startTime.getTime();

      // Work duration using Faker (6-10 hours on weekdays, 2-6 hours on weekends)
      const workHours = isWeekend ?
        faker.number.float({ min: 2, max: 6 }) :
        faker.number.float({ min: 6, max: 10 });
      
      const workDuration = workHours * 3600; // Convert to seconds
      const endTimeStamp = startTimeStamp + workDuration;

      // Average mood and breaks taken using Faker
      const averageMood = faker.number.float({ min: -1, max: 3, fractionDigits: 1 }); // -1 to 3 scale
      const baseBreaks = Math.floor(workHours); // 1 break per hour baseline
      const extraBreaks = faker.number.int({ min: 0, max: 3 });
      const breaksTaken = baseBreaks + extraBreaks;

      workSessions.push({
        userId,
        startTime: startTimeStamp,
        endTime: endTimeStamp,
        duration: Math.round(workHours * 60), // Convert to minutes
        averageMood: averageMood,
        breaksTaken,
      });
    }
  }

  return workSessions;
}

// Generate mock work sessions data
export const generateMockWorkSessions = action({
  args: {
    userId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await generateMockWorkSessionsHandler(ctx, args);
  },
});

// Seed all mock data
export const seedAllMockData = action({
  args: {
    userId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, days = 30 } = args;

    console.log(`Generating mock data for user ${userId} for ${days} days...`);

    // Generate all mock data using internal functions
    const burnoutData = await generateMockBurnoutHistoryHandler(ctx, { userId, days });
    const breakData = await generateMockBreakDataHandler(ctx, { userId, days });
    const workSessions = await generateMockWorkSessionsHandler(ctx, { userId, days });

    // Insert data into database using internal mutations
    for (const burnout of burnoutData) {
      await insertBurnoutScoreHandler(ctx, burnout);
    }

    for (const breakItem of breakData) {
      await insertBreakHandler(ctx, breakItem);
    }

    for (const session of workSessions) {
      await insertWorkSessionHandler(ctx, session);
    }

    console.log(`Mock data seeded successfully:
  - ${burnoutData.length} burnout scores
  - ${breakData.length} break records
  - ${workSessions.length} work sessions`);

    return { success: true, counts: { burnout: burnoutData.length, breaks: breakData.length, sessions: workSessions.length } };
  },
});

// Internal handler functions for database insertion
async function insertBurnoutScoreHandler(ctx: any, args: any) {
  return await ctx.db.insert("burnoutScores", args);
}

async function insertBreakHandler(ctx: any, args: any) {
  return await ctx.db.insert("breaks", args);
}

async function insertWorkSessionHandler(ctx: any, args: any) {
  return await ctx.db.insert("workSessions", args);
}

// Internal mutation for seeding data - follows Convex best practices
export const seedFakeData = internalMutation({
  args: {
    userId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, days = 30 } = args;

    console.log(`🌱 Seeding fake data with Faker for user ${userId} (${days} days)...`);

    // Clear existing data first
    const existingBurnout = await ctx.db
      .query("burnoutScores")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    
    for (const item of existingBurnout) {
      await ctx.db.delete(item._id);
    }

    // Generate and insert all fake data
    const burnoutData = await generateMockBurnoutHistoryHandler(ctx, { userId, days });
    const breakData = await generateMockBreakDataHandler(ctx, { userId, days });
    const workSessions = await generateMockWorkSessionsHandler(ctx, { userId, days });

    // Insert burnout scores
    for (const burnout of burnoutData) {
      await ctx.db.insert("burnoutScores", burnout);
    }

    // Insert breaks (if breaks table exists)
    for (const breakItem of breakData) {
      try {
        await ctx.db.insert("breaks", breakItem);
      } catch {
        // Table might not exist yet, skip breaks
        console.log("⚠️ Breaks table not found, skipping break data");
        break;
      }
    }

    // Insert work sessions
    for (const session of workSessions) {
      await ctx.db.insert("workSessions", session);
    }

    console.log(`✅ Faker-generated mock data seeded successfully:
    - ${burnoutData.length} burnout scores
    - ${breakData.length} break records  
    - ${workSessions.length} work sessions`);

    return {
      success: true,
      counts: {
        burnout: burnoutData.length,
        breaks: breakData.length,
        sessions: workSessions.length,
      },
    };
  },
});

// Legacy insert functions for backwards compatibility
export const insertBurnoutScore = mutation({
  args: {
    userId: v.string(),
    date: v.string(),
    riskScore: v.number(),
    factors: v.any(),
    notificationSent: v.boolean(),
  },
  handler: async (ctx, args) => {
    return await insertBurnoutScoreHandler(ctx, args);
  },
});

export const insertBreak = mutation({
  args: {
    userId: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    duration: v.number(),
    isValidBreak: v.boolean(),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await insertBreakHandler(ctx, args);
  },
});

export const insertWorkSession = mutation({
  args: {
    userId: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    duration: v.number(),
    averageMood: v.number(),
    breaksTaken: v.number(),
  },
  handler: async (ctx, args) => {
    return await insertWorkSessionHandler(ctx, args);
  },
});
// ============================================
// LINEAR MOCK DATA GENERATORS
// ============================================

// Internal handler for generating Linear story points data
async function generateMockLinearDataHandler(ctx: any, args: { userId: string; days?: number }) {
  const { userId, days = 30 } = args;
  
  faker.seed();
  
  const storyPointsData = [];
  const today = new Date();
  const projectId = faker.string.uuid(); // Use same project for consistency

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const timestamp = date.getTime();

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Generate realistic number of issues completed per day
    const issuesCompleted = isWeekend ? 
      faker.number.int({ min: 0, max: 2 }) : 
      faker.number.int({ min: 1, max: 5 });

    // Create individual story point entries for each issue
    for (let j = 0; j < issuesCompleted; j++) {
      storyPointsData.push({
        userId,
        projectId,
        issueId: faker.string.uuid(),
        points: faker.number.int({ min: 1, max: 8 }), // Story points per issue
        completedAt: timestamp,
        sprintId: faker.string.uuid(),
      });
    }
  }

  return storyPointsData;
}

// Generate mock Linear story points data
export const generateMockLinearData = action({
  args: {
    userId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await generateMockLinearDataHandler(ctx, args);
  },
});

// ============================================
// WAKATIME MOCK DATA GENERATORS
// ============================================

// Internal handler for generating Wakatime coding data
async function generateMockWakatimeDataHandler(ctx: any, args: { userId: string; days?: number }) {
  const { userId, days = 30 } = args;
  
  faker.seed();
  
  const wakatimeData = [];
  const today = new Date();

  // Popular programming languages and their typical usage patterns
  const languages = [
    { name: 'TypeScript', weight: 35 },
    { name: 'JavaScript', weight: 25 },
    { name: 'Python', weight: 15 },
    { name: 'HTML', weight: 10 },
    { name: 'CSS', weight: 8 },
    { name: 'JSON', weight: 5 },
    { name: 'Markdown', weight: 2 },
  ];

  const projects = [
    'touchgrass',
    'api-backend',
    'mobile-app',
    'dashboard',
    'documentation',
  ];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().slice(0, 10);

    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Generate realistic coding time (0-10 hours per day)
    const codingTime = isWeekend ? 
      faker.number.int({ min: 0, max: 14400 }) : // 0-4 hours on weekends
      faker.number.int({ min: 10800, max: 36000 }); // 3-10 hours on weekdays

    if (codingTime > 0) {
      // Generate language breakdown
      const languageBreakdown: Array<{ name: string; time: number; percentage: number }> = [];
      let remainingTime = codingTime;

      languages.forEach((lang, index) => {
        const isLast = index === languages.length - 1;
        const time = isLast ? 
          remainingTime : 
          Math.floor((codingTime * lang.weight) / 100) + faker.number.int({ min: -300, max: 300 });
        
        if (time > 0) {
          languageBreakdown.push({
            name: lang.name,
            time: Math.max(0, time),
            percentage: parseFloat(((time / codingTime) * 100).toFixed(2)),
          });
          remainingTime -= time;
        }
      });

      // Generate project breakdown
      const projectBreakdown: Array<{ name: string; time: number; percentage: number }> = [];
      remainingTime = codingTime;

      projects.forEach((project, index) => {
        const isLast = index === projects.length - 1;
        const projectWeight = faker.number.int({ min: 10, max: 40 });
        const time = isLast ? 
          remainingTime : 
          Math.floor((codingTime * projectWeight) / 100);
        
        if (time > 0 && projectBreakdown.length < 3) { // Limit to 3 projects per day
          projectBreakdown.push({
            name: project,
            time: Math.max(0, time),
            percentage: parseFloat(((time / codingTime) * 100).toFixed(2)),
          });
          remainingTime -= time;
        }
      });

      wakatimeData.push({
        userId,
        date: dateString,
        codingTime,
        languages: languageBreakdown,
        projects: projectBreakdown,
        lastUpdated: date.getTime(),
      });
    }
  }

  return wakatimeData;
}

// Generate mock Wakatime coding data
export const generateMockWakatimeData = action({
  args: {
    userId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await generateMockWakatimeDataHandler(ctx, args);
  },
});

// ============================================
// SEED ALL DATA INCLUDING INTEGRATIONS
// ============================================

// Internal mutation to insert Linear data
export const insertLinearStoryPoints = mutation({
  args: {
    userId: v.string(),
    projectId: v.string(),
    issueId: v.string(),
    points: v.number(),
    completedAt: v.optional(v.number()),
    sprintId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('storyPoints', args);
  },
});

// Internal mutation to insert Wakatime data
export const insertWakatimeData = mutation({
  args: {
    userId: v.string(),
    date: v.string(),
    codingTime: v.number(),
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
    lastUpdated: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('wakatimeDailyData', args);
  },
});

// Internal mutation to create Wakatime settings
export const createWakatimeSettings = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if settings already exist
    const existing = await ctx.db
      .query('wakatimeSettings')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .first();
    
    if (existing) {
      // Update to active
      await ctx.db.patch(existing._id, { isActive: true, lastSync: Date.now() });
      return existing._id;
    }
    
    // Create new settings
    return await ctx.db.insert('wakatimeSettings', {
      userId: args.userId,
      apiKey: 'mock-api-key',
      isActive: true,
      lastSync: Date.now(),
    });
  },
});

// Seed all mock data including Linear and Wakatime
export const seedAllMockDataWithIntegrations = action({
  args: {
    userId: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, days = 30 } = args;

    console.log(`🌱 Generating complete mock data for user ${userId} for ${days} days...`);

    // Generate all mock data
    const burnoutData = await generateMockBurnoutHistoryHandler(ctx, { userId, days });
    const breakData = await generateMockBreakDataHandler(ctx, { userId, days });
    const workSessions = await generateMockWorkSessionsHandler(ctx, { userId, days });
    const linearData = await generateMockLinearDataHandler(ctx, { userId, days });
    const wakatimeData = await generateMockWakatimeDataHandler(ctx, { userId, days });

    // Insert burnout scores
    for (const burnout of burnoutData) {
      await ctx.runMutation(api.mockData.insertBurnoutScore, burnout);
    }

    // Insert breaks
    for (const breakItem of breakData) {
      await ctx.runMutation(api.mockData.insertBreak, breakItem);
    }

    // Insert work sessions
    for (const session of workSessions) {
      await ctx.runMutation(api.mockData.insertWorkSession, session);
    }

    // Insert Linear story points
    for (const linear of linearData) {
      await ctx.runMutation(api.mockData.insertLinearStoryPoints, linear);
    }

    // Create Wakatime settings (so data shows up in UI)
    await ctx.runMutation(api.mockData.createWakatimeSettings, { userId });

    // Insert Wakatime data
    for (const wakatime of wakatimeData) {
      await ctx.runMutation(api.mockData.insertWakatimeData, wakatime);
    }

    console.log(`✅ Complete mock data seeded successfully:
    - ${burnoutData.length} burnout scores
    - ${breakData.length} break records
    - ${workSessions.length} work sessions
    - ${linearData.length} Linear story points
    - ${wakatimeData.length} Wakatime coding sessions`);

    return {
      success: true,
      counts: {
        burnout: burnoutData.length,
        breaks: breakData.length,
        sessions: workSessions.length,
        linear: linearData.length,
        wakatime: wakatimeData.length,
      },
    };
  },
});