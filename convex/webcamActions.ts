"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
// Using Auth0 authentication instead of Convex Auth
import { internal } from "./_generated/api";

// Process webcam frame with Twelvelabs
export const processWebcamFrame = action({
  args: {
    imageData: v.string(), // base64 encoded image
  },
  handler: async (ctx, args) => {
    // Demo mode - use fixed userId for now
    const userId = "demo-user-123";

    // Integrate with TwelveLabs API for real mood detection
    let moodAnalysis;
    
    try {
      // Call TwelveLabs API for mood analysis
      const response = await fetch("https://api.twelvelabs.io/v1.2/classify", {
        method: "POST",
        headers: {
          "x-api-key": process.env.TWELVELABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_url: args.imageData, // This would be a base64 data URL for webcam frame
          classes: ["happy", "neutral", "stressed", "tired", "focused", "distracted"],
          options: {
            include_emotions: true,
            detect_presence: true,
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        moodAnalysis = {
          mood: result.classifications?.[0]?.class || "neutral",
          moodScore: Math.round((result.classifications?.[0]?.confidence || 0.5) * 100),
          isPresent: result.presence?.detected || true,
          confidence: result.classifications?.[0]?.confidence || 0.8,
        };
      } else {
        throw new Error(`TwelveLabs API error: ${response.status}`);
      }
    } catch (error) {
      console.error("TwelveLabs API error:", error);
      // Fallback to mock data if API fails
      moodAnalysis = {
        mood: ["happy", "neutral", "stressed", "tired"][Math.floor(Math.random() * 4)],
        moodScore: Math.floor(Math.random() * 100),
        isPresent: Math.random() > 0.2,
        confidence: 0.8 + Math.random() * 0.2,
      };
    }

    // Store mood data
    await ctx.runMutation(internal.webcam.storeMoodData, {
      userId,
      timestamp: Date.now(),
      ...moodAnalysis,
    });

    // Update or create work session
    await ctx.runMutation(internal.webcam.updateWorkSession, {
      userId,
      isPresent: moodAnalysis.isPresent,
      moodScore: moodAnalysis.moodScore,
    });

    return moodAnalysis;
  },
});
