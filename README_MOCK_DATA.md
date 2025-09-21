# Mock Data Generation for TouchGrass

This document explains how to generate and use mock data for testing the burnout risk and break analysis features.

## Overview

The mock data generation system creates realistic test data for:
- **Burnout risk scores** (30-day history with varying risk levels)
- **Break patterns** (realistic break frequency and duration)
- **Work sessions** (work hours, mood, and break correlations)

## Backend Mock Data (Convex Functions)

### Available Functions

Located in `convex/mockData.ts`:

1. **`generateMockBurnoutHistory`** - Generates burnout risk scores
2. **`generateMockBreakData`** - Generates break tracking data
3. **`generateMockWorkSessions`** - Generates work session data
4. **`seedAllMockData`** - Seeds all mock data to database

### Usage

```typescript
// Generate 30 days of burnout data for a user
const burnoutData = await ctx.runAction(api.mockData.generateMockBurnoutHistory, {
  userId: "user-123",
  days: 30
});

// Generate break data
const breakData = await ctx.runAction(api.mockData.generateMockBreakData, {
  userId: "user-123",
  days: 30
});

// Generate work sessions
const workSessions = await ctx.runAction(api.mockData.generateMockWorkSessions, {
  userId: "user-123",
  days: 30
});

// Seed all data types at once
const result = await ctx.runAction(api.mockData.seedAllMockData, {
  userId: "user-123",
  days: 30
});
```

## Frontend Mock Data Utilities

Located in `src/utils/mockDataGenerator.ts`:

### Functions Available

```typescript
import {
  generateMockBurnoutData,
  generateMockBreakData,
  generateMockWorkSessions,
  getRiskLevelDescription,
  getRiskLevelColor
} from '../utils/mockDataGenerator';

// Generate mock data for frontend testing
const burnoutData = generateMockBurnoutData("user-123", 30);
const breakData = generateMockBreakData("user-123", 30);
const workSessions = generateMockWorkSessions("user-123", 30);

// Get risk level descriptions
const riskLevel = getRiskLevelDescription(75); // "High"
const riskColor = getRiskLevelColor(75); // "text-orange-600 bg-orange-50"
```

## Data Seeding Script

### Using the Node.js Script

```bash
# Set environment variables
export USER_ID="test-user-123"
export DAYS=30

# Run the seeding script
npx tsx scripts/seedMockData.ts
```

### Example Output

```
🌱 Seeding mock data for TouchGrass app...
📅 Generating 30 days of data for user: test-user-123
✅ Mock data seeded successfully!
📊 Summary: {
  success: true,
  counts: {
    burnout: 30,
    breaks: 156,
    sessions: 22
  }
}
```

## Data Characteristics

### Burnout Risk Scores
- **Range**: 0-100 scale
- **Pattern**: Cyclical with weekend adjustments
- **Factors**: 6 contributing factors with realistic correlations
- **Risk Levels**:
  - 80+: Critical (Red)
  - 60-79: High (Orange)
  - 40-59: Moderate (Yellow)
  - 20-39: Low (Blue)
  - 0-19: Minimal (Green)

### Break Patterns
- **Frequency**: 3-8 breaks per day (more on weekends)
- **Duration**: 30 seconds to 15 minutes
- **Validation**: Breaks ≥ 1 minute marked as valid
- **Timing**: Realistic workday distribution (9 AM - 6 PM)

### Work Sessions
- **Weekdays**: 6-10 hour sessions
- **Weekends**: 2-6 hour sessions (70% probability)
- **Mood**: -1 to 3 scale (-1 = stressed, 3 = excellent)
- **Breaks**: Proportional to work duration

## Testing Scenarios

### High Burnout Risk Period
```typescript
// Generate data showing escalating burnout risk
const highRiskData = generateMockBurnoutData("user-123", 7)
  .map((day, index) => ({
    ...day,
    riskScore: Math.min(100, 40 + (index * 8)) // Escalating risk
  }));
```

### Poor Break Patterns
```typescript
// Generate data with insufficient breaks
const poorBreakData = generateMockBreakData("user-123", 7)
  .filter(breakItem => breakItem.duration < 120); // Only short breaks
```

### Healthy Work Patterns
```typescript
// Generate data with good work-life balance
const healthyData = {
  burnout: generateMockBurnoutData("user-123", 7)
    .map(day => ({ ...day, riskScore: Math.max(0, day.riskScore - 20) })),
  breaks: generateMockBreakData("user-123", 7)
    .filter(breakItem => breakItem.duration >= 180) // Only longer breaks
};
```

## Integration with Components

### Using in Chart Components
```typescript
import { generateMockBurnoutData } from '../utils/mockDataGenerator';

function BurnoutChart() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Use mock data for development/testing
    const mockData = generateMockBurnoutData("demo-user", 30);
    setData(mockData);
  }, []);

  return <Chart data={data} />;
}
```

### Using in API Response Mocking
```typescript
// Mock API response for testing
export const mockBurnoutAPI = {
  getBurnoutHistory: async (userId: string) => {
    return generateMockBurnoutData(userId, 30);
  },

  getBreakAnalysis: async (userId: string) => {
    return generateMockBreakData(userId, 30);
  }
};
```

## Environment Variables

For the seeding script:

```bash
# Required
USER_ID=your-user-id

# Optional
DAYS=30  # Number of days to generate (default: 30)
```

## Development Workflow

1. **Development**: Use frontend utilities for quick iteration
2. **Testing**: Seed backend data for integration tests
3. **Demo**: Generate realistic data for presentations
4. **Debugging**: Create specific scenarios to test edge cases