import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getProjectPermissions } from "@/lib/rbac";
import { inviteMemberSchema } from "@/lib/validations";

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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    const members = [
      {
        id: "owner",
        userId: project.owner.id,
        role: "OWNER",
        user: project.owner,
        isOwner: true,
      },
      ...project.members
        .filter((m) => m.userId !== project.ownerId)
        .map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role,
          user: m.user,
          isOwner: false,
        })),
    ];

    return NextResponse.json({ members, permissions });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = params;
    const permissions = await getProjectPermissions(projectId, session.id);
    if (!permissions.canManageMembers) {
      return NextResponse.json({ error: "Forbidden: Only admins can manage team members" }, { status: 403 });
    }

    const body = await req.json();
    const validated = inviteMemberSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json({ error: "Validation failed", details: validated.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, role } = validated.data;

    // Find the user by email
    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!targetUser) {
      return NextResponse.json({ error: `User with email "${email}" is not registered in NOVA. They must sign up first.` }, { status: 404 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (project.ownerId === targetUser.id) {
      return NextResponse.json({ error: "User is already the owner of this project" }, { status: 400 });
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "User is already a member of this project" }, { status: 409 });
    }

    const newMember = await prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUser.id,
        role,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    // Also ensure they are added to the workspace
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: targetUser.id,
        },
      },
      create: {
        workspaceId: project.workspaceId,
        userId: targetUser.id,
        role: "MEMBER",
      },
      update: {},
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        projectId,
        userId: session.id,
        action: "MEMBER_ADDED",
        details: JSON.stringify({ name: targetUser.name, email: targetUser.email, role }),
      },
    });

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error: any) {
    console.error("Add member error:", error);
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = params;
    const permissions = await getProjectPermissions(projectId, session.id);
    if (!permissions.canManageMembers) {
      return NextResponse.json({ error: "Forbidden: Only admins can remove members" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userIdToRemove = searchParams.get("userId");

    if (!userIdToRemove) {
      return NextResponse.json({ error: "userId parameter is required" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

    if (project.ownerId === userIdToRemove) {
      return NextResponse.json({ error: "Cannot remove project owner" }, { status: 400 });
    }

    // Remove member
    await prisma.projectMember.deleteMany({
      where: {
        projectId,
        userId: userIdToRemove,
      },
    });

    // Set any tasks assigned to this user to unassigned (NULL)
    await prisma.task.updateMany({
      where: {
        projectId,
        assigneeId: userIdToRemove,
      },
      data: {
        assigneeId: null,
      },
    });

    await prisma.activityLog.create({
      data: {
        projectId,
        userId: session.id,
        action: "MEMBER_REMOVED",
        details: JSON.stringify({ removedUserId: userIdToRemove }),
      },
    });

    return NextResponse.json({ message: "Member removed and tasks safely unassigned" });
  } catch (error: any) {
    console.error("Remove member error:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
