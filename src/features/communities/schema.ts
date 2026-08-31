import { z } from "zod";

export const communityFormSchema = z.object({
  name: z.string().trim().min(3, "Nome muito curto").max(60, "Máximo 60 caracteres"),
  slug: z
    .string()
    .trim()
    .min(3, "URL muito curta")
    .max(50, "Máximo 50 caracteres")
    .regex(/^[a-z0-9][a-z0-9-]{2,49}$/, "Use apenas letras minúsculas, números e hífen"),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional().or(z.literal("")),
  rules: z.string().trim().max(5000, "Máximo 5000 caracteres").optional().or(z.literal("")),
  category_id: z.string().uuid().optional().nullable(),
  visibility: z.enum(["publica", "privada"]),
});

export type CommunityFormValues = z.infer<typeof communityFormSchema>;