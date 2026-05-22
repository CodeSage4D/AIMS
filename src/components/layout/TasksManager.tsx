"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  CheckSquare,
  PlusCircle,
  Calendar,
  User,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  RotateCcw,
  UserCheck,
  Send,
  X,
  Trash2
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

interface TaskItem {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: "PENDING" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED";
  intern: { id: string; fullName: string; internId?: string };
  assigner?: { fullName: string } | null;
  remarks?: string | null;
}

interface InternOption {
  id: string;
  fullName: string;
  internId?: string;
}

interface TasksManagerProps {
  tasks: TaskItem[];
  interns: InternOption[];
  userRole?: string;
}

export default function TasksManager({ tasks, interns, userRole = "INTERN" }: TasksManagerProps) {
  const router = useRouter();

  // Modal open/close state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [internId, setInternId] = useState("");

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!title || !description || !deadline || !internId) {
      setError("Please complete all task details.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, deadline, internId }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to assign task.");

      // Reset form & close
      setTitle("");
      setDescription("");
      setDeadline("");
      setInternId("");
      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected database save error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    setUpdatingId(taskId);
    setError(null);

    try {
      const res = await fetch(`/api/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update task status.");
      
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not save task update.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this task goal?")) {
      return;
    }
    setUpdatingId(taskId);
    setError(null);

    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete task.");

      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not delete task.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Status badge style helper
  const getStatusBadge = (s: string) => {
    switch (s) {
      case "PENDING":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "IN_PROGRESS":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
      case "IN_REVIEW":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6 select-none relative animate-fadeIn text-white">
      {/* 1. Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-heading font-extrabold text-foreground tracking-tight">
            Intern Work Queue
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Assign work targets, set deadlines, and audit task completion checklists.
          </p>
        </div>
        {interns.length > 0 && (
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            size="sm"
            className="h-10 text-xs font-semibold font-heading flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/5 rounded-xl px-4 transition-all"
          >
            <PlusCircle className="h-4.5 w-4.5" />
            <span>Assign New Task</span>
          </Button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs animate-pulse">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* 2. Tasks Container */}
      <div>
        {/* DESKTOP VIEW: Table Layout (md and larger) */}
        <div className="hidden md:block">
          <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-0 overflow-hidden shadow-lg rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                    <th className="py-4 px-6">Task Goal</th>
                    <th className="py-4 px-6">Assigned Intern</th>
                    <th className="py-4 px-6">Deadline</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Quick State Updates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs font-medium text-gray-300">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm font-semibold text-gray-500">
                        <div className="flex flex-col items-center space-y-2.5">
                          <CheckSquare className="h-8 w-8 text-gray-600" />
                          <span>No active task goals in this workspace.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-white/[0.02] hover:text-white transition-colors duration-150">
                        <td className="py-4.5 px-6 max-w-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-white text-sm">{task.title}</span>
                            <span className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">
                              {task.description}
                            </span>
                          </div>
                        </td>
                        <td className="py-4.5 px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-white">{task.intern.fullName}</span>
                            <span className="text-[10px] text-gray-400 mt-0.5">ID: {task.intern.internId || task.intern.id}</span>
                          </div>
                        </td>
                        <td className="py-4.5 px-6 font-semibold text-white">
                          <div className="flex items-center space-x-1.5">
                            <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            <span>{formatDate(task.deadline)}</span>
                          </div>
                        </td>
                        <td className="py-4.5 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-heading font-semibold border ${getStatusBadge(task.status)}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="py-4.5 px-6 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {task.status !== "COMPLETED" ? (
                              <>
                                {task.status === "PENDING" && (
                                  <Button
                                    onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                                    disabled={updatingId === task.id}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] font-bold text-cyan-400 border-cyan-500/25 hover:bg-cyan-500/5"
                                  >
                                    Start Work
                                  </Button>
                                )}
                                {task.status === "IN_PROGRESS" && (
                                  <Button
                                    onClick={() => handleUpdateStatus(task.id, "IN_REVIEW")}
                                    disabled={updatingId === task.id}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] font-bold text-blue-400 border-blue-500/25 hover:bg-blue-500/5"
                                  >
                                    Submit Review
                                  </Button>
                                )}
                                {task.status === "IN_REVIEW" && (
                                  <Button
                                    onClick={() => handleUpdateStatus(task.id, "COMPLETED")}
                                    disabled={updatingId === task.id}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] font-bold text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/5"
                                  >
                                    Approve Goal
                                  </Button>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center space-x-1 text-emerald-400 font-bold select-none text-[10px] tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>Approved</span>
                              </div>
                            )}

                            {(userRole === "FOUNDER" || userRole === "HR") && (
                              <Button
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={updatingId === task.id}
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-rose-500 border-rose-500/25 hover:bg-rose-500/10 hover:text-rose-400 shrink-0"
                                title="Delete Task"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* MOBILE VIEW: Card Stack Layout (md and smaller) */}
        <div className="block md:hidden space-y-4">
          {tasks.length === 0 ? (
            <Card className="border-white/[0.08] bg-[#0b0f19]/60 backdrop-blur-md p-8 text-center text-gray-500 select-none">
              <CheckSquare className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs font-semibold">No active goals in your work queue.</p>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card
                key={`mob-${task.id}`}
                className="border-white/[0.08] bg-[#0b0f19]/70 backdrop-blur-md p-4 rounded-xl space-y-3.5 shadow-lg"
              >
                {/* Mobile Card Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white">{task.title}</h3>
                    <div className="flex items-center space-x-1 text-[10px] text-gray-400">
                      <User className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Intern: {task.intern.fullName}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border shrink-0 ${getStatusBadge(task.status)}`}>
                    {task.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Mobile Card Description */}
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                  {task.description}
                </p>

                {/* Mobile Card Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 text-[11px] bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg font-medium text-gray-300">
                  <div>
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Deadline</span>
                    <span className="font-bold text-white flex items-center space-x-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-cyan-400" />
                      <span>{formatDate(task.deadline)}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 block uppercase font-bold tracking-wider">Assigner</span>
                    <span className="font-semibold block truncate mt-0.5">{task.assigner?.fullName || "Supervisor"}</span>
                  </div>
                </div>

                {/* Mobile Touch Action Button */}
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04] gap-2">
                  {(userRole === "FOUNDER" || userRole === "HR") && (
                    <Button
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={updatingId === task.id}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-400 active:scale-95 transition-all flex items-center justify-center shrink-0"
                      title="Delete Task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="flex-1">
                    {task.status !== "COMPLETED" ? (
                      <>
                        {task.status === "PENDING" && (
                          <Button
                            onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                            disabled={updatingId === task.id}
                            className="w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 border border-white/5 text-white active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                          >
                            <Send className="h-4 w-4" />
                            <span>Start Work Goal</span>
                          </Button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <Button
                            onClick={() => handleUpdateStatus(task.id, "IN_REVIEW")}
                            disabled={updatingId === task.id}
                            className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 border border-white/5 text-white active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                          >
                            <Send className="h-4 w-4" />
                            <span>Submit Work for Review</span>
                          </Button>
                        )}
                        {task.status === "IN_REVIEW" && (
                          <Button
                            onClick={() => handleUpdateStatus(task.id, "COMPLETED")}
                            disabled={updatingId === task.id}
                            className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 border border-white/5 text-white active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>Approve & Complete Goal</span>
                          </Button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center space-x-1 text-emerald-400 font-bold select-none text-[10px] tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl w-full justify-center text-center">
                        <CheckCircle className="h-4 w-4 shrink-0 inline-block mr-1" />
                        <span>Approved Work Goal</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 3. Sliding/Popup Assign Task Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-lg animate-fadeIn">
            <Card className="border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl relative rounded-2xl overflow-hidden">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4.5 right-4.5 text-gray-400 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <CardHeader className="pb-4">
                <CardTitle className="text-white">Assign Work Goal</CardTitle>
                <CardDescription className="text-gray-400">Launch a new target directly to an intern's queue.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Target Intern (Active Enrollee)
                    </label>
                    <select
                      value={internId}
                      onChange={(e) => setInternId(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 transition-all cursor-pointer"
                    >
                      <option value="" className="bg-[#0b0f19] text-white">Select Target Profile...</option>
                      {interns.map((i) => (
                        <option key={i.id} value={i.id} className="bg-[#0b0f19] text-white">
                          {i.fullName} ({i.internId || i.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Task Title / Heading"
                    placeholder="Enter short target summary..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder-gray-500 rounded-xl focus:border-indigo-500/70"
                  />

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Work Instructions / Requirements
                    </label>
                    <textarea
                      placeholder="Enter detailed action items, deliverable details, and testing remarks..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={3}
                      className="flex w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-indigo-500/70 transition-all placeholder-gray-500"
                    />
                  </div>

                  <Input
                    label="Target Deadline Date"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder-gray-500 rounded-xl focus:border-indigo-500/70"
                  />

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-white/[0.08] select-none">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsModalOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="font-semibold bg-indigo-600 hover:bg-indigo-500 border border-white/5 text-white"
                      isLoading={loading}
                    >
                      Assign Task
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
