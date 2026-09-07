import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getProjectPermissions } from "@/lib/rbac";
import { createSubtaskSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId } = params;

    // P0 SECURITY: Verify user belongs to the task's project before exposing subtasks
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const permissions = await getProjectPermissions(task.projectId, session.id);
    if (!permissions.canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const subtasks = await prisma.subtask.findMany({
      where: { taskId },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({ subtasks });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch subtasks" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId } = params;
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true },
    });

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const permissions = await getProjectPermissions(task.projectId, session.id);
    if (!permissions.canEditTask) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = createSubtaskSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: "Validation failed", details: validated.error.flatten().fieldErrors }, { status: 400 });
    }

    const count = await prisma.subtask.count({ where: { taskId } });

    const subtask = await prisma.subtask.create({
      data: {
        taskId,
        title: validated.data.title,
        orderIndex: count,
      },
    });

    return NextResponse.json({ subtask }, { status: 201 });
  } catch (error: any) {
    console.error("Create subtask error:", error);
    return NextResponse.json({ error: "Failed to create subtask" }, { status: 500 });
  }
}
