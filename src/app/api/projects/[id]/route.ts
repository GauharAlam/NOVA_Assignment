import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getProjectPermissions } from "@/lib/rbac";
import { updateProjectSchema } from "@/lib/validations";
import { calculateProgress } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = params;

    const permissions = await getProjectPermissions(projectId, session.id);
    if (!permissions.canView) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        tags: true,
        tasks: {
          select: {
            id: true,
            status: true,
            dueDate: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const now = new Date();
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;
    const overdueTasks = project.tasks.filter((t) => {
      if (!t.dueDate || t.status === "DONE") return false;
      return new Date(t.dueDate).getTime() < now.getTime();
    }).length;

    const progressPercentage = calculateProgress(completedTasks, totalTasks);

    return NextResponse.json({
      project: {
        ...project,
        tasksCount: totalTasks,
        completedTasksCount: completedTasks,
        overdueTasksCount: overdueTasks,
        progressPercentage,
      },
      permissions,
    });
  } catch (error: any) {
    console.error("Get project error:", error);
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = params;
    const permissions = await getProjectPermissions(projectId, session.id);

    // P0 SECURITY: Only OWNER and ADMIN can modify project-level settings
    // Previously used canEditTask which granted Members access (privilege escalation)
    if (permissions.role !== "OWNER" && permissions.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: only project admins can modify settings" }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateProjectSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (validated.data.name !== undefined) updateData.name = validated.data.name;
    if (validated.data.description !== undefined) updateData.description = validated.data.description;
    if (validated.data.status !== undefined) updateData.status = validated.data.status;
    if (validated.data.priority !== undefined) updateData.priority = validated.data.priority;
    if (validated.data.targetDate !== undefined) {
      updateData.targetDate = validated.data.targetDate ? new Date(validated.data.targetDate) : null;
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
    });

    await prisma.activityLog.create({
      data: {
        projectId,
        userId: session.id,
        action: "PROJECT_UPDATED",
        details: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ project: updated });
  } catch (error: any) {
    console.error("Update project error:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = params;
    const permissions = await getProjectPermissions(projectId, session.id);

    if (!permissions.canDeleteProject) {
      return NextResponse.json(
        { error: "Forbidden: Only the project owner or administrator can delete this project" },
        { status: 403 }
      );
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error: any) {
    console.error("Delete project error:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
