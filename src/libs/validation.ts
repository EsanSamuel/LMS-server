import { z } from "zod";

export const validateUser = z.object({
  username: z.string().min(1).max(255),
  email: z.string().email(),
  clerkId: z.string().min(1).max(255),
});

export type userType = z.infer<typeof validateUser>;

//roomName, roomImage, roomDescription, coverImage, category

export const validateRoom = z.object({
  roomName: z.string().min(1).max(255),
  roomDescription: z.string().min(1).max(255),
  category: z.string().min(1).max(255),
  clerkId: z.string().min(1).max(255),
  status: z.enum(["private", "public"]),
});

export type roomType = z.infer<typeof validateRoom>;

//userId, roomId,role

export const validateOrganizer = z.object({
  userId: z.string().min(1).max(255),
  roomId: z.string().min(1).max(255),
  role: z.enum(["ADMIN", "MODERATOR", "CONTRIBUTOR"]),
});

export type organizerType = z.infer<typeof validateOrganizer>;
