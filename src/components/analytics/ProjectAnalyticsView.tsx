"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  Users,
  TrendingUp,
  Activity,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatDate } from "@/lib/utils";
import { ProjectAnalytics } from "@/types";

interface ProjectAnalyticsViewProps {
  projectId: string;
}

export function ProjectAnalyticsView({ projectId }: ProjectAnalyticsViewProps) {
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/analytics`)
      .then((res) => res.json())
      .then((data) => {
        if (data.analytics) setAnalytics(data.analytics);
      })
      .catch((err) => console.error("Error loading analytics:", err))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Computing project velocity and metrics...</div>;
  }

  if (!analytics) {
    return <div className="p-12 text-center text-slate-400">Failed to load analytics data.</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 4 KPI Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Completion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Completion Rate
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-2">
            {analytics.completionRate}%
          </div>
          <ProgressBar progress={analytics.completionRate} />
        </div>

        {/* Card 2: Total Tasks */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Scope
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            {analytics.totalTasks} Tasks
          </div>
          <p className="text-xs text-slate-500">
            {analytics.completedTasks} completed
          </p>
        </div>

        {/* Card 3: In Progress */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              In Execution
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            {analytics.inProgressTasks} Tasks
          </div>
          <p className="text-xs text-slate-500">Active engineering velocity</p>
        </div>

        {/* Card 4: Overdue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Overdue Alerts
            </span>
            <div className={`p-2 rounded-xl ${analytics.overdueTasks > 0 ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black mb-1 ${analytics.overdueTasks > 0 ? "text-rose-600" : "text-slate-900"}`}>
            {analytics.overdueTasks} Tasks
          </div>
          <p className="text-xs text-slate-500">
            {analytics.overdueTasks > 0 ? "Requires urgent attention" : "All deliverables on schedule"}
          </p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Visual Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Workflow Distribution
            </h4>
            <span className="text-xs text-slate-400">By Task Status</span>
          </div>

          <div className="space-y-3 pt-2">
            {analytics.statusBreakdown.map((item) => {
              const pct = analytics.totalTasks > 0 ? Math.round((item.count / analytics.totalTasks) * 100) : 0;
              const colColors: Record<string, string> = {
                BACKLOG: "bg-slate-400",
                TODO: "bg-indigo-500",
                IN_PROGRESS: "bg-sky-500",
                IN_REVIEW: "bg-purple-500",
                DONE: "bg-emerald-500",
              };
              return (
                <div key={item.status} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 capitalize">{item.status.toLowerCase().replace("_", " ")}</span>
                    <span className="text-slate-500 font-semibold">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${colColors[item.status] || "bg-indigo-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority Distribution Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Priority Allocation
            </h4>
            <span className="text-xs text-slate-400">Severity Breakdown</span>
          </div>

          <div className="space-y-3 pt-2">
            {analytics.priorityBreakdown.map((item) => {
              const pct = analytics.totalTasks > 0 ? Math.round((item.count / analytics.totalTasks) * 100) : 0;
              const priColors: Record<string, string> = {
                URGENT: "bg-rose-500",
                HIGH: "bg-amber-500",
                MEDIUM: "bg-blue-500",
                LOW: "bg-slate-400",
              };
              return (
                <div key={item.priority} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 capitalize">{item.priority.toLowerCase()}</span>
                    <span className="text-slate-500 font-semibold">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${priColors[item.priority] || "bg-blue-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Workload Allocation & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Workload */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Team Workload & Completion
            </h4>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {analytics.assigneeWorkload.map((m) => {
              const completion = m.totalAssigned > 0 ? Math.round((m.completed / m.totalAssigned) * 100) : 0;
              return (
                <div key={m.assigneeId} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.assigneeName} avatarUrl={m.avatarUrl} size="sm" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{m.assigneeName}</p>
                      <p className="text-[11px] text-slate-400">
                        {m.completed} of {m.totalAssigned} tasks done
                      </p>
                    </div>
                  </div>

                  <div className="w-24 text-right">
                    <span className="text-xs font-bold text-slate-700">{completion}%</span>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                      <div
                        className="bg-indigo-600 h-full rounded-full"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Audit */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Audit Activity Timeline
            </h4>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {analytics.recentActivity.map((act) => (
              <div key={act.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <Avatar name={act.user.name} avatarUrl={act.user.avatarUrl} size="sm" className="w-6 h-6 text-[10px]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700">
                    <span className="font-semibold text-slate-900">{act.user.name}</span>{" "}
                    <span className="text-slate-500 font-mono text-[11px]">{act.action.toLowerCase().replace("_", " ")}</span>
                    {act.task && (
                      <span className="font-medium text-indigo-600 ml-1">
                        #{act.task.taskNumber} {act.task.title}
                      </span>
                    )}
                  </p>
                  <span className="text-[10px] text-slate-400">{formatDate(act.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
