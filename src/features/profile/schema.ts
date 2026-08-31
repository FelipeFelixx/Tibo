import { z } from "zod";

export const profileEditSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório").max(60),
  sobrenome: z.string().trim().max(60).optional().or(z.literal("")),
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{3,30}$/, "3-30 caracteres, letras, números ou _"),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  cidade: z.string().trim().max(60).optional().or(z.literal("")),
  estado: z.string().trim().max(60).optional().or(z.literal("")),
  pais: z.string().trim().max(60).optional().or(z.literal("")),
  site: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^https?:\/\//.test(v), "Deve começar com http(s)://"),
});

export type ProfileEditValues = z.infer<typeof profileEditSchema>;

export const privacySchema = z.object({
  perfil_publico: z.boolean(),
  quem_pode_amizade: z.enum(["todos", "amigos", "ninguem"]),
  quem_pode_seguir: z.enum(["todos", "amigos", "ninguem"]),
  quem_pode_mensagem: z.enum(["todos", "amigos", "ninguem"]),
});

export type PrivacyValues = z.infer<typeof privacySchema>;