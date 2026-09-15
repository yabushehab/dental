import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const createOrganizationSchema = z.object({
  organizationName: z.string().trim().min(2, "Organization name is too short").max(120),
  clinicName: z.string().trim().min(2, "Clinic name is too short").max(120),
  country: z.string().length(2).default("BH"),
  currency: z.string().length(3).default("BHD"),
  timezone: z.string().min(1).default("Asia/Bahrain"),
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
