import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
})

export const signupSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
  displayName: z.string().min(1, 'שם תצוגה נדרש'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('כתובת אימייל לא תקינה'),
})

export const resetPasswordSchema = z.object({
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
  confirmPassword: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'הסיסמאות אינן תואמות',
  path: ['confirmPassword'],
})

export type LoginForm = z.infer<typeof loginSchema>
export type SignupForm = z.infer<typeof signupSchema>
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>
