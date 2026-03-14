import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { createUser, getUser } from '../services/firestore';
import { runGoalPlanAgent } from '../agents/goalPlanAgent';
import { logger } from '../utils/logger';

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
  userId: z.string().optional(),
});

// POST /api/goals — create user + generate fitness plan
goalsRouter.post('/', async (req, res) => {
  try {
    const body = GoalSchema.parse(req.body);
    const userId = body.userId || uuidv4();

    const goals = {
      primaryGoal: body.primaryGoal,
      currentWeight: body.currentWeight,
      targetWeight: body.targetWeight,
      weeklyWorkoutDays: body.weeklyWorkoutDays,
      fitnessLevel: body.fitnessLevel,
      dietaryPreferences: body.dietaryPreferences,
      injuries: body.injuries,
    };

    // Create user in Firestore
    await createUser(userId, body.name, goals);

    // Run Goal Plan Agent (Gemini 2.5 Flash)
    const { plan, motivationalMessage } = await runGoalPlanAgent(userId, body.name, goals);

    res.json({ userId, plan, motivationalMessage });
  } catch (err) {
    logger.error('POST /goals error', { error: err });
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors });
    }
    res.status(500).json({ error: 'Failed to generate fitness plan' });
  }
});

// GET /api/goals/:userId — retrieve user profile + plan
goalsRouter.get('/:userId', async (req, res) => {
  try {
    const user = await getUser(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    logger.error('GET /goals/:userId error', { error: err });
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});
