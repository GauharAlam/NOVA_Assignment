import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getProjectPermissions } from "@/lib/rbac";
import { calculateProgress, isOverdue } from "@/lib/utils";
import { TaskPriority, TaskStatus } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = params;
    const permissions = await getProjectPermissions(projectId, session.id);
    if (!permissions.canView) {
      return NextResponse.json({ error: "Forbidden or not found" }, { status: 404 });
    }

    const tasks = await prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    const projectMembers = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    const allMembers = [
      ...(project?.owner ? [project.owner] : []),
      ...projectMembers.map((pm) => pm.user),
    ];
    // Deduplicate members by id
    const uniqueMembers = Array.from(new Map(allMembers.map((m) => [m.id, m])).values());

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "DONE").length;
    const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const overdueTasks = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
    const completionRate = calculateProgress(completedTasks, totalTasks);

    const statuses: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
    const statusBreakdown = statuses.map((status) => ({
      status,
      count: tasks.filter((t) => t.status === status).length,
    }));

    const priorities: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];
    const priorityBreakdown = priorities.map((priority) => ({
      priority,
      count: tasks.filter((t) => t.priority === priority).length,
    }));

    const assigneeWorkload = uniqueMembers.map((member) => {
      const assigned = tasks.filter((t) => t.assigneeId === member.id);
      return {
        assigneeId: member.id,
        assigneeName: member.name,
        avatarUrl: member.avatarUrl,
        totalAssigned: assigned.length,
        completed: assigned.filter((t) => t.status === "DONE").length,
      };
    });

    // Also include unassigned count if any
    const unassignedTasks = tasks.filter((t) => !t.assigneeId);
    if (unassignedTasks.length > 0) {
      assigneeWorkload.push({
        assigneeId: "unassigned",
        assigneeName: "Unassigned",
        avatarUrl: null,
        totalAssigned: unassignedTasks.length,
        completed: unassignedTasks.filter((t) => t.status === "DONE").length,
      });
    }

    const recentActivity = await prisma.activityLog.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        task: { select: { id: true, taskNumber: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      analytics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        completionRate,
        statusBreakdown,
        priorityBreakdown,
        assigneeWorkload,
        recentActivity,
      },
    });
  } catch (error: any) {
    console.error("Get analytics error:", error);
    return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 });
  }
}
