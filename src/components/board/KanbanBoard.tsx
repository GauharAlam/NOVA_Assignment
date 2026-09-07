"use client";

import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  MessageSquare,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Tag as TagIcon,
  Sparkles,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { TaskDetailModal } from "@/components/task-modal/TaskDetailModal";
import {
  formatShortDate,
  isOverdue,
  getPriorityBadgeColor,
  KANBAN_COLUMNS,
  calculateProgress,
} from "@/lib/utils";
import { TaskDto, TaskStatus, TaskPriority } from "@/types";

interface KanbanBoardProps {
  projectId: string;
  initialTasks: TaskDto[];
  projectMembers: any[];
  canEdit: boolean;
}

export function KanbanBoard({
  projectId,
  initialTasks,
  projectMembers,
  canEdit,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskDto[]>(initialTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("ALL");

  // Inline Task Creation per column
  const [addingInColumn, setAddingInColumn] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [creating, setCreating] = useState(false);

  // Drag & Drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesKey = t.taskKey.toLowerCase().includes(q);
        if (!matchesTitle && !matchesKey) return false;
      }
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (assigneeFilter !== "ALL") {
        if (assigneeFilter === "unassigned" && t.assignee) return false;
        if (assigneeFilter !== "unassigned" && t.assignee?.id !== assigneeFilter) return false;
      }
      return true;
    });
  }, [tasks, search, priorityFilter, assigneeFilter]);

  // Group tasks by column
  const columnTasks = useMemo(() => {
    const map: Record<TaskStatus, TaskDto[]> = {
      BACKLOG: [],
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
    };

    filteredTasks.forEach((t) => {
      if (map[t.status]) {
        map[t.status].push(t);
      }
    });

    // Sort by orderIndex ascending
    (Object.keys(map) as TaskStatus[]).forEach((col) => {
      map[col].sort((a, b) => a.orderIndex - b.orderIndex);
    });

    return map;
  }, [filteredTasks]);

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (!canEdit) return;
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverColumn = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragOverTask = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverTaskId !== taskId) {
      setDragOverTaskId(taskId);
    }
  };

  // Handle Drop on Column or Task
  const handleDrop = async (e: React.DragEvent, destinationColumn: TaskStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDragOverTaskId(null);

    const taskId = draggedTaskId || e.dataTransfer.getData("text/plain");
    if (!taskId || !canEdit) return;

    const taskToMove = tasks.find((t) => t.id === taskId);
    if (!taskToMove) return;

    // Calculate destination orderIndex
    const currentList = columnTasks[destinationColumn].filter((t) => t.id !== taskId);
    let newOrderIndex = 1000.0;

    if (dragOverTaskId && dragOverTaskId !== taskId) {
      const targetIndex = currentList.findIndex((t) => t.id === dragOverTaskId);
      if (targetIndex !== -1) {
        const prevTask = currentList[targetIndex - 1];
        const nextTask = currentList[targetIndex];
        if (!prevTask) {
          newOrderIndex = nextTask.orderIndex / 2;
        } else {
          newOrderIndex = (prevTask.orderIndex + nextTask.orderIndex) / 2;
        }
      }
    } else if (currentList.length > 0) {
      const lastItem = currentList[currentList.length - 1];
      newOrderIndex = lastItem.orderIndex + 1000.0;
    }

    // Optimistic UI update
    const previousTasks = [...tasks];
    const updatedTasks = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          status: destinationColumn,
          orderIndex: newOrderIndex,
        };
      }
      return t;
    });

    setTasks(updatedTasks);
    setDraggedTaskId(null);

    // Call reorder API in background
    try {
      const res = await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          destinationStatus: destinationColumn,
          destinationOrderIndex: newOrderIndex,
        }),
      });

      if (!res.ok) {
        // Rollback on server error
        setTasks(previousTasks);
        alert("Failed to update task position. Changes rolled back.");
      }
    } catch {
      setTasks(previousTasks);
      alert("Network error. Changes rolled back.");
    }
  };

  // Quick Move to Next / Prev Column (Accessibility & 1-Click action)
  const handleQuickMove = async (task: TaskDto, direction: "prev" | "next") => {
    if (!canEdit) return;
    const colOrder: TaskStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
    const currentIndex = colOrder.indexOf(task.status);
    const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;

    if (targetIndex < 0 || targetIndex >= colOrder.length) return;
    const nextColumn = colOrder[targetIndex];

    const targetList = columnTasks[nextColumn];
    const lastOrder = targetList.length > 0 ? targetList[targetList.length - 1].orderIndex : 0;
    const newOrderIndex = lastOrder + 1000.0;

    const previousTasks = [...tasks];
    setTasks(
      tasks.map((t) => (t.id === task.id ? { ...t, status: nextColumn, orderIndex: newOrderIndex } : t))
    );

    try {
      await fetch("/api/tasks/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          destinationStatus: nextColumn,
          destinationOrderIndex: newOrderIndex,
        }),
      });
    } catch {
      setTasks(previousTasks);
    }
  };

  // Create Task Inline in Column
  const handleCreateTask = async (colId: TaskStatus) => {
    if (!newTaskTitle.trim() || creating || !canEdit) return;
    setCreating(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          status: colId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.task) {
        setTasks((prev) => [...prev, data.task]);
        setNewTaskTitle("");
        setAddingInColumn(null);
      }
    } catch (err) {
      console.error("Failed to create task", err);
    } finally {
      setCreating(false);
    }
  };

  const handleTaskUpdated = (updatedTask: TaskDto) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const handleTaskDeleted = (deletedTaskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter tasks by title or key..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Priority filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Assignee filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Assignee:</span>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Members</option>
              <option value="unassigned">Unassigned</option>
              {projectMembers.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-6">
        {KANBAN_COLUMNS.map((col, colIdx) => {
          const items = columnTasks[col.id];
          const isOverThisCol = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOverColumn(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`flex flex-col bg-slate-100/70 rounded-2xl p-3 border transition-colors min-h-[500px] ${
                isOverThisCol
                  ? "border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-200"
                  : "border-slate-200/80"
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-1 py-1 mb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {col.title}
                  </h4>
                  <span className="px-1.5 py-0.2 rounded-full bg-white text-[11px] font-bold text-slate-600 border border-slate-200">
                    {items.length}
                  </span>
                </div>

                {canEdit && (
                  <button
                    onClick={() => {
                      setAddingInColumn(addingInColumn === col.id ? null : col.id);
                      setNewTaskTitle("");
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                    title="Add task to this column"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Inline Task Creator */}
              {addingInColumn === col.id && (
                <div className="p-2.5 mb-3 bg-white rounded-xl border border-indigo-200 shadow-sm animate-in fade-in">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Task title..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateTask(col.id);
                      if (e.key === "Escape") setAddingInColumn(null);
                    }}
                    className="w-full text-xs px-2 py-1.5 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex justify-end gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setAddingInColumn(null)}
                      className="px-2 py-1 text-[11px] text-slate-500 hover:bg-slate-50 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={creating || !newTaskTitle.trim()}
                      onClick={() => handleCreateTask(col.id)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded shadow-xs"
                    >
                      {creating ? "Adding..." : "Add Task"}
                    </button>
                  </div>
                </div>
              )}

              {/* Task Cards Container */}
              <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5">
                {items.map((task) => {
                  const completedSubtasks = task.subtasks?.filter((s) => s.isCompleted).length || 0;
                  const totalSubtasks = task.subtasks?.length || 0;
                  const overdue = isOverdue(task.dueDate, task.status);
                  const isBeingDragged = draggedTaskId === task.id;

                  return (
                    <div
                      key={task.id}
                      draggable={canEdit}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragOver={(e) => handleDragOverTask(e, task.id)}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`group relative bg-white p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                        isBeingDragged
                          ? "opacity-40 border-dashed border-indigo-400 shadow-none scale-95"
                          : "border-slate-200/90 hover:border-indigo-300 hover:shadow-md shadow-xs"
                      }`}
                    >
                      {/* Top row: Key + Priority */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-mono font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">
                          {task.taskKey}
                        </span>

                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${getPriorityBadgeColor(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </div>

                      {/* Title */}
                      <h5 className="text-xs font-semibold text-slate-800 leading-snug mb-2 line-clamp-2">
                        {task.title}
                      </h5>

                      {/* Tags */}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2.5">
                          {task.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="text-[10px] font-medium px-1.5 py-0.2 rounded text-white"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer: Date / Subtasks / Assignee */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                        <div className="flex items-center gap-2">
                          {task.dueDate && (
                            <div
                              className={`flex items-center gap-1 font-medium ${
                                overdue ? "text-rose-600 font-bold" : "text-slate-500"
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              <span>{formatShortDate(task.dueDate)}</span>
                            </div>
                          )}

                          {totalSubtasks > 0 && (
                            <div className="flex items-center gap-1 text-slate-500">
                              <CheckCircle2 className="w-3 h-3 text-indigo-500" />
                              <span>
                                {completedSubtasks}/{totalSubtasks}
                              </span>
                            </div>
                          )}

                          {task.commentsCount > 0 && (
                            <div className="flex items-center gap-1 text-slate-500">
                              <MessageSquare className="w-3 h-3" />
                              <span>{task.commentsCount}</span>
                            </div>
                          )}
                        </div>

                        {task.assignee ? (
                          <Avatar
                            name={task.assignee.name}
                            avatarUrl={task.assignee.avatarUrl}
                            size="sm"
                          />
                        ) : (
                          <span className="w-5 h-5 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                            ?
                          </span>
                        )}
                      </div>

                      {/* Quick Move Arrows on hover (Accessible alternative to drag) */}
                      {canEdit && (
                        <div
                          className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white/95 rounded-lg shadow-sm border border-slate-200 p-0.5 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {colIdx > 0 && (
                            <button
                              onClick={() => handleQuickMove(task, "prev")}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500"
                              title="Move back"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          )}
                          {colIdx < KANBAN_COLUMNS.length - 1 && (
                            <button
                              onClick={() => handleQuickMove(task, "next")}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500"
                              title="Move forward"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {items.length === 0 && (
                  <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-xs text-slate-400 text-center p-4">
                    No tasks in this column
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          projectMembers={projectMembers}
        />
      )}
    </div>
  );
}
