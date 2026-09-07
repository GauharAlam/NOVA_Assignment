export type UserRole = "SYSTEM_ADMIN" | "MEMBER";

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type ProjectRole = "ADMIN" | "MEMBER" | "VIEWER";

export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";

export type TaskStatus = "BACKLOG" | "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
}

export interface ProjectWithStats {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description?: string | null;
  status: ProjectStatus;
  priority: TaskPriority;
  startDate?: string | null;
  targetDate?: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  membersCount: number;
  tasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  progressPercentage: number;
}

export interface TaskDto {
  id: string;
  projectId: string;
  taskNumber: number;
  taskKey: string; // e.g. "NOV-4"
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  orderIndex: number;
  dueDate?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  subtasks: {
    id: string;
    title: string;
    isCompleted: boolean;
    orderIndex: number;
  }[];
  commentsCount: number;
  tags: {
    id: string;
    name: string;
    color: string;
  }[];
}

export interface CommentDto {
  id: string;
  taskId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface ActivityLogDto {
  id: string;
  projectId: string;
  taskId?: string | null;
  action: string;
  details: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  task?: {
    id: string;
    taskNumber: number;
    title: string;
  } | null;
}

export interface ProjectAnalytics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
  statusBreakdown: { status: TaskStatus; count: number }[];
  priorityBreakdown: { priority: TaskPriority; count: number }[];
  assigneeWorkload: {
    assigneeId: string;
    assigneeName: string;
    avatarUrl?: string | null;
    totalAssigned: number;
    completed: number;
  }[];
  recentActivity: ActivityLogDto[];
}
