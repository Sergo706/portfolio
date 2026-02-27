import * as z from 'zod';

export const contactSchema = z.object({
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters long'),
  subject: z.string().min(5, 'Subject must be at least 5 characters long'),
  fullname: z.string().min(3, 'Name must be at least 3 characters long'),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format. Please use E.164 format (e.g., +1234567890)')
    .optional()
    .or(z.literal('')),
  token: z.string().optional(),
});

export type Contact = z.infer<typeof contactSchema>;