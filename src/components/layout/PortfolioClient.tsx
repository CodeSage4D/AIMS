"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  FolderOpen,
  PlusCircle,
  Link as LinkIcon,
  Trash2,
  Edit,
  Clock,
  CheckCircle,
  Briefcase,
  AlertTriangle,
  FileText,
  UserCheck,
  Search,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectRecord {
  id: string;
  internId: string;
  title: string;
  description: string;
  technologies: string[];
  roleInProject: string;
  documentName?: string | null;
  deliverableUrl?: string | null;
  status: string; // IN_PROGRESS, COMPLETED, ARCHIVED
  assignedById?: string | null;
  reviewNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PortfolioClientProps {
  user: {
    id: string;
    role: string;
    fullName: string;
  };
  currentIntern: any | null; // Null if admin
  initialInterns: {
    id: string;
    internId: string;
    fullName: string;
    roleDomain: string;
    department: string;
  }[];
  initialProjects: ProjectRecord[];
}

export default function PortfolioClient({
  user,
  currentIntern,
  initialInterns,
  initialProjects,
}: PortfolioClientProps) {
  const isIntern = user.role === "INTERN";
  const isAdmin = !isIntern;

  // States
  const [selectedInternId, setSelectedInternId] = useState<string>(
    isIntern ? currentIntern?.id || "" : initialInterns[0]?.id || ""
  );
  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Modals Control
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);

  // Filter & Search (For Admin Sidebar)
  const [searchQuery, setSearchQuery] = useState("");

  // Log / Edit Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formTech, setFormTech] = useState("");
  const [formDocName, setFormDocName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formStatus, setFormStatus] = useState("IN_PROGRESS");
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  // Review Form State
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewStatus, setReviewStatus] = useState("COMPLETED");

  // Fetch Projects for Selected Intern (Admins only)
  const fetchInternProjects = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/portfolio?internId=${id}`);
      if (!res.ok) throw new Error("Failed to load portfolio deliverables.");
      const data = await res.json();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && selectedInternId) {
      fetchInternProjects(selectedInternId);
    }
  }, [selectedInternId]);

  // Submit Project Log (Intern only)
  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formRole.trim() || !formDesc.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      id: editingProjectId || undefined,
      title: formTitle.trim(),
      description: formDesc.trim(),
      roleInProject: formRole.trim(),
      technologies: formTech,
      documentName: formDocName.trim() || undefined,
      deliverableUrl: formUrl.trim() || undefined,
      status: formStatus,
    };

    try {
      const res = await fetch("/api/portfolio", {
        method: editingProjectId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save portfolio log.");

      setSuccess(editingProjectId ? "Contribution updated successfully!" : "New contribution logged successfully!");
      setIsLogModalOpen(false);
      resetLogForm();

      // Reload list
      if (isIntern) {
        // Fetch self again
        const freshRes = await fetch(`/api/portfolio`);
        if (freshRes.ok) setProjects(await freshRes.json());
      } else {
        await fetchInternProjects(selectedInternId);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save project.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Work Assignment (Admin only)
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInternId || !formTitle.trim() || !formRole.trim()) {
      setError("Intern selection, title, and role are required.");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      internId: selectedInternId,
      title: formTitle.trim(),
      description: formDesc.trim(),
      roleInProject: formRole.trim(),
      technologies: formTech,
      deliverableUrl: formUrl.trim() || undefined,
      status: "IN_PROGRESS",
    };

    try {
      const res = await fetch("/api/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign work.");

      setSuccess("Task/Work deliverable assigned successfully!");
      setIsAssignModalOpen(false);
      resetLogForm();
      await fetchInternProjects(selectedInternId);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to assign work.");
    } finally {
      setLoading(false);
    }
  };

  // Submit Review Submission (Admin only)
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProject.id,
          reviewNotes: reviewNotes.trim(),
          status: reviewStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit review.");

      setSuccess("Submission reviewed and recorded successfully!");
      setIsReviewModalOpen(false);
      setReviewNotes("");
      setSelectedProject(null);
      await fetchInternProjects(selectedInternId);

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  };

  // Delete Portfolio Log (Intern only)
  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this contribution log?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/portfolio?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setSuccess("Project log deleted successfully.");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete project log.");
      }
    } catch (err: any) {
      setError(err.message || "Delete failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetLogForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormRole("");
    setFormTech("");
    setFormDocName("");
    setFormUrl("");
    setFormStatus("IN_PROGRESS");
    setEditingProjectId(null);
  };

  const handleEditClick = (p: ProjectRecord) => {
    setFormTitle(p.title);
    setFormDesc(p.description);
    setFormRole(p.roleInProject);
    setFormTech(p.technologies.join(", "));
    setFormDocName(p.documentName || "");
    setFormUrl(p.deliverableUrl || "");
    setFormStatus(p.status);
    setEditingProjectId(p.id);
    setIsLogModalOpen(true);
  };

  // Filtered Roster
  const filteredInterns = initialInterns.filter((i) =>
    i.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.internId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 select-none">
      
      {/* Feedback Alerts */}
      {(success || error) && (
        <div className="fixed top-20 right-6 z-50 max-w-sm space-y-2 animate-fadeIn">
          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold shadow-2xl backdrop-blur-md">
              {success}
            </div>
          )}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-bold shadow-2xl backdrop-blur-md">
              {error}
            </div>
          )}
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-indigo-950/80 via-slate-900/70 to-slate-950/90 p-5 sm:p-7 shadow-xl">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-[50px]" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-white flex items-center space-x-2">
              <FolderOpen className="h-6 w-6 text-indigo-400" />
              <span>Working Contribution Portfolio</span>
            </h2>
            <p className="text-xs text-gray-300 font-medium">
              Chronological development timeline mapping repository commits, deliverable checklists, and supervisor reviews for active enrollees.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isIntern && (
              <Button
                onClick={() => {
                  resetLogForm();
                  setIsLogModalOpen(true);
                }}
                variant="primary"
                size="sm"
                className="h-10 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl px-4 flex items-center space-x-1.5"
              >
                <PlusCircle className="h-4.5 w-4.5" />
                <span>Log Contribution</span>
              </Button>
            )}

            {isAdmin && selectedInternId && (
              <Button
                onClick={() => {
                  resetLogForm();
                  setIsAssignModalOpen(true);
                }}
                variant="primary"
                size="sm"
                className="h-10 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl px-4 flex items-center space-x-1.5"
              >
                <PlusCircle className="h-4.5 w-4.5" />
                <span>Assign Work Goal</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Portfolio Split Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Roster Sidebar (Admins Only) */}
        {isAdmin && (
          <Card className="xl:col-span-1 border-border/60 bg-card/60 backdrop-blur-md p-4 flex flex-col h-[600px] shadow-xl">
            <div className="space-y-3.5 mb-4">
              <span className="text-[10px] font-heading font-bold text-muted-foreground uppercase tracking-widest block">
                Platform Enrollees
              </span>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search roster..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-white/5 border-white/10 text-white rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredInterns.length === 0 ? (
                <p className="text-xs text-muted-foreground font-semibold text-center py-8">No enrollees found.</p>
              ) : (
                filteredInterns.map((intern) => (
                  <button
                    key={intern.id}
                    onClick={() => setSelectedInternId(intern.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer",
                      selectedInternId === intern.id
                        ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400"
                        : "bg-secondary/10 border-border/40 hover:bg-secondary/20"
                    )}
                  >
                    <span className="text-xs font-bold text-foreground block truncate">
                      {intern.fullName}
                    </span>
                    <div className="flex justify-between items-center text-[9px] text-muted-foreground font-semibold mt-0.5">
                      <span>ID: {intern.internId}</span>
                      <span className="bg-white/5 px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider">{intern.department}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </Card>
        )}

        {/* Timeline View (Main Body) */}
        <Card className={cn(
          "border-border/60 bg-card/60 backdrop-blur-md p-5 shadow-xl min-h-[600px]",
          isAdmin ? "xl:col-span-3" : "xl:col-span-4"
        )}>
          <CardHeader className="p-0 border-b border-border/40 pb-4 mb-6">
            <CardTitle className="text-base flex items-center space-x-2">
              <Clock className="h-5 w-5 text-indigo-400" />
              <span>
                {isAdmin
                  ? `${initialInterns.find((i) => i.id === selectedInternId)?.fullName || "Enrollee"}'s Contribution Log`
                  : "My Contribution Logs"}
              </span>
            </CardTitle>
            <CardDescription className="text-[11px]">
              Chronological list of deliverables, project tasks, and reviews.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="py-24 text-center text-xs font-semibold text-muted-foreground animate-pulse">
                Querying contribution timeline...
              </div>
            ) : projects.length === 0 ? (
              <div className="py-24 text-center text-xs font-semibold text-muted-foreground">
                No logs recorded inside this timeline yet.
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-border/40 space-y-8 py-2 ml-4">
                {projects.map((p) => {
                  const isCompleted = p.status === "COMPLETED";
                  return (
                    <div key={p.id} className="relative group">
                      
                      {/* Timeline indicator node */}
                      <span className={cn(
                        "absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center bg-card transition-all",
                        isCompleted
                          ? "border-emerald-500 text-emerald-500"
                          : "border-amber-500 text-amber-500"
                      )}>
                        {isCompleted ? (
                          <CheckCircle className="h-2.5 w-2.5 shrink-0" />
                        ) : (
                          <Clock className="h-2.5 w-2.5 shrink-0 animate-pulse" />
                        )}
                      </span>

                      {/* Main Record Box */}
                      <div className="p-4.5 bg-secondary/15 rounded-2xl border border-border/40 hover:border-indigo-500/35 transition-all duration-300 space-y-3.5 text-left">
                        <div className="flex flex-wrap justify-between items-start gap-2.5">
                          <div>
                            <span className="text-[9px] font-heading font-extrabold uppercase tracking-widest text-indigo-400 block mb-1">
                              {p.roleInProject}
                            </span>
                            <h4 className="text-sm font-extrabold text-white">{p.title}</h4>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                              Created: {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Status label */}
                            <span className={cn(
                              "text-[8.5px] font-heading font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border select-none",
                              isCompleted
                                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                                : "bg-amber-500/10 border-amber-500/25 text-amber-400"
                            )}>
                              {p.status.replace(/_/g, " ")}
                            </span>

                            {/* Assigner indicator */}
                            {p.assignedById && (
                              <span className="text-[8.5px] font-heading font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border bg-purple-500/10 border-purple-500/25 text-purple-400 select-none flex items-center space-x-1">
                                <Briefcase className="h-3 w-3 shrink-0" />
                                <span>ASSIGNED WORK</span>
                              </span>
                            )}

                            {/* Actions (Edit/Delete for Intern, Review for Admin) */}
                            {isIntern && !isCompleted && (
                              <div className="flex items-center space-x-1.5 ml-2">
                                <button
                                  onClick={() => handleEditClick(p)}
                                  className="p-1 rounded text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer"
                                  title="Edit log"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProject(p.id)}
                                  className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                                  title="Delete log"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}

                            {isAdmin && (
                              <Button
                                onClick={() => {
                                  setSelectedProject(p);
                                  setReviewNotes(p.reviewNotes || "");
                                  setReviewStatus(p.status);
                                  setIsReviewModalOpen(true);
                                }}
                                variant="secondary"
                                size="sm"
                                className="h-7 px-2.5 text-[9px] font-extrabold uppercase bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-400 flex items-center space-x-1"
                              >
                                <UserCheck className="h-3 w-3 shrink-0" />
                                <span>Review Log</span>
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-gray-300 font-medium leading-relaxed font-sans">
                          {p.description}
                        </p>

                        {/* Technologies Tags */}
                        {p.technologies && p.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {p.technologies.map((t, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-white/5 border border-white/5 rounded text-[9px] font-bold text-gray-400 select-none"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Deliverables details */}
                        {(p.deliverableUrl || p.documentName) && (
                          <div className="flex flex-wrap gap-4 text-[10px] font-bold text-gray-400 border-t border-border/20 pt-3 mt-3 select-text">
                            {p.documentName && (
                              <span className="flex items-center space-x-1.5">
                                <FileText className="h-3.5 w-3.5 text-indigo-400" />
                                <span>Doc: <strong className="text-gray-300">{p.documentName}</strong></span>
                              </span>
                            )}
                            {p.deliverableUrl && (
                              <a
                                href={p.deliverableUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-1 text-cyan-400 hover:text-cyan-300 hover:underline transition-all"
                              >
                                <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                                <span>Repository / Live URL</span>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Review Notes (Feedback) */}
                        {p.reviewNotes && (
                          <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl space-y-1 mt-3">
                            <span className="text-[9px] font-heading font-extrabold uppercase tracking-widest text-indigo-400 flex items-center space-x-1">
                              <MessageSquare className="h-3 w-3 shrink-0" />
                              <span>Supervisor Feedback Review</span>
                            </span>
                            <p className="text-xs text-gray-300 italic font-medium leading-normal">
                              "{p.reviewNotes}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* MODAL A: LOG/EDIT CONTRIBUTION (Interns only) */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-lg">
            <Card className="border-white/10 bg-[#0b0f19]/85 backdrop-blur-xl shadow-2xl relative text-left">
              <CardHeader className="pb-4">
                <CardTitle>{editingProjectId ? "Update Portfolio Log" : "Log Contribution Record"}</CardTitle>
                <CardDescription>Document your project delivery, code contributions, and links.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogSubmit} className="space-y-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Project / Contribution Title *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Database Compaction Middleware"
                      className="bg-white/5 border-white/10 text-white rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                        Your Project Designation / Role *
                      </label>
                      <Input
                        type="text"
                        required
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value)}
                        placeholder="e.g. Lead Database Developer"
                        className="bg-white/5 border-white/10 text-white rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                        Status Category
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none cursor-pointer"
                      >
                        <option value="IN_PROGRESS" className="bg-[#0b0f19]">In Progress (⏱)</option>
                        <option value="COMPLETED" className="bg-[#0b0f19]">Completed Deliverable (✓)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Contribution Description / Repository Summary *
                    </label>
                    <textarea
                      required
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Detail code changes, architectural solutions, and achievements..."
                      rows={3.5}
                      className="flex w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Technologies Used (Separated by Commas)
                    </label>
                    <Input
                      type="text"
                      value={formTech}
                      onChange={(e) => setFormTech(e.target.value)}
                      placeholder="e.g. Next.js, Prisma, PostgreSQL, Docker"
                      className="bg-white/5 border-white/10 text-white rounded-xl text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                        Associated Document / File Name
                      </label>
                      <Input
                        type="text"
                        value={formDocName}
                        onChange={(e) => setFormDocName(e.target.value)}
                        placeholder="e.g. Database_Schema_v2.pdf"
                        className="bg-white/5 border-white/10 text-white rounded-xl text-xs"
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                        Repository / Deliverable Live Link
                      </label>
                      <Input
                        type="url"
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        placeholder="e.g. https://github.com/..."
                        className="bg-white/5 border-white/10 text-white rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-white/[0.08]">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsLogModalOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1"
                      isLoading={loading}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{editingProjectId ? "Update Record" : "Log Contribution"}</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL B: ASSIGN WORK GOAL (Admins/Founders/Leads) */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-lg">
            <Card className="border-white/10 bg-[#0b0f19]/85 backdrop-blur-xl shadow-2xl relative text-left">
              <CardHeader className="pb-4">
                <CardTitle>Assign New Work Deliverable</CardTitle>
                <CardDescription>Assign a goal, repository milestone, or ticket definition to this intern.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAssignSubmit} className="space-y-4">
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Work / Goal Title *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Implement Prisma DB Compactions"
                      className="bg-white/5 border-white/10 text-white rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Target Role / Contribution Scope *
                    </label>
                    <Input
                      type="text"
                      required
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      placeholder="e.g. Software Engineering Intern"
                      className="bg-white/5 border-white/10 text-white rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Work Specifications / Task Details
                    </label>
                    <textarea
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Provide specifications, files to touch, and acceptance criteria..."
                      rows={3.5}
                      className="flex w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Expected Technologies Used (Commas)
                    </label>
                    <Input
                      type="text"
                      value={formTech}
                      onChange={(e) => setFormTech(e.target.value)}
                      placeholder="e.g. Prisma, PostgreSQL, Node.js"
                      className="bg-white/5 border-white/10 text-white rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Ticket Ref Link / Spec Document URL (Optional)
                    </label>
                    <Input
                      type="url"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      placeholder="e.g. https://github.com/issues/..."
                      className="bg-white/5 border-white/10 text-white rounded-xl text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-white/[0.08]">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsAssignModalOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1"
                      isLoading={loading}
                    >
                      <Briefcase className="h-4 w-4" />
                      <span>Assign Deliverable</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* MODAL C: SUBMISSION REVIEW (Admins/Founders/Leads) */}
      {isReviewModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 transition-opacity animate-fadeIn select-none">
          <div className="w-full max-w-md">
            <Card className="border-white/10 bg-[#0b0f19]/85 backdrop-blur-xl shadow-2xl relative text-left">
              <CardHeader className="pb-4">
                <CardTitle>Review Contribution Log</CardTitle>
                <CardDescription>Evaluate deliverable quality and submit evaluation logs.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                  <div className="bg-secondary/20 p-3 rounded-xl border border-white/5 space-y-1">
                    <span className="text-[8px] font-heading font-extrabold uppercase tracking-widest text-indigo-400 block">
                      Reviewing Submission
                    </span>
                    <strong className="text-xs text-white block">{selectedProject.title}</strong>
                    <p className="text-[10px] text-gray-400 font-medium">Logged by Intern: {selectedProject.roleInProject}</p>
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Review Feedback Notes *
                    </label>
                    <textarea
                      required
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add supervisor analysis, notes, or deliverable approval validation..."
                      rows={3.5}
                      className="flex w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                    />
                  </div>

                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[10px] font-heading font-bold text-gray-400 uppercase tracking-widest">
                      Review Status Decision
                    </label>
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                      className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none cursor-pointer"
                    >
                      <option value="COMPLETED" className="bg-[#0b0f19]">Approve & Mark COMPLETED (✓)</option>
                      <option value="IN_PROGRESS" className="bg-[#0b0f19]">Request Adjustments (IN PROGRESS) (⏱)</option>
                      <option value="ARCHIVED" className="bg-[#0b0f19]">Move to Archive (ARCHIVED) (📦)</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end space-x-3.5 pt-4 border-t border-white/[0.08]">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsReviewModalOpen(false)}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center space-x-1"
                      isLoading={loading}
                    >
                      <UserCheck className="h-4 w-4" />
                      <span>Submit Evaluation Review</span>
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
