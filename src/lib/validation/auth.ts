import { z } from "zod";

export function normalizeLoginId(value: string) {
  return value.trim().normalize("NFKC").toLowerCase();
}

export const loginIdSchema = z
  .string()
  .min(4, "ログインIDは4文字以上で入力してください。")
  .max(24, "ログインIDは24文字以内で入力してください。")
  .regex(/^[a-z0-9_-]+$/, "ログインIDは半角英数字、ハイフン、アンダースコアで入力してください。")
  .transform(normalizeLoginId);

export const passwordSchema = z
  .string()
  .min(8, "パスワードは8文字以上で入力してください。")
  .max(72, "パスワードは72文字以内で入力してください。")
  .refine((value) => value.trim().length > 0, "パスワードを入力してください。");

export const registerSchema = z
  .object({
    loginId: loginIdSchema,
    password: passwordSchema,
    displayName: z.string().trim().min(1).max(24),
    townName: z.string().trim().min(1).max(24),
    acceptedTerms: z.literal(true)
  })
  .refine((value) => value.loginId !== normalizeLoginId(value.password), {
    path: ["password"],
    message: "ログインIDと同じパスワードは使用できません。"
  });

export const loginSchema = z.object({
  loginId: loginIdSchema,
  password: z.string().min(1)
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema
});

export const passwordRecoverSchema = z.object({
  loginId: loginIdSchema,
  recoveryCode: z.string().trim().min(1),
  newPassword: passwordSchema
});
