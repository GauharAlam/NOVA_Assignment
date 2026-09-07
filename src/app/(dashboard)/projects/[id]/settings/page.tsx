"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Settings as SettingsIcon,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";

interface SettingsPageProps {
  params: { id: string };
}

export default function ProjectSettingsPage({ params }: SettingsPageProps) {
  const router = useRouter();
  const { id: projectId } = params;

  const [project, setProject] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Project Edit
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [priority, setPriority] = useState("MEDIUM");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Invite Member Modal
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const loadData = () => {
    Promise.all([
      fetch(`/api/projects/${projectId}`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/members`).then((r) => r.json()),
    ])
      .then(([projData, memberData]) => {
        if (projData.project) {
          setProject(projData.project);
          setName(projData.project.name);
          setDescription(projData.project.description || "");
          setStatus(projData.project.status);
          setPriority(projData.project.priority);
          setTargetDate(projData.project.targetDate ? projData.project.targetDate.split("T")[0] : "");
          setPermissions(projData.permissions);
        }
        if (memberData.members) {
          setMembers(memberData.members);
        }
      })
      .catch((err) => console.error("Settings load error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions?.canManageMembers && !permissions?.canEditTask) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          status,
          priority,
          targetDate: targetDate ? new Date(targetDate).toISOString() : null,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        loadData();
      }
    } catch {
      alert("Failed to update project settings");
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteError("");

    try {
      const res = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Failed to add member");
        return;
      }

      setIsInviteOpen(false);
      setInviteEmail("");
      loadData();
    } catch {
      setInviteError("Network error adding member");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!permissions?.canManageMembers) return;
    if (confirm("Remove this member from the project? Any assigned tasks will be set to unassigned.")) {
      try {
        const res = await fetch(`/api/projects/${projectId}/members?userId=${userId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          loadData();
        }
      } catch (err) {
        console.error("Failed to remove member:", err);
      }
    }
  };

  const handleDeleteProject = async () => {
    if (!permissions?.canDeleteProject) return;
    const confirmation = prompt(`To permanently delete this project, type "${project?.name}":`);
    if (confirmation === project?.name) {
      try {
        const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
        if (res.ok) {
          router.push("/projects");
          router.refresh();
        }
      } catch (err) {
        console.error("Failed to delete project:", err);
      }
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading settings...</div>;
  }

  const canManage = permissions?.canManageMembers || permissions?.role === "OWNER";

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      {/* General Settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900">Project Configuration</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Update name, target dates, and lifecycle states.
          </p>
        </div>

        <form onSubmit={handleUpdateProject} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Name
              </label>
              <input
                type="text"
                disabled={!canManage}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Key
              </label>
              <input
                type="text"
                disabled
                value={project?.key || ""}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 font-mono text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              disabled={!canManage}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                disabled={!canManage}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="PLANNING">Planning</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                disabled={!canManage}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Date
              </label>
              <input
                type="date"
                disabled={!canManage}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {canManage && (
            <div className="flex items-center justify-between pt-2">
              {saveSuccess ? (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Changes saved successfully
                </span>
              ) : <div />}
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Team Roster & Permissions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Project Members & Access</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control member roles (Admin, Member, Viewer).
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite Member
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100">
          {members.map((m) => (
            <div key={m.userId} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={m.user.name} avatarUrl={m.user.avatarUrl} size="md" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">{m.user.name}</p>
                  <p className="text-[11px] text-slate-400">{m.user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                  m.role === "OWNER"
                    ? "bg-purple-50 text-purple-700 border-purple-200"
                    : m.role === "ADMIN"
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : m.role === "MEMBER"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>
                  {m.role}
                </span>

                {canManage && !m.isOwner && (
                  <button
                    onClick={() => handleRemoveMember(m.userId)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      {permissions?.canDeleteProject && (
        <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Danger Zone</span>
          </div>
          <p className="text-xs text-rose-700 leading-relaxed">
            Deleting this project will immediately purge all associated tasks, subtasks, discussions, and audit timelines. This action cannot be reversed.
          </p>
          <button
            onClick={handleDeleteProject}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
          >
            Delete Project Permanently
          </button>
        </div>
      )}

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite Member to Project"
        description="Add a registered NOVA user to this project workspace."
      >
        <form onSubmit={handleInviteMember} className="space-y-4">
          {inviteError && (
            <div className="p-3 rounded-lg bg-rose-50 text-rose-700 text-xs border border-rose-200">
              {inviteError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              User Email Address
            </label>
            <input
              type="email"
              required
              placeholder="e.g. dev@nova.dev or viewer@nova.dev"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Tip: Test with pre-seeded emails like `viewer@nova.dev` or `dev@nova.dev`.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="MEMBER">Member (Can create, edit, and complete tasks)</option>
              <option value="ADMIN">Admin (Can manage settings and invite members)</option>
              <option value="VIEWER">Viewer (Read-only observation)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsInviteOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              {inviting ? "Adding..." : "Add to Project"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
