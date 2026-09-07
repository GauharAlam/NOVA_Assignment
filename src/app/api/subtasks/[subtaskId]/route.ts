import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getProjectPermissions } from "@/lib/rbac";
import { updateSubtaskSchema } from "@/lib/validations";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { subtaskId: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subtaskId } = params;
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: { task: { select: { projectId: true } } },
    });

    if (!subtask) return NextResponse.json({ error: "Subtask not found" }, { status: 404 });

    const permissions = await getProjectPermissions(subtask.task.projectId, session.id);
    if (!permissions.canEditTask) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateSubtaskSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const updated = await prisma.subtask.update({
      where: { id: subtaskId },
      data: validated.data,
    });

    return NextResponse.json({ subtask: updated });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update subtask" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { subtaskId: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subtaskId } = params;
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: { task: { select: { projectId: true } } },
    });

    if (!subtask) return NextResponse.json({ error: "Subtask not found" }, { status: 404 });

    const permissions = await getProjectPermissions(subtask.task.projectId, session.id);
    if (!permissions.canEditTask) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.subtask.delete({ where: { id: subtaskId } });
    return NextResponse.json({ message: "Subtask deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to delete subtask" }, { status: 500 });
  }
}
