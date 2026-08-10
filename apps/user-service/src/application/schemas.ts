import { z } from 'zod';

export const RegisterUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters'),
});

export type RegisterUserInput = z.infer<typeof RegisterUserSchema>;

export const RegisterUserResponseSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string().email(),
    createdAt: z.date(),
  }),
  accessToken: z.string(),
});

export type RegisterUserResponse = z.infer<typeof RegisterUserResponseSchema>;

export const UserProfileResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
});

export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;
