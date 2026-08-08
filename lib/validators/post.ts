import { z } from "zod";

export const postSchema = z.object({
  content: z
    .string()
    .trim()
    .max(280, "Post cannot exceed 280 characters")
    .optional()
    .default(""),
  imageUrl: z.string().url().optional().nullable(),
  parentId: z.string().optional(), // <-- این رو اضافه کن
}).refine((data) => data.content.length > 0 || !!data.imageUrl, {
  message: "Post must have content or an image",
  path: ["content"],
});
