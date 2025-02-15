import { z } from "zod";

export const validateUser = z.object({
  username: z.string().min(1).max(255),
  email: z.string().email(),
  clerkId: z.string().min(1).max(255),
  profileImage: z.string().min(1).max(255),
});

export type userType = z.infer<typeof validateUser>;

//roomName, roomImage, roomDescription, coverImage, category

export const validateRoom = z.object({
  roomName: z.string().min(1).max(255),
  roomDescription: z.string().min(1),
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

export const validateContent = z.object({
  title: z.string().min(1).max(255),
  textContent: z.string().min(1).max(255),
  userId: z.string().min(1).max(255),
  moduleId: z.string().min(1).max(255),
  status: z.enum(["private", "public"]),
  isDiscussion: z.string(),
});

export type contentType = z.infer<typeof validateContent>;

//userId, contentId, comment

export const validateComment = z.object({
  userId: z.string().min(1).max(255),
  comment: z.string().min(1).max(255),
  contentId: z.string().min(1).max(255),
});

export type commentType = z.infer<typeof validateComment>;

//roomId, title, position, description, userId

export const validateCourseModule = z.object({
  userId: z.string().min(1).max(255),
  roomId: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  position: z.number(),
  description: z.string().optional(),
});

export type moduleType = z.infer<typeof validateCourseModule>;
