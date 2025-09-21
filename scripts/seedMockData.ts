import { convex } from "../convex/_generated/server.js";

// Mock data seeding script
// Run this with: npx tsx scripts/seedMockData.ts

async function seedMockData() {
  const userId = process.env.USER_ID || "test-user-123";
  const days = parseInt(process.env.DAYS || "30");

  console.log(`🌱 Seeding mock data for TouchGrass app...`);
  console.log(`📅 Generating ${days} days of data for user: ${userId}`);

  try {
    const result = await convex.action.api.mockData.seedAllMockData({
      userId,
      days,
    });

    console.log("✅ Mock data seeded successfully!");
    console.log("📊 Summary:", result);

  } catch (error) {
    console.error("❌ Error seeding mock data:", error);
    process.exit(1);
  }
}

// Run the seeding
seedMockData();