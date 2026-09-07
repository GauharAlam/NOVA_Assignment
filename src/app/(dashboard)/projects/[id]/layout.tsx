import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import {
  KanbanSquare,
  ListTodo,
  BarChart3,
  Settings,
  Calendar,
  Layers,
  Shield,
  Eye,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProjectPermissions } from "@/lib/rbac";
import { getProjectStatusColor, getPriorityBadgeColor, formatDate } from "@/lib/utils";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const { id: projectId } = params;

  const permissions = await getProjectPermissions(projectId, session.id);
  if (!permissions.canView) {
    notFound();
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

  if (!project) notFound();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Project Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                {project.key}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${getProjectStatusColor(project.status)}`}>
                {project.status}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${getPriorityBadgeColor(project.priority)}`}>
                {project.priority}
              </span>

              {permissions.role === "VIEWER" && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Viewer Mode
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                {project.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 self-start md:self-auto">
            {project.targetDate && (
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Target: {formatDate(project.targetDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
          <Link
            href={`/projects/${projectId}/board`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shrink-0"
          >
            <KanbanSquare className="w-4 h-4" />
            Kanban Board
          </Link>

          <Link
            href={`/projects/${projectId}/list`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shrink-0"
          >
            <ListTodo className="w-4 h-4" />
            Task List
          </Link>

          <Link
            href={`/projects/${projectId}/analytics`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shrink-0"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics & Velocity
          </Link>

          <Link
            href={`/projects/${projectId}/settings`}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors shrink-0"
          >
            <Settings className="w-4 h-4" />
            Team & Settings
          </Link>
        </div>
      </div>

      {/* Tab Page Content */}
      <div>{children}</div>
    </div>
  );
}
