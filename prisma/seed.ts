import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding NOVA database...");

  // Clean existing records in cascade
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.taskTag.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      email: "admin@nova.dev",
      name: "Alex Rivers",
      passwordHash,
      role: "SYSTEM_ADMIN",
      avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Alex%20Rivers&backgroundColor=4f46e5",
    },
  });

  const dev = await prisma.user.create({
    data: {
      email: "dev@nova.dev",
      name: "Sarah Chen",
      passwordHash,
      role: "MEMBER",
      avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Sarah%20Chen&backgroundColor=059669",
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: "viewer@nova.dev",
      name: "Marcus Vance",
      passwordHash,
      role: "MEMBER",
      avatarUrl: "https://api.dicebear.com/7.x/initials/svg?seed=Marcus%20Vance&backgroundColor=d97706",
    },
  });

  console.log("✅ Created 3 users: admin@nova.dev, dev@nova.dev, viewer@nova.dev (password: password123)");

  // 2. Create Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Acme Engineering",
      slug: "acme-engineering",
      ownerId: admin.id,
    },
  });

  await prisma.workspaceMember.createMany({
    data: [
      { workspaceId: workspace.id, userId: admin.id, role: "OWNER" },
      { workspaceId: workspace.id, userId: dev.id, role: "MEMBER" },
      { workspaceId: workspace.id, userId: viewer.id, role: "VIEWER" },
    ],
  });

  console.log("✅ Created workspace: Acme Engineering");

  // 3. Create Project 1: Nova Core Platform
  const now = new Date();
  const targetDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks out
  const overdueDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

  const project1 = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Nova Core Platform (Q3 Launch)",
      key: "NOV",
      description: "Next-generation team productivity platform with real-time Kanban, analytics, and collaboration workflows.",
      status: "ACTIVE",
      priority: "HIGH",
      startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      targetDate,
      ownerId: admin.id,
    },
  });

  await prisma.projectMember.createMany({
    data: [
      { projectId: project1.id, userId: admin.id, role: "ADMIN" },
      { projectId: project1.id, userId: dev.id, role: "MEMBER" },
      { projectId: project1.id, userId: viewer.id, role: "VIEWER" },
    ],
  });

  // Create Tags for Project 1
  const tagFrontend = await prisma.tag.create({
    data: { projectId: project1.id, name: "Frontend", color: "#6366f1" },
  });
  const tagBackend = await prisma.tag.create({
    data: { projectId: project1.id, name: "Backend", color: "#10b981" },
  });
  const tagDesign = await prisma.tag.create({
    data: { projectId: project1.id, name: "Design", color: "#ec4899" },
  });
  const tagBug = await prisma.tag.create({
    data: { projectId: project1.id, name: "Bug", color: "#ef4444" },
  });
  const tagPerf = await prisma.tag.create({
    data: { projectId: project1.id, name: "Performance", color: "#f59e0b" },
  });

  // Create Tasks for Project 1
  // Task 1: Done
  const task1 = await prisma.task.create({
    data: {
      projectId: project1.id,
      taskNumber: 1,
      title: "Design Relational Database Architecture & Prisma Schema",
      description: "Define comprehensive entity relationships for Users, Workspaces, Projects, Tasks, Subtasks, Comments, and Activity logs with foreign keys and cascade deletions.",
      status: "DONE",
      priority: "HIGH",
      orderIndex: 1000.0,
      dueDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      estimatedHours: 8,
      actualHours: 6,
      creatorId: admin.id,
      assigneeId: dev.id,
    },
  });
  await prisma.taskTag.create({ data: { taskId: task1.id, tagId: tagBackend.id } });
  await prisma.subtask.createMany({
    data: [
      { taskId: task1.id, title: "Draft ERD diagram in Mermaid", isCompleted: true, orderIndex: 0 },
      { taskId: task1.id, title: "Create Prisma schema definitions", isCompleted: true, orderIndex: 1 },
      { taskId: task1.id, title: "Verify SQLite & PostgreSQL compatibility", isCompleted: true, orderIndex: 2 },
    ],
  });
  await prisma.comment.create({
    data: {
      taskId: task1.id,
      authorId: admin.id,
      content: "Excellent work on the schema! Fractional indexing on orderIndex is a great touch.",
    },
  });

  // Task 2: Done
  const task2 = await prisma.task.create({
    data: {
      projectId: project1.id,
      taskNumber: 2,
      title: "Implement Secure JWT Session Authentication with HttpOnly Cookies",
      description: "Build register, login, demo-login, and auth/me endpoints with bcrypt password hashing and defensive error handling.",
      status: "DONE",
      priority: "HIGH",
      orderIndex: 2000.0,
      dueDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      estimatedHours: 6,
      actualHours: 5,
      creatorId: admin.id,
      assigneeId: admin.id,
    },
  });
  await prisma.taskTag.create({ data: { taskId: task2.id, tagId: tagBackend.id } });

  // Task 3: In Review
  const task3 = await prisma.task.create({
    data: {
      projectId: project1.id,
      taskNumber: 3,
      title: "Build Interactive Drag-and-Drop Kanban Board with Optimistic UI",
      description: "Implement fluid drag & drop across Backlog, To Do, In Progress, In Review, and Done columns with immediate UI feedback and batch reorder API sync.",
      status: "IN_REVIEW",
      priority: "URGENT",
      orderIndex: 1000.0,
      dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
      estimatedHours: 12,
      actualHours: 10,
      creatorId: admin.id,
      assigneeId: dev.id,
    },
  });
  await prisma.taskTag.createMany({
    data: [
      { taskId: task3.id, tagId: tagFrontend.id },
      { taskId: task3.id, tagId: tagDesign.id },
    ],
  });
  await prisma.subtask.createMany({
    data: [
      { taskId: task3.id, title: "Create KanbanColumn container and card preview", isCompleted: true, orderIndex: 0 },
      { taskId: task3.id, title: "Add dragover hover cues and drop indicator", isCompleted: true, orderIndex: 1 },
      { taskId: task3.id, title: "Implement optimistic rollback on network error", isCompleted: true, orderIndex: 2 },
      { taskId: task3.id, title: "Review UX transitions with Marcus", isCompleted: false, orderIndex: 3 },
    ],
  });
  await prisma.comment.create({
    data: {
      taskId: task3.id,
      authorId: dev.id,
      content: "Board is ready for review! Added keyboard-friendly move buttons as an accessible alternative to dragging.",
    },
  });

  // Task 4: In Progress
  const task4 = await prisma.task.create({
    data: {
      projectId: project1.id,
      taskNumber: 4,
      title: "Real-time Task Detail Drawer with Markdown & Comments",
      description: "Allow users to view/edit task descriptions with markdown preview, manage subtasks checklist, and participate in threaded discussions.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      orderIndex: 1000.0,
      dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      estimatedHours: 8,
      actualHours: 4,
      creatorId: dev.id,
      assigneeId: dev.id,
    },
  });
  await prisma.taskTag.create({ data: { taskId: task4.id, tagId: tagFrontend.id } });

  // Task 5: In Progress (Overdue example for alert testing!)
  const task5 = await prisma.task.create({
    data: {
      projectId: project1.id,
      taskNumber: 5,
      title: "Fix Mobile Viewport Horizontal Scrolling on Narrow Screens",
      description: "Audit responsive breakpoints on iPhone and Android screens so Kanban board columns scroll smoothly horizontally without clipping the navigation header.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      orderIndex: 2000.0,
      dueDate: overdueDate, // Intentional overdue to show warning badge
      estimatedHours: 4,
      actualHours: 2,
      creatorId: admin.id,
      assigneeId: dev.id,
    },
  });
  await prisma.taskTag.createMany({
    data: [
      { taskId: task5.id, tagId: tagBug.id },
      { taskId: task5.id, tagId: tagFrontend.id },
    ],
  });

  // Task 6: To Do
  const task6 = await prisma.task.create({
    data: {
      projectId: project1.id,
      taskNumber: 6,
      title: "Project Progress Analytics & Workload Distribution Charts",
      description: "Create visual KPI cards and charts: task status breakdown, priority distribution, and team member workload allocation.",
      status: "TODO",
      priority: "MEDIUM",
      orderIndex: 1000.0,
      dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      estimatedHours: 6,
      creatorId: admin.id,
      assigneeId: admin.id,
    },
  });
  await prisma.taskTag.create({ data: { taskId: task6.id, tagId: tagFrontend.id } });

  // Task 7: To Do
  const task7 = await prisma.task.create({
    data: {
      projectId: project1.id,
      taskNumber: 7,
      title: "Role-Based Access Control (RBAC) UI and API Protection",
      description: "Ensure Viewers cannot edit tasks, drag cards, or alter settings. Provide clear feedback when permissions are restricted.",
      status: "TODO",
      priority: "HIGH",
      orderIndex: 2000.0,
      dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      estimatedHours: 5,
      creatorId: admin.id,
      assigneeId: admin.id,
    },
  });
  await prisma.taskTag.create({ data: { taskId: task7.id, tagId: tagBackend.id } });

  // Task 8: Backlog
  const task8 = await prisma.task.create({
    data: {
      projectId: project1.id,
      taskNumber: 8,
      title: "Integrate WebSocket for Multi-User Live Cursor & Instant Broadcast",
      description: "Investigate socket.io or Server-Sent Events (SSE) for instant card movements when multiple team members view the board simultaneously.",
      status: "BACKLOG",
      priority: "LOW",
      orderIndex: 1000.0,
      estimatedHours: 16,
      creatorId: dev.id,
    },
  });
  await prisma.taskTag.create({ data: { taskId: task8.id, tagId: tagPerf.id } });

  // Task 9: Backlog
  const task9 = await prisma.task.create({
    data: {
      projectId: project1.id,
      taskNumber: 9,
      title: "Automated Slack & Email Notification Webhooks",
      description: "Send alert digests when tasks are assigned or high-priority issues become overdue.",
      status: "BACKLOG",
      priority: "LOW",
      orderIndex: 2000.0,
      estimatedHours: 8,
      creatorId: admin.id,
    },
  });

  // Project 2: Mobile Companion App
  const project2 = await prisma.project.create({
    data: {
      workspaceId: workspace.id,
      name: "Mobile Companion App (iOS & Android)",
      key: "MOB",
      description: "Cross-platform mobile application for quick task capture and notifications.",
      status: "PLANNING",
      priority: "MEDIUM",
      startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      targetDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      ownerId: admin.id,
    },
  });

  await prisma.projectMember.createMany({
    data: [
      { projectId: project2.id, userId: admin.id, role: "ADMIN" },
      { projectId: project2.id, userId: dev.id, role: "MEMBER" },
    ],
  });

  await prisma.task.create({
    data: {
      projectId: project2.id,
      taskNumber: 1,
      title: "Evaluate React Native Expo vs Flutter for Companion App",
      description: "Conduct technical spike on battery consumption, offline sync, and push notification reliability.",
      status: "TODO",
      priority: "HIGH",
      orderIndex: 1000.0,
      creatorId: admin.id,
      assigneeId: dev.id,
    },
  });

  // Initial Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        projectId: project1.id,
        taskId: task1.id,
        userId: dev.id,
        action: "STATUS_CHANGED",
        details: JSON.stringify({ from: "IN_PROGRESS", to: "DONE", taskKey: "NOV-1" }),
      },
      {
        projectId: project1.id,
        taskId: task3.id,
        userId: dev.id,
        action: "STATUS_CHANGED",
        details: JSON.stringify({ from: "IN_PROGRESS", to: "IN_REVIEW", taskKey: "NOV-3" }),
      },
      {
        projectId: project1.id,
        taskId: task4.id,
        userId: admin.id,
        action: "ASSIGNEE_CHANGED",
        details: JSON.stringify({ from: null, to: dev.id }),
      },
      {
        projectId: project1.id,
        userId: admin.id,
        action: "PROJECT_CREATED",
        details: JSON.stringify({ name: project1.name, key: project1.key }),
      },
    ],
  });

  console.log("✅ Seeded 2 projects with 10 tasks, subtasks, tags, comments, and activity logs!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
