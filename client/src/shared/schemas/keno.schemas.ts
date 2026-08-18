import { z } from 'zod';

export const kenoPlaySchema = z.object({
  spots: z
    .array(z.number().int().min(1).max(80))
    .min(1, 'Please select at least 1 number')
    .max(10, 'You can select a maximum of 10 numbers')
    .refine((items) => new Set(items).size === items.length, {
      message: 'All selected numbers must be unique',
    }),
  wager: z.number().min(1, 'Minimum wager is 1 ETB').max(10000, 'Maximum wager is 10,000 ETB'),
});

export type KenoPlaySchemaType = z.infer<typeof kenoPlaySchema>;
