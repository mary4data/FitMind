import { generateText } from '../services/gemini';
import { FitnessGoal, FitnessPlan, updateUserPlan } from '../services/firestore';
import { GOAL_PLAN_SYSTEM, buildGoalPlanPrompt } from '../prompts/goalPlan';
import { logger } from '../utils/logger';

export interface GoalPlanResult {
  plan: FitnessPlan;
  motivationalMessage: string;
}

export async function runGoalPlanAgent(
  userId: string,
  name: string,
  goals: FitnessGoal
): Promise<GoalPlanResult> {
  logger.info('GoalPlanAgent started', { userId });

  const prompt = buildGoalPlanPrompt(name, goals);
  const rawResponse = await generateText(prompt, GOAL_PLAN_SYSTEM);

  let parsed: { weeklySchedule: FitnessPlan['weeklySchedule']; nutritionGuidelines: FitnessPlan['nutritionGuidelines']; motivationalMessage: string };

  try {
    // Strip potential markdown fences if model adds them despite instructions
    const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    logger.error('GoalPlanAgent JSON parse error', { rawResponse, error: e });
    throw new Error('Failed to parse fitness plan from AI response');
  }

  const plan: FitnessPlan = {
    weeklySchedule: parsed.weeklySchedule,
    nutritionGuidelines: parsed.nutritionGuidelines,
    generatedAt: new Date().toISOString(),
  };

  // Persist plan to Firestore
  await updateUserPlan(userId, plan);

  logger.info('GoalPlanAgent completed', { userId, days: plan.weeklySchedule.length });
  return { plan, motivationalMessage: parsed.motivationalMessage };
}
