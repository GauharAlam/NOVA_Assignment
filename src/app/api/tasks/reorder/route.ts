import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getProjectPermissions } from "@/lib/rbac";
import { z } from "zod";

const reorderSchema = z.object({
  taskId: z.string().cuid(),
  destinationStatus: z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
  destinationOrderIndex: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = reorderSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { taskId, destinationStatus, destinationOrderIndex } = validated.data;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { id: true, key: true } } },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const permissions = await getProjectPermissions(task.projectId, session.id);
    if (!permissions.canEditTask) {
      return NextResponse.json({ error: "Forbidden: viewers cannot reorder tasks" }, { status: 403 });
    }

    const statusChanged = task.status !== destinationStatus;

    const updatedTask = await prisma.$transaction(async (tx) => {
      const res = await tx.task.update({
        where: { id: taskId },
        data: {
          status: destinationStatus,
          orderIndex: destinationOrderIndex,
        },
      });

      if (statusChanged) {
        await tx.activityLog.create({
          data: {
            projectId: task.projectId,
            taskId,
            userId: session.id,
            action: "STATUS_CHANGED",
            details: JSON.stringify({
              from: task.status,
              to: destinationStatus,
              taskKey: `${task.project.key}-${task.taskNumber}`,
            }),
          },
        });
      }

      return res;
    });

    return NextResponse.json({ task: updatedTask, message: "Task position updated successfully" });
  } catch (error: any) {
    console.error("Reorder task error:", error);
    return NextResponse.json({ error: "Failed to reorder task" }, { status: 500 });
  }
}
