import { internalMutation } from "./_generated/server";

/**
 * Clear old burnout scores that don't match the current schema.
 * This is an internal mutation that bypasses schema validation.
 * 
 * To run this:
 * 1. Deploy it: npx convex dev (in another terminal)
 * 2. Run it: npx convex run clearOldBurnoutScores:clearAll --admin-key <your-admin-key>
 * 
 * Or run from the Convex dashboard Functions tab.
 */
export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all burnout scores without schema validation
    const allScores = await ctx.db.query("burnoutScores").collect();
    
    let deleted = 0;
    
    for (const score of allScores) {
      const factors = score.factors as any;
      
      // Delete scores missing the new required fields
      if (!factors.appliedWeights || !factors.dataAvailability || !factors.factorDescriptions) {
        await ctx.db.delete(score._id);
        deleted++;
        console.log(`Deleted old burnout score: ${score._id}`);
      }
    }
    
    console.log(`✅ Cleanup complete: Deleted ${deleted} old burnout scores`);
    
    return { 
      success: true,
      deleted, 
      message: `Deleted ${deleted} old burnout scores. New data will be generated with the correct schema.` 
    };
  },
});
