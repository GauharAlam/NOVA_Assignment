"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  MoreVertical,
  Plus,
  Trash2,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { TaskDetailModal } from "@/components/task-modal/TaskDetailModal";
import {
  formatShortDate,
  isOverdue,
  getPriorityBadgeColor,
  getStatusBadgeColor,
  KANBAN_COLUMNS,
} from "@/lib/utils";
import { TaskDto, TaskStatus, TaskPriority } from "@/types";

interface TaskListViewProps {
  projectId: string;
  initialTasks: TaskDto[];
  projectMembers: any[];
  canEdit: boolean;
}

export function TaskListView({
  projectId,
  initialTasks,
  projectMembers,
  canEdit,
}: TaskListViewProps) {
  const [tasks, setTasks] = useState<TaskDto[]>(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"taskNumber" | "title" | "status" | "priority" | "dueDate">("taskNumber");
  const [sortAsc, setSortAsc] = useState(true);

  // Sorting
  const sortedTasks = useMemo(() => {
    return [...tasks]
      .filter((t) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || t.taskKey.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === "dueDate") {
          valA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          valB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [tasks, search, sortField, sortAsc]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!canEdit) return;
    const prev = [...tasks];
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) setTasks(prev);
    } catch {
      setTasks(prev);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex items-center justify-between gap-4 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing {sortedTasks.length} tasks
        </div>
      </div>

      {/* Task Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th
                  onClick={() => toggleSort("taskNumber")}
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    Key <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("title")}
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    Title <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("status")}
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    Status <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort("priority")}
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    Priority <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3">Assignee</th>
                <th
                  onClick={() => toggleSort("dueDate")}
                  className="px-4 py-3 cursor-pointer hover:text-slate-700"
                >
                  <div className="flex items-center gap-1">
                    Due Date <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3">Subtasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sortedTasks.map((task) => {
                const overdue = isOverdue(task.dueDate, task.status);
                const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0;
                const totalSubtasks = task.subtasks?.length || 0;

                return (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    {/* Key */}
                    <td className="px-4 py-3 font-mono font-semibold text-slate-500">
                      {task.taskKey}
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">
                      {task.title}
                    </td>

                    {/* Status Dropdown */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        disabled={!canEdit}
                        value={task.status}
                        onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                        className={`text-[11px] font-semibold px-2 py-1 rounded-md border focus:outline-none cursor-pointer ${getStatusBadgeColor(
                          task.status
                        )}`}
                      >
                        {KANBAN_COLUMNS.map((col) => (
                          <option key={col.id} value={col.id}>
                            {col.title}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadgeColor(
                          task.priority
                        )}`}
                      >
                        {task.priority}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3">
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar
                            name={task.assignee.name}
                            avatarUrl={task.assignee.avatarUrl}
                            size="sm"
                          />
                          <span className="text-slate-700 truncate max-w-[100px]">
                            {task.assignee.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="px-4 py-3">
                      {task.dueDate ? (
                        <span
                          className={`flex items-center gap-1 font-medium ${
                            overdue ? "text-rose-600 font-bold" : "text-slate-600"
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {formatShortDate(task.dueDate)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Subtasks */}
                    <td className="px-4 py-3">
                      {totalSubtasks > 0 ? (
                        <span className="text-slate-500">
                          {completedSubtasks} / {totalSubtasks}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No tasks found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={(updated) =>
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
          }
          onTaskDeleted={(deletedId) =>
            setTasks((prev) => prev.filter((t) => t.id !== deletedId))
          }
          projectMembers={projectMembers}
        />
      )}
    </div>
  );
}
