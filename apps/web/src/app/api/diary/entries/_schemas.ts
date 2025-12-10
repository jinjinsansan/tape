import { z } from "zod";

export const feelingSchema = z.object({
  label: z.string().min(1).max(48),
  intensity: z.number().int().min(0).max(100).optional(),
  tone: z.string().max(48).optional().nullable()
});

export const entrySchema = z.object({
  title: z.string().max(120).optional().nullable(),
  content: z.string().min(1).max(4000),
  moodScore: z.number().int().min(1).max(5).optional(),
  moodLabel: z.string().max(32).optional().nullable(),
  moodColor: z.string().max(32).optional().nullable(),
  energyLevel: z.number().int().min(1).max(5).optional(),
  emotionLabel: z.string().max(48).optional().nullable(),
  eventSummary: z.string().max(1000).optional().nullable(),
  realization: z.string().max(2000).optional().nullable(),
  selfEsteemScore: z.number().int().min(0).max(100).optional().nullable(),
  worthlessnessScore: z.number().int().min(0).max(100).optional().nullable(),
  visibility: z.enum(["private", "followers", "public"]).optional(),
  journalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  feelings: z.array(feelingSchema).max(8).optional()
});

export const updateEntrySchema = entrySchema.partial().extend({
  content: z.string().min(1).max(4000).optional()
});

export const scopeSchema = z.enum(["me", "public"]);

export const reactionSchema = z.object({
  reactionType: z.enum(["cheer", "hug", "empathy", "insight"])
});
