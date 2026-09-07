import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getProjectPermissions } from "@/lib/rbac";
import { createTaskSchema } from "@/lib/validations";

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
      return NextResponse.json({ error: "Forbidden or project not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");
    const search = searchParams.get("search");
    const tagId = searchParams.get("tagId");
    const sortBy = searchParams.get("sortBy") || "orderIndex";
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "asc";

    const whereClause: any = {
      projectId,
    };

    if (status) {
      whereClause.status = status;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    if (assigneeId) {
      whereClause.assigneeId = assigneeId === "unassigned" ? null : assigneeId;
    }

    if (tagId) {
      whereClause.tags = {
        some: { tagId },
      };
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    // Determine orderBy
    let orderByClause: any = { orderIndex: "asc" };
    if (sortBy === "dueDate") {
      orderByClause = { dueDate: sortOrder };
    } else if (sortBy === "priority") {
      orderByClause = { priority: sortOrder };
    } else if (sortBy === "createdAt") {
      orderByClause = { createdAt: sortOrder };
    } else if (sortBy === "title") {
      orderByClause = { title: sortOrder };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        subtasks: {
          orderBy: { orderIndex: "asc" },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: { comments: true },
        },
        project: {
          select: { key: true },
        },
      },
      orderBy: orderByClause,
    });

    const formattedTasks = tasks.map((t) => ({
      id: t.id,
      projectId: t.projectId,
      taskNumber: t.taskNumber,
      taskKey: `${t.project.key}-${t.taskNumber}`,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      orderIndex: t.orderIndex,
      dueDate: t.dueDate?.toISOString() || null,
      estimatedHours: t.estimatedHours,
      actualHours: t.actualHours,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      creator: t.creator,
      assignee: t.assignee,
      subtasks: t.subtasks,
      commentsCount: t._count.comments,
      tags: t.tags.map((tt) => tt.tag),
    }));

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error: any) {
    console.error("Get tasks error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

export async function POST(
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
    if (!permissions.canCreateTask) {
      return NextResponse.json({ error: "Forbidden: insufficient permissions to create tasks" }, { status: 403 });
    }

    const body = await req.json();
    const validated = createTaskSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { title, description, status, priority, dueDate, estimatedHours, assigneeId, tagIds } = validated.data;

    // Run in transaction to allocate sequential taskNumber safely
    const task = await prisma.$transaction(async (tx) => {
      // Validate tags if provided and non-empty
      if (tagIds && tagIds.length > 0) {
        const count = await tx.tag.count({
          where: { id: { in: tagIds }, projectId },
        });
        if (count !== tagIds.length) {
          const error: any = new Error("One or more tags do not belong to this project");
          error.status = 400;
          throw error;
        }
      }

      // Validate assignee if provided
      if (assigneeId) {
        const member = await tx.projectMember.findFirst({
          where: { projectId, userId: assigneeId },
        });
        if (!member) {
          const error: any = new Error("Assignee is not a project member");
          error.status = 400;
          throw error;
        }
      }

      // Find highest taskNumber in this project
      const latest = await tx.task.findFirst({
        where: { projectId },
        orderBy: { taskNumber: "desc" },
        select: { taskNumber: true },
      });

      const nextNumber = (latest?.taskNumber || 0) + 1;

      // Find highest orderIndex in this status column
      const highestOrder = await tx.task.findFirst({
        where: { projectId, status },
        orderBy: { orderIndex: "desc" },
        select: { orderIndex: true },
      });

      const nextOrderIndex = (highestOrder?.orderIndex ?? 0) + 1000.0;

      const newTask = await tx.task.create({
        data: {
          projectId,
          taskNumber: nextNumber,
          title,
          description,
          status,
          priority,
          orderIndex: nextOrderIndex,
          dueDate: dueDate ? new Date(dueDate) : null,
          estimatedHours,
          creatorId: session.id,
          assigneeId: assigneeId || null,
        },
        include: {
          project: { select: { key: true } },
          creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      // Connect tags if provided
      if (tagIds && tagIds.length > 0) {
        for (const tagId of tagIds) {
          await tx.taskTag.create({
            data: {
              taskId: newTask.id,
              tagId,
            },
          });
        }
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          projectId,
          taskId: newTask.id,
          userId: session.id,
          action: "TASK_CREATED",
          details: JSON.stringify({
            title: newTask.title,
            taskKey: `${newTask.project.key}-${newTask.taskNumber}`,
            status: newTask.status,
            priority: newTask.priority,
          }),
        },
      });

      return newTask;
    });

    return NextResponse.json({
      task: {
        ...task,
        taskKey: `${task.project.key}-${task.taskNumber}`,
        subtasks: [],
        commentsCount: 0,
        tags: [],
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Create task error:", error);
    if (error.status === 400 || error.message?.includes("project member") || error.message?.includes("tags do not belong")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
