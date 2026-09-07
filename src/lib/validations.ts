import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name cannot exceed 60 characters"),
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(100, "Password cannot exceed 100 characters"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Project name must be at least 2 characters").max(100, "Project name cannot exceed 100 characters"),
  key: z.string().trim().min(2, "Key must be 2 to 6 characters").max(6, "Key must be 2 to 6 characters").regex(/^[A-Z0-9]+$/, "Key must be uppercase alphanumeric (e.g. NOV, CORE)"),
  description: z.string().trim().max(1000, "Description cannot exceed 1000 characters").optional().nullable(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).default("ACTIVE"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  targetDate: z.string().datetime().optional().nullable(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(200, "Task title cannot exceed 200 characters"),
  description: z.string().trim().max(10000, "Description cannot exceed 10,000 characters").optional().nullable(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().int().min(0).max(1000).optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
  tagIds: z.array(z.string().cuid()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(10000).optional().nullable(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  orderIndex: z.number().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  estimatedHours: z.number().int().min(0).max(1000).optional().nullable(),
  actualHours: z.number().int().min(0).max(1000).optional().nullable(),
  assigneeId: z.string().cuid().optional().nullable(),
  tagIds: z.array(z.string().cuid()).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty").max(2000, "Comment cannot exceed 2000 characters"),
});

export const createSubtaskSchema = z.object({
  title: z.string().trim().min(1, "Subtask title cannot be empty").max(200, "Subtask title cannot exceed 200 characters"),
});

export const updateSubtaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  isCompleted: z.boolean().optional(),
  orderIndex: z.number().int().optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().email("Invalid email format").toLowerCase(),
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});
