import { Router } from 'express';
import { z } from 'zod';
import { createUser, getUser } from '../services/firestore';
import { runGoalPlanAgent } from '../agents/goalPlanAgent';
import { logger } from '../utils/logger';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const goalsRouter = Router();

const GoalSchema = z.object({
  name: z.string().min(1),
  primaryGoal: z.enum(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness']),
  currentWeight: z.number().optional(),
  targetWeight: z.number().optional(),
  weeklyWorkoutDays: z.number().min(1).max(7),
  fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
  dietaryPreferences: z.array(z.string()).optional(),
  injuries: z.array(z.string()).optional(),
});

// POST /api/goals — create user + generate fitness plan
goalsRouter.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const body = GoalSchema.parse(req.body);
    const userId = req.uid!;

    const goals = {
      primaryGoal: body.primaryGoal,
      currentWeight: body.currentWeight,
      targetWeight: body.targetWeight,
      weeklyWorkoutDays: body.weeklyWorkoutDays,
      fitnessLevel: body.fitnessLevel,
      dietaryPreferences: body.dietaryPreferences ?? [],
      injuries: body.injuries ?? [],
    };

    // Create user in Firestore
    await createUser(userId, body.name, goals);

    // Run Goal Plan Agent (Gemini 2.5 Flash)
    const { plan, motivationalMessage } = await runGoalPlanAgent(userId, body.name, goals);

    res.json({ userId, plan, motivationalMessage });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('POST /goals error', { error: message });
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to generate fitness plan', detail: message });
  }
});

// GET /api/goals/me — retrieve current user profile + plan
goalsRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await getUser(req.uid!);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    logger.error('GET /goals/me error', { error: err });
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});
