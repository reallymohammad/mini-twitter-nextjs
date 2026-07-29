import { z } from "zod";

export const profileSchema = z.object({
  fullName: z.string().min(1).max(50),
  bio: z.string().max(160).optional().default(""),
  location: z.string().max(30).optional().default(""),
  website: z
    .string()
    .optional()
    .default("")
    .refine(
      (v) => !v || v === "" || /^https?:\/\/.+/.test(v),
      { message: "Website must start with http:// or https://" }
    ),
  birthDate: z.string().optional().default(""),
  avatarUrl: z.string().url().optional().or(z.literal("")).default(""),
  coverImageUrl: z.string().url().optional().or(z.literal("")).default(""),
});

export type ProfileInput = z.infer<typeof profileSchema>;
