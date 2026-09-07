"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  KanbanSquare,
  ListTodo,
  BarChart3,
  Settings,
  Plus,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

interface SidebarProps {
  currentProjectId?: string;
  userRole?: string;
}

export function Sidebar({ currentProjectId, userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.projects) setProjects(data.projects);
      })
      .catch(() => {});
  }, [currentProjectId]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          key: key.toUpperCase(),
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create project");
        return;
      }

      setIsCreateOpen(false);
      setName("");
      setKey("");
      setDescription("");
      router.push(`/projects/${data.project.id}/board`);
      router.refresh();
    } catch {
      setError("Network error creating project");
    } finally {
      setCreating(false);
    }
  };

  const autoGenerateKey = (val: string) => {
    setName(val);
    if (!key || key.length <= 4) {
      const words = val.trim().split(" ");
      if (words.length >= 2) {
        setKey((words[0][0] + words[1][0] + (words[2]?.[0] || "")).toUpperCase().slice(0, 4));
      } else if (words[0].length >= 3) {
        setKey(words[0].slice(0, 3).toUpperCase());
      }
    }
  };

  return (
    <>
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)]">
        <div className="p-4 space-y-6">
          {/* Main Navigation */}
          <div className="space-y-1">
            <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Overview
            </p>
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === "/dashboard"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/projects"
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname === "/projects"
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <FolderKanban className="w-4 h-4" />
              <span>All Projects</span>
            </Link>
          </div>

          {/* Active Project Navigation */}
          {currentProjectId && (
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between px-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Active Project
                </p>
              </div>

              <Link
                href={`/projects/${currentProjectId}/board`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.includes(`/projects/${currentProjectId}/board`)
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <KanbanSquare className="w-4 h-4" />
                <span>Kanban Board</span>
              </Link>

              <Link
                href={`/projects/${currentProjectId}/list`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.includes(`/projects/${currentProjectId}/list`)
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <ListTodo className="w-4 h-4" />
                <span>Task List</span>
              </Link>

              <Link
                href={`/projects/${currentProjectId}/analytics`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.includes(`/projects/${currentProjectId}/analytics`)
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics & Velocity</span>
              </Link>

              <Link
                href={`/projects/${currentProjectId}/settings`}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname.includes(`/projects/${currentProjectId}/settings`)
                    ? "bg-indigo-50 text-indigo-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Settings className="w-4 h-4" />
                <span>Team & Settings</span>
              </Link>
            </div>
          )}

          {/* Quick Project Switcher */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between px-3">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Projects ({projects.length})
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="text-slate-400 hover:text-indigo-600 p-0.5 rounded transition-colors"
                title="Create New Project"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
              {projects.map((p) => {
                const isActive = currentProjectId === p.id;
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}/board`}
                    className={cn(
                      "flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-colors group",
                      isActive
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      <span className="truncate">{p.name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 group-hover:text-indigo-600">
                      {p.key}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Role & Workspace Indicator */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              {userRole === "VIEWER" ? <Eye className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-800 leading-tight truncate">
                Role: {userRole || "Member"}
              </span>
              <span className="text-[10px] text-slate-400">
                {userRole === "VIEWER" ? "Read-Only Access" : "Full Editor Access"}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* New Project Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Project"
        description="Organize your team's tasks, track milestones, and ship faster."
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Next-Gen Mobile App"
              value={name}
              onChange={(e) => autoGenerateKey(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Key (Prefix for tasks, e.g. MOB-1)
            </label>
            <input
              type="text"
              required
              maxLength={6}
              placeholder="e.g. MOB"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-[11px] text-slate-400 mt-1">2-6 uppercase characters</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="What are the goals and scope of this project?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !name || !key}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              {creating ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
