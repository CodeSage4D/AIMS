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
  Trash2,
  MessageSquare,
  Eye
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
  submissionComment?: string | null;
  feedbackComment?: string | null;
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
  currentUserId?: string;
}

export default function TasksManager({ tasks, interns, userRole = "INTERN", currentUserId }: TasksManagerProps) {
  const router = useRouter();

  // Role validation helpers
  const isManager = userRole === "FOUNDER" || userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "HR" || userRole === "TEAM_LEAD";
  const isIntern = userRole === "INTERN";

  // Modal open/close state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [internId, setInternId] = useState("");
  const [submissionComment, setSubmissionComment] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");

  // Task Commentary Thread States & Logic
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const commentsEndRef = React.useRef<HTMLDivElement>(null);

  const fetchComments = async (taskId: string) => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/messages?taskId=${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Failed to load task comments", err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleOpenDetails = (task: TaskItem) => {
    setSelectedTask(task);
    setIsDetailsModalOpen(true);
    fetchComments(task.id);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTask) return;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          taskId: selectedTask.id
        }),
      });

      if (res.ok) {
        const added = await res.json();
        setComments((prev) => [...prev, added]);
        setNewComment("");
      }
    } catch (err) {
      console.error("Failed to post comment", err);
    }
  };

  React.useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [comments]);

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

  const handleStartWork = async (taskId: string) => {
    setUpdatingId(taskId);
    setError(null);

    try {
      const res = await fetch(`/api/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: "IN_PROGRESS" }),
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

  const handleSubmitWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask.id,
          status: "IN_REVIEW",
          submissionComment: submissionComment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit work.");

      setIsSubmitModalOpen(false);
      setSubmissionComment("");
      setSelectedTask(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not submit work.");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewWork = async (approved: boolean) => {
    if (!selectedTask) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: selectedTask.id,
          status: approved ? "COMPLETED" : "IN_PROGRESS",
          feedbackComment: feedbackComment.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review.");

      setIsReviewModalOpen(false);
      setFeedbackComment("");
      setSelectedTask(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Could not submit review.");
    } finally {
      setLoading(false);
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
        return "bg-amber-500/10 text-amber-500 border-amber-500/20 dark:text-amber-400";
      case "IN_PROGRESS":
        return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400";
      case "IN_REVIEW":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400";
      default:
        return "bg-slate-500/10 text-slate-500 border-slate-500/20 dark:text-slate-400";
    }
  };

  return (
    <div className="space-y-6 relative animate-fadeIn text-foreground">
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
        {isManager && interns.length > 0 && (
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            size="sm"
            className="h-10 text-xs font-semibold font-heading flex items-center space-x-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/5 rounded-xl px-4 text-white transition-all shadow-md"
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
          <Card className="border-border/60 bg-card/65 backdrop-blur-md p-0 overflow-hidden shadow-lg rounded-2xl text-card-foreground">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30 text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                    <th className="py-4 px-6">Task Goal</th>
                    <th className="py-4 px-6">Assigned Intern</th>
                    <th className="py-4 px-6">Deadline</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions & Flow</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs font-medium text-foreground">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-sm font-semibold text-muted-foreground">
                        <div className="flex flex-col items-center space-y-2.5">
                          <CheckSquare className="h-8 w-8 text-muted-foreground/60" />
                          <span>No active task goals in this workspace.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-muted/15 transition-colors duration-150">
                        <td className="py-4.5 px-6 max-w-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm">{task.title}</span>
                            <span className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                              {task.description}
                            </span>
                            <div className="flex items-center space-x-1.5 mt-2 text-[10px] text-primary font-bold">
                              <MessageSquare className="h-3.5 w-3.5" />
                              <button
                                onClick={() => handleOpenDetails(task)}
                                className="hover:underline flex items-center space-x-1"
                              >
                                <span>Task Details & Discussion Thread</span>
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-4.5 px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">{task.intern.fullName}</span>
                            <span className="text-[10px] text-muted-foreground mt-0.5">ID: {task.intern.internId || task.intern.id}</span>
                          </div>
                        </td>
                        <td className="py-4.5 px-6 font-semibold text-foreground">
                          <div className="flex items-center space-x-1.5">
                            <Clock className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
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
                            {/* Intern Role Action Options */}
                            {isIntern && (
                              <>
                                {task.status === "PENDING" && (
                                  <Button
                                    onClick={() => handleStartWork(task.id)}
                                    disabled={updatingId === task.id}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] font-bold text-cyan-600 border-cyan-500/25 hover:bg-cyan-500/5 dark:text-cyan-400"
                                  >
                                    Start Work
                                  </Button>
                                )}
                                {task.status === "IN_PROGRESS" && (
                                  <Button
                                    onClick={() => {
                                      setSelectedTask(task);
                                      setIsSubmitModalOpen(true);
                                    }}
                                    disabled={updatingId === task.id}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] font-bold text-blue-600 border-blue-500/25 hover:bg-blue-500/5 dark:text-blue-400"
                                  >
                                    Submit Work
                                  </Button>
                                )}
                                {task.status === "IN_REVIEW" && (
                                  <span className="text-[10px] text-muted-foreground font-semibold py-1 px-2 bg-secondary/20 rounded border border-border/40">
                                    Awaiting Review
                                  </span>
                                )}
                                {task.status === "COMPLETED" && (
                                  <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold select-none text-[10px] tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span>Approved</span>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Manager Role Action Options */}
                            {isManager && (
                              <>
                                {task.status === "PENDING" && (
                                  <span className="text-[10px] text-muted-foreground font-medium py-1 px-2 bg-secondary/15 rounded">
                                    Awaiting Start
                                  </span>
                                )}
                                {task.status === "IN_PROGRESS" && (
                                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold py-1 px-2 bg-cyan-500/5 border border-cyan-500/10 rounded">
                                    Intern Working
                                  </span>
                                )}
                                {task.status === "IN_REVIEW" && (
                                  <Button
                                    onClick={() => {
                                      setSelectedTask(task);
                                      setIsReviewModalOpen(true);
                                    }}
                                    disabled={updatingId === task.id}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-[10px] font-bold text-amber-600 border-amber-500/25 hover:bg-amber-500/5 dark:text-amber-500"
                                  >
                                    Review Work
                                  </Button>
                                )}
                                {task.status === "COMPLETED" && (
                                  <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold select-none text-[10px] tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span>Approved</span>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Delete Task Option (Managers Only) */}
                            {isManager && (
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
            <Card className="border-border bg-card/65 backdrop-blur-md p-8 text-center text-muted-foreground select-none">
              <CheckSquare className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs font-semibold">No active goals in your work queue.</p>
            </Card>
          ) : (
            tasks.map((task) => (
              <Card
                key={`mob-${task.id}`}
                className="border-border bg-card/75 backdrop-blur-md p-4 rounded-xl space-y-3.5 shadow-lg text-card-foreground"
              >
                {/* Mobile Card Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">{task.title}</h3>
                    <div className="flex items-center space-x-1 text-[10px] text-muted-foreground">
                      <User className="h-3.5 w-3.5 text-indigo-500" />
                      <span>Intern: {task.intern.fullName}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border shrink-0 ${getStatusBadge(task.status)}`}>
                    {task.status.replace(/_/g, " ")}
                  </span>
                </div>

                {/* Mobile Card Description */}
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  {task.description}
                </p>

                {/* Mobile Comments Indicator */}
                <button
                  onClick={() => handleOpenDetails(task)}
                  className="flex items-center space-x-1.5 text-[10px] text-primary font-bold hover:underline"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Task Details & Discussion Thread</span>
                </button>

                {/* Mobile Card Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 text-[11px] bg-muted/20 border border-border/40 p-3 rounded-lg font-medium text-foreground">
                  <div>
                    <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Deadline</span>
                    <span className="font-bold text-foreground flex items-center space-x-1 mt-0.5">
                      <Clock className="h-3.5 w-3.5 text-cyan-500" />
                      <span>{formatDate(task.deadline)}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider">Assigner</span>
                    <span className="font-semibold block truncate mt-0.5">{task.assigner?.fullName || "Supervisor"}</span>
                  </div>
                </div>

                {/* Mobile Touch Action Button */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 gap-2">
                  {isManager && (
                    <Button
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={updatingId === task.id}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/30 text-rose-500 active:scale-95 transition-all flex items-center justify-center shrink-0"
                      title="Delete Task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <div className="flex-1">
                    {/* Intern Action Option */}
                    {isIntern && (
                      <>
                        {task.status === "PENDING" && (
                          <Button
                            onClick={() => handleStartWork(task.id)}
                            disabled={updatingId === task.id}
                            className="w-full py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 border border-white/5 text-white active:scale-95 transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                          >
                            <Send className="h-4 w-4" />
                            <span>Start Work Goal</span>
                          </Button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <Button
                            onClick={() => {
                              setSelectedTask(task);
                              setIsSubmitModalOpen(true);
                            }}
                            disabled={updatingId === task.id}
                            className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 border border-white/5 text-white active:scale-95 transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                          >
                            <Send className="h-4 w-4" />
                            <span>Submit Work</span>
                          </Button>
                        )}
                        {task.status === "IN_REVIEW" && (
                          <div className="text-center text-xs font-semibold py-2.5 bg-secondary/20 rounded-xl border border-border/40 text-muted-foreground w-full select-none">
                            Awaiting Manager Review
                          </div>
                        )}
                        {task.status === "COMPLETED" && (
                          <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold select-none text-[10px] tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl w-full justify-center text-center">
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            <span>Approved Work Goal</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Manager Action Option */}
                    {isManager && (
                      <>
                        {task.status === "PENDING" && (
                          <div className="text-center text-xs font-medium py-2.5 bg-secondary/15 text-muted-foreground rounded-xl w-full select-none">
                            Awaiting Intern Start
                          </div>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <div className="text-center text-xs font-semibold py-2.5 bg-cyan-500/5 text-cyan-600 border border-cyan-500/10 rounded-xl w-full select-none">
                            Intern Working
                          </div>
                        )}
                        {task.status === "IN_REVIEW" && (
                          <Button
                            onClick={() => {
                              setSelectedTask(task);
                              setIsReviewModalOpen(true);
                            }}
                            disabled={updatingId === task.id}
                            className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 border border-white/5 text-white active:scale-95 transition-all flex items-center justify-center space-x-1.5 shadow-sm"
                          >
                            <ShieldCheck className="h-4 w-4" />
                            <span>Review Submission</span>
                          </Button>
                        )}
                        {task.status === "COMPLETED" && (
                          <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400 font-bold select-none text-[10px] tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl w-full justify-center text-center">
                            <CheckCircle className="h-4 w-4 shrink-0" />
                            <span>Approved Work Goal</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* 3. Assign Task Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-lg animate-fadeIn">
            <Card className="border-border bg-card/95 backdrop-blur-xl shadow-2xl relative rounded-2xl overflow-hidden text-card-foreground">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4.5 right-4.5 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <CardHeader className="pb-4">
                <CardTitle>Assign Work Goal</CardTitle>
                <CardDescription>Launch a new target directly to an intern's queue.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTask} className="space-y-4">
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                      Target Intern (Active Enrollee)
                    </label>
                    <select
                      value={internId}
                      onChange={(e) => setInternId(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
                    >
                      <option value="" className="bg-card text-foreground">Select Target Profile...</option>
                      {interns.map((i) => (
                        <option key={i.id} value={i.id} className="bg-card text-foreground">
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
                    className="bg-background border-border text-foreground placeholder-muted-foreground rounded-xl"
                  />

                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                      Work Instructions / Requirements
                    </label>
                    <textarea
                      placeholder="Enter detailed action items, deliverable details, and testing remarks..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                      rows={3}
                      className="flex w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted-foreground"
                    />
                  </div>

                  <Input
                    label="Target Deadline Date"
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    required
                    className="bg-background border-border text-foreground rounded-xl"
                  />

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/40 select-none">
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
                      className="font-semibold text-white bg-primary hover:bg-primary/90 shadow"
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

      {/* 4. Submit Work Modal Overlay (Intern Only) */}
      {isSubmitModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="w-full max-w-lg">
            <Card className="border-border shadow-2xl relative rounded-2xl overflow-hidden bg-card/95 backdrop-blur-xl text-card-foreground">
              <button
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  setSelectedTask(null);
                  setSubmissionComment("");
                }}
                className="absolute top-4.5 right-4.5 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <CardHeader className="pb-4">
                <CardTitle>Submit Work Goal</CardTitle>
                <CardDescription>Provide details or links of the completed work for manager review.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitWork} className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Task Goal</span>
                    <p className="text-sm font-bold text-foreground">{selectedTask.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{selectedTask.description}</p>
                  </div>
                  
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                      Submission Comments / Deliverable Links
                    </label>
                    <textarea
                      placeholder="Describe your solution, details of completed work, or paste links (e.g. GitHub, Figma, Vercel)..."
                      value={submissionComment}
                      onChange={(e) => setSubmissionComment(e.target.value)}
                      required
                      rows={4}
                      className="flex w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted-foreground"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/40 select-none">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setIsSubmitModalOpen(false);
                        setSelectedTask(null);
                        setSubmissionComment("");
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="font-semibold text-white bg-primary hover:bg-primary/95 shadow"
                      isLoading={loading}
                    >
                      Submit for Review
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 5. Review Work Modal Overlay (Managers Only) */}
      {isReviewModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="w-full max-w-lg">
            <Card className="border-border shadow-2xl relative rounded-2xl overflow-hidden bg-card/95 backdrop-blur-xl text-card-foreground">
              <button
                onClick={() => {
                  setIsReviewModalOpen(false);
                  setSelectedTask(null);
                  setFeedbackComment("");
                }}
                className="absolute top-4.5 right-4.5 text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-secondary/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <CardHeader className="pb-4">
                <CardTitle>Review Intern Submission</CardTitle>
                <CardDescription>Evaluate work goals submitted by {selectedTask.intern.fullName}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5 p-3.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Task Goal</span>
                  <p className="text-sm font-bold text-foreground">{selectedTask.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{selectedTask.description}</p>
                </div>

                <div className="space-y-1.5 p-3.5 rounded-xl bg-primary/5 border border-primary/20">
                  <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">Intern Submission Comments</span>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-semibold">{selectedTask.submissionComment || "No comments provided."}</p>
                </div>
                
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest">
                    Review Notes / Feedback Remarks
                  </label>
                  <textarea
                    placeholder="Provide constructive feedback, required adjustments, or approval remarks..."
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    rows={3}
                    className="flex w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all placeholder-muted-foreground"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/40 select-none">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleReviewWork(false)}
                    disabled={loading}
                    className="font-semibold text-rose-500 border-rose-500/25 hover:bg-rose-500/5 hover:text-rose-600 bg-transparent"
                  >
                    Reject / Ask Changes
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsReviewModalOpen(false);
                        setSelectedTask(null);
                        setFeedbackComment("");
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => handleReviewWork(true)}
                      disabled={loading}
                      className="font-semibold text-white bg-emerald-600 hover:bg-emerald-500 border border-white/5 shadow"
                    >
                      Approve Goal
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 6. View Details & History Modal Overlay */}
      {isDetailsModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="w-full max-w-3xl animate-scaleIn">
            <Card className="border-border shadow-2xl relative rounded-2xl overflow-hidden bg-card/95 backdrop-blur-xl text-card-foreground">
              <button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedTask(null);
                  setComments([]);
                }}
                className="absolute top-4.5 right-4.5 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary/15 transition-colors cursor-pointer z-10"
              >
                <X className="h-5 w-5" />
              </button>
              
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-lg">Task Board & Live Workspace</CardTitle>
                <CardDescription>Full task details, workflow remarks, and continuous team comments.</CardDescription>
              </CardHeader>

              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-border/40">
                  {/* Left Column: Task details & status */}
                  <div className="col-span-1 md:col-span-5 p-5 space-y-4 max-h-[500px] overflow-y-auto pr-3">
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Task Goal</span>
                      <p className="text-sm font-extrabold text-foreground leading-snug">{selectedTask.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedTask.description}</p>
                    </div>

                    <div className="space-y-3.5 border-t border-border/40 pt-4">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Intern Profile</span>
                        <span className="text-xs font-bold text-foreground">{selectedTask.intern.fullName}</span>
                        <span className="text-[10px] text-muted-foreground block">ID: {selectedTask.intern.internId || selectedTask.intern.id}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Assigned By</span>
                        <span className="text-xs font-bold text-foreground">{selectedTask.assigner?.fullName || "Supervisor"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Deadline</span>
                        <span className="text-xs font-bold text-foreground flex items-center space-x-1 mt-0.5">
                          <Clock className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                          <span>{formatDate(selectedTask.deadline)}</span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Current Status</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border mt-1 ${getStatusBadge(selectedTask.status)}`}>
                          {selectedTask.status}
                        </span>
                      </div>
                    </div>

                    {selectedTask.submissionComment && (
                      <div className="space-y-1.5 p-3 rounded-xl bg-primary/5 border border-primary/25 border-t mt-3">
                        <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">Intern Submission Comment</span>
                        <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-semibold">{selectedTask.submissionComment}</p>
                      </div>
                    )}

                    {selectedTask.feedbackComment && (
                      <div className="space-y-1.5 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 border-t mt-3">
                        <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider block">Manager Feedback Remarks</span>
                        <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-semibold">{selectedTask.feedbackComment}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Dynamic Discussion Thread */}
                  <div className="col-span-1 md:col-span-7 flex flex-col h-[500px]">
                    <div className="p-4.5 bg-muted/15 border-b border-border/40 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider flex items-center space-x-1">
                        <MessageSquare className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>Live Workspace Thread</span>
                      </span>
                      {comments.length > 0 && (
                        <span className="text-[9px] bg-indigo-500/10 text-indigo-600 px-2 py-0.5 rounded-full font-bold border border-indigo-500/10 dark:text-indigo-400">
                          {comments.length} Messages
                        </span>
                      )}
                    </div>

                    {/* Comments scroll area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                      {commentsLoading ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-2 text-muted-foreground select-none">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                          <span className="text-xs font-semibold">Retrieving workspace comments...</span>
                        </div>
                      ) : comments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-muted-foreground select-none">
                          <MessageSquare className="h-7 w-7 text-muted-foreground/40" />
                          <p className="text-xs font-semibold">No comments posted yet.</p>
                          <p className="text-[10px] text-muted-foreground/80 max-w-[220px]">
                            Ask questions, provide notes, or send links to sync with your team.
                          </p>
                        </div>
                      ) : (
                        comments.map((msg) => {
                          const isMe = currentUserId === msg.senderId;
                          const senderInitials = msg.sender.fullName
                            ? msg.sender.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                            : "U";
                          const senderRole = msg.sender.role || "INTERN";

                          return (
                            <div key={msg.id} className={`flex items-start space-x-2.5 ${isMe ? "flex-row-reverse space-x-reverse" : ""}`}>
                              {/* Avatar */}
                              <div className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-extrabold text-white shrink-0 shadow-sm border",
                                isMe 
                                  ? "bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-400/20" 
                                  : senderRole === "FOUNDER" || senderRole === "HR"
                                  ? "bg-gradient-to-br from-amber-500 to-orange-500 border-amber-400/20"
                                  : "bg-gradient-to-br from-cyan-500 to-blue-500 border-cyan-400/20"
                              )}>
                                {senderInitials}
                              </div>

                              {/* Message bubble */}
                              <div className="max-w-[75%] space-y-0.5">
                                <div className={`flex items-center space-x-1.5 ${isMe ? "flex-row-reverse space-x-reverse" : ""}`}>
                                  <span className="text-[10px] font-bold text-foreground">{msg.sender.fullName}</span>
                                  <span className={cn(
                                    "text-[8px] font-extrabold px-1 rounded uppercase tracking-wide border",
                                    senderRole === "FOUNDER" || senderRole === "HR"
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/10 dark:text-amber-400"
                                      : "bg-cyan-500/10 text-cyan-600 border-cyan-500/10 dark:text-cyan-400"
                                  )}>
                                    {senderRole}
                                  </span>
                                </div>
                                <div className={cn(
                                  "p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-xs border",
                                  isMe 
                                    ? "bg-indigo-500/10 text-indigo-700 border-indigo-500/10 dark:text-indigo-300 rounded-tr-none" 
                                    : "bg-muted/30 text-foreground border-border/40 rounded-tl-none"
                                )}>
                                  {msg.content}
                                </div>
                                <span className={cn(
                                  "text-[8px] text-muted-foreground/80 block mt-0.5 font-medium",
                                  isMe ? "text-right" : ""
                                )}>
                                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={commentsEndRef} />
                    </div>

                    {/* Chat input form */}
                    <form onSubmit={handleAddComment} className="p-3 border-t border-border/40 bg-muted/10 flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Write a message or paste work link..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-1 h-9 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1.5 focus:ring-primary transition-all font-medium"
                      />
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={!newComment.trim()}
                        className="h-9 w-9 p-0 flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border border-white/5 shadow-md active:scale-95 transition-all text-white shrink-0 cursor-pointer"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
