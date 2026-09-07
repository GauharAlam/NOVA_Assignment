import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TaskPriority, TaskStatus, ProjectStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isOverdue(dueDate: string | Date | null | undefined, status: string): boolean {
  if (!dueDate || status === "DONE") return false;
  const due = new Date(dueDate);
  const now = new Date();
  // Set to end of day in local timezone
  due.setHours(23, 59, 59, 999);
  return due.getTime() < now.getTime();
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "No date";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(date: string | Date | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function calculateProgress(completed: number, total: number): number {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

export function getPriorityBadgeColor(priority: TaskPriority | string) {
  switch (priority) {
    case "URGENT":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900";
    case "HIGH":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900";
    case "MEDIUM":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900";
    case "LOW":
    default:
      return "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700";
  }
}

export function getStatusBadgeColor(status: TaskStatus | string) {
  switch (status) {
    case "DONE":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900";
    case "IN_REVIEW":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900";
    case "IN_PROGRESS":
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900";
    case "TODO":
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900";
    case "BACKLOG":
    default:
      return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
  }
}

export function getProjectStatusColor(status: ProjectStatus | string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "PLANNING":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "ON_HOLD":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "COMPLETED":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "ARCHIVED":
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export const KANBAN_COLUMNS: { id: TaskStatus; title: string; color: string }[] = [
  { id: "BACKLOG", title: "Backlog", color: "bg-slate-400" },
  { id: "TODO", title: "To Do", color: "bg-indigo-500" },
  { id: "IN_PROGRESS", title: "In Progress", color: "bg-sky-500" },
  { id: "IN_REVIEW", title: "In Review", color: "bg-purple-500" },
  { id: "DONE", title: "Done", color: "bg-emerald-500" },
];
