import { z } from 'zod';

export const parseUrlRequestSchema = z.object({
  url: z.string().url(),
});

export const parseImageRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});
