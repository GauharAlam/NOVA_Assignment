import Link from "next/link";
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingUp,
  Plus,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import {
  calculateProgress,
  formatShortDate,
  getPriorityBadgeColor,
  getProjectStatusColor,
  isOverdue,
} from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getSessionUser();
  if (!session) return null;

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { ownerId: session.id },
        { members: { some: { userId: session.id } } },
        { workspace: { members: { some: { userId: session.id } } } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
      members: true,
      tasks: {
        select: {
          id: true,
          status: true,
          dueDate: true,
          priority: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const now = new Date();
  let totalTasks = 0;
  let completedTasks = 0;
  let overdueTasks = 0;

  const projectStats = projects.map((p) => {
    const tasksCount = p.tasks.length;
    const compCount = p.tasks.filter((t) => t.status === "DONE").length;
    const overCount = p.tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;
    const progress = calculateProgress(compCount, tasksCount);

    totalTasks += tasksCount;
    completedTasks += compCount;
    overdueTasks += overCount;

    return {
      ...p,
      tasksCount,
      completedTasksCount: compCount,
      overdueTasksCount: overCount,
      progressPercentage: progress,
    };
  });

  const overallProgress = calculateProgress(completedTasks, totalTasks);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome back, {session.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here is the high-level pulse of your active projects and deliverables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-500/20 transition-all"
          >
            <FolderKanban className="w-4 h-4" />
            View All Projects
          </Link>
        </div>
      </div>

      {/* 4 Portfolio KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Projects
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{projects.length}</div>
          <p className="text-xs text-slate-400 mt-1">Active workspaces</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Tasks
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalTasks}</div>
          <p className="text-xs text-slate-400 mt-1">{completedTasks} completed</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Overall Progress
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-2">{overallProgress}%</div>
          <ProgressBar progress={overallProgress} />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Overdue Tasks
            </span>
            <div className={`p-2 rounded-xl ${overdueTasks > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${overdueTasks > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {overdueTasks}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {overdueTasks > 0 ? "Action required" : "On schedule"}
          </p>
        </div>
      </div>

      {/* Active Projects Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
            Your Projects ({projects.length})
          </h3>
          <Link
            href="/projects"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Manage Projects <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projectStats.map((p) => (
            <div
              key={p.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {p.key}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${getProjectStatusColor(p.status)}`}>
                      {p.status}
                    </span>
                  </div>

                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase ${getPriorityBadgeColor(p.priority)}`}>
                    {p.priority}
                  </span>
                </div>

                <Link href={`/projects/${p.id}/board`}>
                  <h4 className="text-lg font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                    {p.name}
                  </h4>
                </Link>
                {p.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
                <ProgressBar progress={p.progressPercentage} showText />

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>{p.tasksCount} total tasks ({p.completedTasksCount} done)</span>
                  {p.overdueTasksCount > 0 && (
                    <span className="text-rose-600 font-bold">{p.overdueTasksCount} overdue</span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Link
                    href={`/projects/${p.id}/board`}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    Open Kanban Board
                  </Link>
                  <Link
                    href={`/projects/${p.id}/analytics`}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Velocity Metrics
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {projects.length === 0 && (
            <div className="col-span-2 text-center p-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <FolderKanban className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No Projects Found</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Get started by creating your first project workspace.
              </p>
              <Link
                href="/projects"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                Create Project
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
