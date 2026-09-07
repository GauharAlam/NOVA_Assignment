import { prisma } from "./prisma";
import { ProjectRole } from "@/types";

export interface ProjectPermission {
  isMember: boolean;
  role: ProjectRole | "OWNER" | null;
  canView: boolean;
  canCreateTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canManageMembers: boolean;
  canDeleteProject: boolean;
}

export async function getProjectPermissions(
  projectId: string,
  userId: string
): Promise<ProjectPermission> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        where: { userId },
      },
    },
  });

  if (!project) {
    return {
      isMember: false,
      role: null,
      canView: false,
      canCreateTask: false,
      canEditTask: false,
      canDeleteTask: false,
      canManageMembers: false,
      canDeleteProject: false,
    };
  }

  // Owner has full power
  if (project.ownerId === userId) {
    return {
      isMember: true,
      role: "OWNER",
      canView: true,
      canCreateTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canManageMembers: true,
      canDeleteProject: true,
    };
  }

  const membership = project.members[0];
  if (!membership) {
    // Check if user is workspace owner or admin
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: project.workspaceId,
        userId,
      },
    });

    if (workspaceMember && (workspaceMember.role === "OWNER" || workspaceMember.role === "ADMIN")) {
      return {
        isMember: true,
        role: "ADMIN",
        canView: true,
        canCreateTask: true,
        canEditTask: true,
        canDeleteTask: true,
        canManageMembers: true,
        canDeleteProject: true,
      };
    }

    return {
      isMember: false,
      role: null,
      canView: false,
      canCreateTask: false,
      canEditTask: false,
      canDeleteTask: false,
      canManageMembers: false,
      canDeleteProject: false,
    };
  }

  const role = membership.role as ProjectRole;

  switch (role) {
    case "ADMIN":
      return {
        isMember: true,
        role: "ADMIN",
        canView: true,
        canCreateTask: true,
        canEditTask: true,
        canDeleteTask: true,
        canManageMembers: true,
        canDeleteProject: false, // Only owner can delete project
      };
    case "MEMBER":
      return {
        isMember: true,
        role: "MEMBER",
        canView: true,
        canCreateTask: true,
        canEditTask: true,
        canDeleteTask: true,
        canManageMembers: false,
        canDeleteProject: false,
      };
    case "VIEWER":
    default:
      return {
        isMember: true,
        role: "VIEWER",
        canView: true,
        canCreateTask: false,
        canEditTask: false,
        canDeleteTask: false,
        canManageMembers: false,
        canDeleteProject: false,
      };
  }
}
