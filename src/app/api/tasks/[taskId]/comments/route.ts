import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getProjectPermissions } from "@/lib/rbac";
import { createCommentSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId } = params;

    // P0 SECURITY: Verify user belongs to the task's project before exposing comments
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const permissions = await getProjectPermissions(task.projectId, session.id);
    if (!permissions.canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        author: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ comments });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
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
      select: { id: true, projectId: true, taskNumber: true, project: { select: { key: true } } },
    });

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const permissions = await getProjectPermissions(task.projectId, session.id);
    if (!permissions.canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = createCommentSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: "Validation failed", details: validated.error.flatten().fieldErrors }, { status: 400 });
    }

    const comment = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: {
          taskId,
          authorId: session.id,
          content: validated.data.content,
        },
        include: {
          author: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      await tx.activityLog.create({
        data: {
          projectId: task.projectId,
          taskId,
          userId: session.id,
          action: "COMMENT_ADDED",
          details: JSON.stringify({
            preview: validated.data.content.slice(0, 50),
            taskKey: `${task.project.key}-${task.taskNumber}`,
          }),
        },
      });

      return newComment;
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    console.error("Create comment error:", error);
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
  }
}
