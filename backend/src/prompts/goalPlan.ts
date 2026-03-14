import { FitnessGoal } from '../services/firestore';

export const GOAL_PLAN_SYSTEM = `You are FitMind, an elite AI personal trainer and nutritionist.
Your job is to create highly personalized, evidence-based fitness and nutrition plans.
Always respond with valid JSON only — no markdown fences, no extra text.
Be encouraging, specific, and realistic. Tailor plans to the user's fitness level and goals.`;

export function buildGoalPlanPrompt(name: string, goals: FitnessGoal): string {
  return `Create a comprehensive weekly fitness and nutrition plan for ${name}.

User Profile:
- Primary Goal: ${goals.primaryGoal}
- Current Weight: ${goals.currentWeight ?? 'not provided'} kg
- Target Weight: ${goals.targetWeight ?? 'not provided'} kg
- Fitness Level: ${goals.fitnessLevel}
- Workout Days Per Week: ${goals.weeklyWorkoutDays}
- Dietary Preferences: ${goals.dietaryPreferences?.join(', ') || 'none'}
- Injuries / Limitations: ${goals.injuries?.join(', ') || 'none'}

Return ONLY this JSON structure:
{
  "weeklySchedule": [
    {
      "day": "Monday",
      "focus": "Upper Body Strength",
      "duration": 45,
      "exercises": [
        {
          "name": "Push-Ups",
          "sets": 3,
          "reps": "12-15",
          "restSeconds": 60,
          "notes": "Keep core tight, full range of motion"
        }
      ]
    }
  ],
  "nutritionGuidelines": {
    "dailyCalories": 2000,
    "macros": { "protein": 150, "carbs": 200, "fat": 65 },
    "meals": ["Breakfast: ...", "Lunch: ...", "Dinner: ...", "Snacks: ..."],
    "hydration": "Drink 2.5L of water daily"
  },
  "motivationalMessage": "Your personalized message here"
}`;
}
