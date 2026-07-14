import { z } from 'zod';

export const photoSchema = z.object({
  id: z.string().min(1),
  objectKey: z.string().min(1),
  src: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  originalBytes: z.number().int().nonnegative(),
  webpBytes: z.number().int().nonnegative(),
  caption: z.string().min(12),
  alt: z.string().min(8).optional(),
});

export const videoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  src: z.string().min(1),
  poster: z.string().min(1),
  captions: z.string().optional(),
});

export const placeSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  sequence: z.number().int().positive(),
  approximateTime: z.string().optional(),
  name: z.string().min(1),
  summary: z.string().min(20),
  description: z.string().min(80),
  certainty: z.enum(['confirmed', 'probable']).default('confirmed'),
  editorialNote: z.string().min(20).optional(),
  photos: z.array(photoSchema).default([]),
  videos: z.array(videoSchema).default([]),
});

export const daySchema = z.object({
  id: z.string().min(1),
  number: z.number().int().min(1).max(5),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  date: z.iso.date(),
  city: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(40),
  cover: z.string().min(1),
  places: z.array(placeSchema).min(1),
});

export const pilgrimageSchema = z
  .object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    dates: z.string().min(1),
    publicIntroduction: z.array(z.string().min(20)).min(1),
    privateIntroduction: z.string().min(40),
    hero: z.string().min(1),
    days: z.array(daySchema).length(5),
  })
  .superRefine((value, context) => {
    const numbers = value.days.map((day) => day.number);
    if (new Set(numbers).size !== 5 || ![1, 2, 3, 4, 5].every((day) => numbers.includes(day))) {
      context.addIssue({ code: 'custom', message: 'La peregrinación debe contener los días 1 a 5.' });
    }

    for (const day of value.days) {
      const sequences = day.places.map((place) => place.sequence);
      if (new Set(sequences).size !== sequences.length) {
        context.addIssue({ code: 'custom', message: `El día ${day.number} tiene lugares con orden repetido.` });
      }
    }
  });

export type PhotoAsset = z.infer<typeof photoSchema>;
export type VideoAsset = z.infer<typeof videoSchema>;
export type Place = z.infer<typeof placeSchema>;
export type PilgrimageDay = z.infer<typeof daySchema>;
export type Pilgrimage = z.infer<typeof pilgrimageSchema>;
