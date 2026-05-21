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
  RotateCcw
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
}

export default function TasksManager({ tasks, interns }: TasksManagerProps) {
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
    <div className="space-y-6 select-none relative animate-fadeIn">
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
            className="h-10 text-xs font-semibold font-heading flex items-center space-x-1.5"
          >
            <PlusCircle className="h-4.5 w-4.5" />
            <span>Assign New Task</span>
          </Button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center space-x-3 p-3.5 rounded-md bg-destructive/10 border border-destructive/25 text-destructive text-xs animate-pulse">
          <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* 2. Tasks Table directory */}
      <Card className="border-border/60 p-0 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/15 text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                <th className="py-4 px-6">Task Goal</th>
                <th className="py-4 px-6">Assigned Intern</th>
                <th className="py-4 px-6">Deadline</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-center">Quick State Updates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-xs font-medium text-muted-foreground">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm font-semibold text-muted-foreground">
                    <div className="flex flex-col items-center space-y-2.5">
                      <CheckSquare className="h-8 w-8 text-muted-foreground/50" />
                      <span>No active task goals in this workspace.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-secondary/5 hover:text-foreground transition-colors duration-150">
                    <td className="py-4.5 px-6 max-w-sm">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm">{task.title}</span>
                        <span className="text-xs text-muted-foreground/80 mt-1 leading-relaxed line-clamp-2">
                          {task.description}
                        </span>
                      </div>
                    </td>
                    <td className="py-4.5 px-6">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{task.intern.fullName}</span>
                        <span className="text-[10px] text-muted-foreground/80 mt-0.5">ID: {task.intern.internId || task.intern.id}</span>
                      </div>
                    </td>
                    <td className="py-4.5 px-6 font-semibold text-foreground">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
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
                                className="h-8 text-[10px] font-bold text-cyan-400 hover:bg-cyan-500/5 hover:border-cyan-500/20"
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
                                className="h-8 text-[10px] font-bold text-blue-400 hover:bg-blue-500/5 hover:border-blue-500/20"
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
                                className="h-8 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500/20"
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 3. Sliding/Popup Assign Task Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-lg">
            <Card className="border-border shadow-2xl relative">
              <CardHeader className="pb-4">
                <CardTitle>Assign Work Goal</CardTitle>
                <CardDescription>Launch a new target directly to an intern's queue.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                      Target Intern (Active Enrollee)
                    </label>
                    <select
                      value={internId}
                      onChange={(e) => setInternId(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all cursor-pointer"
                    >
                      <option value="">Select Target Profile...</option>
                      {interns.map((i) => (
                        <option key={i.id} value={i.id}>
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
                  />

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                      Work Instructions / Requirements
                    </label>
                    <textarea
                      placeholder="Enter detailed action items, deliverable details, and testing remarks..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={3}
                      className="flex w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                  </div>

                  <Input
                    label="Target Deadline Date"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                  />

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-border/40 select-none">
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
                      className="font-semibold"
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
