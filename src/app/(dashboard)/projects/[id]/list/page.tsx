import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectPermissions } from "@/lib/rbac";
import { TaskListView } from "@/components/list/TaskListView";
import { TaskDto } from "@/types";

export default async function ProjectListPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const { id: projectId } = params;
  const permissions = await getProjectPermissions(projectId, session.id);
  if (!permissions.canView) notFound();

  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: {
      creator: { select: { id: true, name: true, email: true, avatarUrl: true } },
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      subtasks: { orderBy: { orderIndex: "asc" } },
      tags: { include: { tag: true } },
      _count: { select: { comments: true } },
      project: { select: { key: true } },
    },
    orderBy: { taskNumber: "asc" },
  });

  const projectMembers = await prisma.projectMember.findMany({
    where: { projectId },
    include: {
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });

  const allMembers = [
    ...(project?.owner ? [{ userId: project.owner.id, user: project.owner, role: "OWNER" }] : []),
    ...projectMembers.map((pm) => ({ userId: pm.userId, user: pm.user, role: pm.role })),
  ];

  const uniqueMembers = Array.from(new Map(allMembers.map((m) => [m.userId, m])).values());

  const formattedTasks: TaskDto[] = tasks.map((t) => ({
    id: t.id,
    projectId: t.projectId,
    taskNumber: t.taskNumber,
    taskKey: `${t.project.key}-${t.taskNumber}`,
    title: t.title,
    description: t.description,
    status: t.status as any,
    priority: t.priority as any,
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

  return (
    <TaskListView
      projectId={projectId}
      initialTasks={formattedTasks}
      projectMembers={uniqueMembers}
      canEdit={permissions.canEditTask}
    />
  );
}
