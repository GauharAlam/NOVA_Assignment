import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getProjectPermissions } from "@/lib/rbac";
import { updateTaskSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          select: { id: true, name: true, key: true, ownerId: true },
        },
        creator: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        subtasks: {
          orderBy: { orderIndex: "asc" },
        },
        comments: {
          include: {
            author: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        tags: {
          include: { tag: true },
        },
        activityLogs: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const permissions = await getProjectPermissions(task.projectId, session.id);
    if (!permissions.canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      task: {
        ...task,
        taskKey: `${task.project.key}-${task.taskNumber}`,
        tags: task.tags.map((tt) => tt.tag),
        commentsCount: task.comments.length,
      },
      permissions,
    });
  } catch (error: any) {
    console.error("Get task detail error:", error);
    return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = params;

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { select: { id: true, key: true } } },
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const permissions = await getProjectPermissions(existingTask.projectId, session.id);
    if (!permissions.canEditTask) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions to edit task" }, { status: 403 });
    }

    const body = await req.json();
    const validated = updateTaskSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updateData: any = {};
    const activityEvents: { action: string; details: any }[] = [];

    if (validated.data.title !== undefined) updateData.title = validated.data.title;
    if (validated.data.description !== undefined) updateData.description = validated.data.description;
    if (validated.data.priority !== undefined && validated.data.priority !== existingTask.priority) {
      updateData.priority = validated.data.priority;
      activityEvents.push({
        action: "PRIORITY_CHANGED",
        details: { from: existingTask.priority, to: validated.data.priority },
      });
    }
    if (validated.data.status !== undefined && validated.data.status !== existingTask.status) {
      updateData.status = validated.data.status;
      activityEvents.push({
        action: "STATUS_CHANGED",
        details: { from: existingTask.status, to: validated.data.status },
      });
    }
    if (validated.data.orderIndex !== undefined) updateData.orderIndex = validated.data.orderIndex;
    if (validated.data.dueDate !== undefined) {
      updateData.dueDate = validated.data.dueDate ? new Date(validated.data.dueDate) : null;
    }
    if (validated.data.estimatedHours !== undefined) updateData.estimatedHours = validated.data.estimatedHours;
    if (validated.data.actualHours !== undefined) updateData.actualHours = validated.data.actualHours;
    if (validated.data.assigneeId !== undefined && validated.data.assigneeId !== existingTask.assigneeId) {
      updateData.assigneeId = validated.data.assigneeId;
      activityEvents.push({
        action: "ASSIGNEE_CHANGED",
        details: { from: existingTask.assigneeId, to: validated.data.assigneeId },
      });
    }

    const refetchedTask = await prisma.$transaction(async (tx) => {
      // Validate tags if tagIds array is provided
      if (validated.data.tagIds && validated.data.tagIds.length > 0) {
        const count = await tx.tag.count({
          where: { id: { in: validated.data.tagIds }, projectId: existingTask.projectId },
        });
        if (count !== validated.data.tagIds.length) {
          const error: any = new Error("One or more tags do not belong to this project");
          error.status = 400;
          throw error;
        }
      }

      // Validate assignee is a project member if provided
      if (validated.data.assigneeId) {
        const member = await tx.projectMember.findFirst({
          where: { projectId: existingTask.projectId, userId: validated.data.assigneeId },
        });
        if (!member) {
          const error: any = new Error("Assignee is not a project member");
          error.status = 400;
          throw error;
        }
      }

      await tx.task.update({
        where: { id: taskId },
        data: updateData,
      });

      // Update tags if provided
      if (validated.data.tagIds !== undefined) {
        await tx.taskTag.deleteMany({ where: { taskId } });
        for (const tagId of validated.data.tagIds) {
          await tx.taskTag.create({
            data: { taskId, tagId },
          });
        }
      }

      // Record any activity logs
      for (const event of activityEvents) {
        await tx.activityLog.create({
          data: {
            projectId: existingTask.projectId,
            taskId,
            userId: session.id,
            action: event.action,
            details: JSON.stringify(event.details),
          },
        });
      }

      // Re-fetch the task with tags before returning
      const task = await tx.task.findUnique({
        where: { id: taskId },
        include: {
          project: { select: { key: true } },
          creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
          subtasks: true,
          tags: { include: { tag: true } },
        },
      });

      return task;
    });

    if (!refetchedTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
      task: {
        ...refetchedTask,
        taskKey: `${refetchedTask.project.key}-${refetchedTask.taskNumber}`,
        tags: refetchedTask.tags.map((tt) => tt.tag),
      },
    });
  } catch (error: any) {
    console.error("Update task error:", error);
    if (error.status === 400 || error.message?.includes("project member") || error.message?.includes("tags do not belong")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true, creatorId: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const permissions = await getProjectPermissions(task.projectId, session.id);
    const isCreator = task.creatorId === session.id;

    if (!permissions.canDeleteTask && !isCreator) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions to delete task" }, { status: 403 });
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error: any) {
    console.error("Delete task error:", error);
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
  }
}
