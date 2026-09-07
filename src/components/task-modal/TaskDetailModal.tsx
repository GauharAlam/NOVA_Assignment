"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  Trash2,
  Send,
  History,
  AlertCircle,
  Tag as TagIcon,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import {
  formatDate,
  isOverdue,
  getPriorityBadgeColor,
  getStatusBadgeColor,
  calculateProgress,
  KANBAN_COLUMNS,
} from "@/lib/utils";
import { TaskDto, TaskPriority, TaskStatus } from "@/types";

interface TaskDetailModalProps {
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated: (updatedTask: TaskDto) => void;
  onTaskDeleted: (deletedTaskId: string) => void;
  projectMembers: any[];
}

export function TaskDetailModal({
  taskId,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  projectMembers,
}: TaskDetailModalProps) {
  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [canEdit, setCanEdit] = useState(true);

  // Edit states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");

  // Subtask & Comment input states
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [saving, setSaving] = useState(false);
  const [commenting, setCommenting] = useState(false);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    fetch(`/api/tasks/${taskId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.task) {
          const t = data.task;
          setTask(t);
          setTitle(t.title);
          setDescription(t.description || "");
          setStatus(t.status);
          setPriority(t.priority);
          setAssigneeId(t.assigneeId || "");
          setDueDate(t.dueDate ? t.dueDate.split("T")[0] : "");
          setSubtasks(t.subtasks || []);
          setComments(t.comments || []);
          setActivities(t.activityLogs || []);
          if (data.permissions) {
            setCanEdit(data.permissions.canEditTask);
          }
        }
      })
      .catch((err) => console.error("Error fetching task details:", err))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (!taskId) return null;

  const handleUpdateField = async (fieldsToUpdate: Partial<TaskDto>) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fieldsToUpdate),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTask(data.task);
        onTaskUpdated(data.task);
      }
    } catch (err) {
      console.error("Failed to update task", err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTitleDesc = () => {
    if (title.trim() && (title !== task?.title || description !== (task?.description || ""))) {
      handleUpdateField({ title: title.trim(), description: description.trim() || null });
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !canEdit) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newSubtaskTitle.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.subtask) {
        const nextSubtasks = [...subtasks, data.subtask];
        setSubtasks(nextSubtasks);
        setNewSubtaskTitle("");
        onTaskUpdated({ ...task, subtasks: nextSubtasks });
      }
    } catch (err) {
      console.error("Failed to add subtask", err);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, currentCompleted: boolean) => {
    if (!canEdit) return;
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !currentCompleted }),
      });
      const data = await res.json();
      if (res.ok && data.subtask) {
        const next = subtasks.map((s) => (s.id === subtaskId ? data.subtask : s));
        setSubtasks(next);
        onTaskUpdated({ ...task, subtasks: next });
      }
    } catch (err) {
      console.error("Failed to toggle subtask", err);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!canEdit) return;
    try {
      const res = await fetch(`/api/subtasks/${subtaskId}`, { method: "DELETE" });
      if (res.ok) {
        const next = subtasks.filter((s) => s.id !== subtaskId);
        setSubtasks(next);
        onTaskUpdated({ ...task, subtasks: next });
      }
    } catch (err) {
      console.error("Failed to delete subtask", err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setCommenting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.comment) {
        setComments([data.comment, ...comments]);
        setNewComment("");
        if (task) {
          onTaskUpdated({ ...task, commentsCount: (task.commentsCount || 0) + 1 });
        }
      }
    } catch (err) {
      console.error("Failed to add comment", err);
    } finally {
      setCommenting(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!canEdit) return;
    if (confirm("Are you sure you want to delete this task? This action cannot be undone.")) {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
        if (res.ok) {
          onTaskDeleted(taskId);
          onClose();
        }
      } catch (err) {
        console.error("Failed to delete task", err);
      }
    }
  };

  const completedSubtasksCount = subtasks.filter((s) => s.isCompleted).length;
  const subtasksProgress = calculateProgress(completedSubtasksCount, subtasks.length);
  const isTaskOverdue = isOverdue(task?.dueDate, task?.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
              {task?.taskKey || "TASK"}
            </span>
            {isTaskOverdue && (
              <Badge variant="danger" dot>
                Overdue
              </Badge>
            )}
            {!canEdit && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Read-Only (Viewer)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={handleDeleteTask}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading task details...</div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            {/* Main Column (2 cols) */}
            <div className="lg:col-span-2 p-6 space-y-6">
              {/* Title */}
              <div>
                <input
                  type="text"
                  value={title}
                  readOnly={!canEdit}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSaveTitleDesc}
                  className="w-full text-xl font-bold text-slate-900 border-none hover:bg-slate-50/80 focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-lg px-2 py-1 -ml-2 transition-all outline-none"
                  placeholder="Task title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  readOnly={!canEdit}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={handleSaveTitleDesc}
                  placeholder={canEdit ? "Add a detailed markdown description..." : "No description provided."}
                  className="w-full text-sm text-slate-700 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y transition-all"
                />
              </div>

              {/* Subtasks / Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Subtasks Checklist
                    </span>
                  </div>
                  {subtasks.length > 0 && (
                    <span className="text-xs text-slate-500 font-medium">
                      {completedSubtasksCount} of {subtasks.length} ({subtasksProgress}%)
                    </span>
                  )}
                </div>

                {subtasks.length > 0 && (
                  <ProgressBar progress={subtasksProgress} />
                )}

                <div className="space-y-1.5 pt-1">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 transition-colors group"
                    >
                      <label className="flex items-center gap-3 cursor-pointer select-none flex-1 min-w-0">
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={subtask.isCompleted}
                          onChange={() => handleToggleSubtask(subtask.id, subtask.isCompleted)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span
                          className={`text-sm truncate ${
                            subtask.isCompleted
                              ? "line-through text-slate-400"
                              : "text-slate-800"
                          }`}
                        >
                          {subtask.title}
                        </span>
                      </label>
                      {canEdit && (
                        <button
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 rounded transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {canEdit && (
                  <form onSubmit={handleAddSubtask} className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="+ Add a subtask..."
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!newSubtaskTitle.trim()}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm"
                    >
                      Add
                    </button>
                  </form>
                )}
              </div>

              {/* Tabs: Comments vs Activity */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex gap-4 border-b border-slate-100">
                  <button
                    onClick={() => setActiveTab("details")}
                    className={`pb-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-colors ${
                      activeTab === "details"
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Discussion ({comments.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("activity")}
                    className={`pb-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-colors ${
                      activeTab === "activity"
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    Activity History
                  </button>
                </div>

                {activeTab === "details" ? (
                  <div className="space-y-4">
                    {/* Add comment */}
                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={commenting || !newComment.trim()}
                        className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Send
                      </button>
                    </form>

                    {/* Comments list */}
                    <div className="space-y-3">
                      {comments.map((c) => (
                        <div key={c.id} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <Avatar name={c.author.name} avatarUrl={c.author.avatarUrl} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-800">{c.author.name}</span>
                              <span className="text-[10px] text-slate-400">{formatDate(c.createdAt)}</span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed break-words">{c.content}</p>
                          </div>
                        </div>
                      ))}
                      {comments.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-4">No comments yet. Start the conversation!</p>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Activity Timeline */
                  <div className="space-y-2">
                    {activities.map((act) => (
                      <div key={act.id} className="flex items-start gap-2.5 text-xs text-slate-600 py-1">
                        <Avatar name={act.user.name} avatarUrl={act.user.avatarUrl} size="sm" className="w-5 h-5 text-[10px]" />
                        <div>
                          <span className="font-semibold text-slate-800">{act.user.name}</span>{" "}
                          <span className="text-slate-500 font-mono text-[11px]">{act.action.toLowerCase().replace("_", " ")}</span>
                          <span className="text-[10px] text-slate-400 ml-2">{formatDate(act.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Column (Metadata controls) */}
            <div className="p-6 bg-slate-50/50 space-y-6">
              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  disabled={!canEdit}
                  value={status}
                  onChange={(e) => {
                    const newSt = e.target.value as TaskStatus;
                    setStatus(newSt);
                    handleUpdateField({ status: newSt });
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {KANBAN_COLUMNS.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  disabled={!canEdit}
                  value={priority}
                  onChange={(e) => {
                    const newPr = e.target.value as TaskPriority;
                    setPriority(newPr);
                    handleUpdateField({ priority: newPr });
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Assignee
                </label>
                <select
                  disabled={!canEdit}
                  value={assigneeId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAssigneeId(val);
                    handleUpdateField({ assigneeId: val || null } as any);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {projectMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Due Date
                </label>
                <input
                  type="date"
                  disabled={!canEdit}
                  value={dueDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDueDate(val);
                    handleUpdateField({ dueDate: val ? new Date(val + "T12:00:00").toISOString() : null } as any);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Creator & Metadata */}
              <div className="pt-4 border-t border-slate-200/80 space-y-2 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Created By</span>
                  <span className="font-medium text-slate-700">{task?.creator?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created</span>
                  <span className="font-medium text-slate-700">{formatDate(task?.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
