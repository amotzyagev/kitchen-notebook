import { z } from 'zod';
import { VALID_IMAGE_TYPES } from '@/lib/constants/image';

export const parseUrlRequestSchema = z.object({
  url: z.string().url(),
});

export const parseImageRequestSchema = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.enum(VALID_IMAGE_TYPES),
});
