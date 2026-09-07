import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { createProjectSchema } from "@/lib/validations";
import { calculateProgress } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find projects where user is owner, project member, or workspace owner/member
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: session.id },
          { members: { some: { userId: session.id } } },
          { workspace: { members: { some: { userId: session.id } } } },
        ],
      },
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
        tasks: {
          select: {
            id: true,
            status: true,
            dueDate: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const now = new Date();

    const formattedProjects = projects.map((p) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === "DONE").length;
      const overdueTasks = p.tasks.filter((t) => {
        if (!t.dueDate || t.status === "DONE") return false;
        return new Date(t.dueDate).getTime() < now.getTime();
      }).length;

      const progress = calculateProgress(completedTasks, totalTasks);

      return {
        id: p.id,
        workspaceId: p.workspaceId,
        name: p.name,
        key: p.key,
        description: p.description,
        status: p.status,
        priority: p.priority,
        startDate: p.startDate?.toISOString() || null,
        targetDate: p.targetDate?.toISOString() || null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        owner: p.owner,
        membersCount: p.members.length,
        tasksCount: totalTasks,
        completedTasksCount: completedTasks,
        overdueTasksCount: overdueTasks,
        progressPercentage: progress,
      };
    });

    return NextResponse.json({ projects: formattedProjects });
  } catch (error: any) {
    console.error("Fetch projects error:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = createProjectSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, key, description, status, priority, targetDate } = validated.data;

    // Check or find user's workspace
    let workspace = await prisma.workspace.findFirst({
      where: {
        OR: [
          { ownerId: session.id },
          { members: { some: { userId: session.id, role: { in: ["OWNER", "ADMIN"] } } } },
        ],
      },
    });

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: `${session.name}'s Workspace`,
          slug: `ws-${Date.now().toString(36)}`,
          ownerId: session.id,
        },
      });

      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: session.id,
          role: "OWNER",
        },
      });
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        key: key.toUpperCase(),
        description,
        status,
        priority,
        targetDate: targetDate ? new Date(targetDate) : null,
        workspaceId: workspace.id,
        ownerId: session.id,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    // Automatically add owner as ADMIN project member
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: session.id,
        role: "ADMIN",
      },
    });

    // Create default tags for the project
    const defaultTags = [
      { name: "Frontend", color: "#6366f1" },
      { name: "Backend", color: "#10b981" },
      { name: "Design", color: "#ec4899" },
      { name: "Bug", color: "#ef4444" },
      { name: "Urgent", color: "#f59e0b" },
    ];

    for (const tag of defaultTags) {
      await prisma.tag.create({
        data: {
          projectId: project.id,
          name: tag.name,
          color: tag.color,
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        projectId: project.id,
        userId: session.id,
        action: "PROJECT_CREATED",
        details: JSON.stringify({ name: project.name, key: project.key }),
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error: any) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
