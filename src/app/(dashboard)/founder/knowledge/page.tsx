"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Plus, CheckCircle, XCircle, ChevronRight, Shield, AlertTriangle, ArrowUpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface KnowledgeDoc {
  id: string;
  title: string;
  category: string;
  content: string;
  version: number;
  roleBarrier: string;
  status: string;
  creator?: { fullName: string };
  approvedBy?: { fullName: string };
  createdAt: string;
  updatedAt: string;
}

export default function FounderKnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Upload Form state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: "",
    category: "POLICY",
    content: "",
    roleBarrier: "INTERN",
  });

  // Edit/Upgrade version modal state
  const [editingDoc, setEditingDoc] = useState<KnowledgeDoc | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editBarrier, setEditBarrier] = useState("INTERN");

  const fetchDocs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/knowledge");
      if (!res.ok) {
        throw new Error("Failed to load policy documents registry.");
      }
      const data = await res.json();
      setDocs(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load compliance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(uploadData),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit policy document.");
      }

      setSuccess(`Successfully uploaded policy draft "${uploadData.title}". Enqueued for Founder review.`);
      setUploadData({ title: "", category: "POLICY", content: "", roleBarrier: "INTERN" });
      setIsUploadOpen(false);
      fetchDocs();
    } catch (err: any) {
      setError(err.message || "Upload process failed.");
    }
  };

  const handleReviewAction = async (docId: string, action: "APPROVE" | "REJECT") => {
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, action }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resolve document approval.");
      }

      setSuccess(`Successfully ${action === "APPROVE" ? "approved & indexed" : "rejected"} the policy draft.`);
      fetchDocs();
    } catch (err: any) {
      setError(err.message || "Action failed.");
    }
  };

  const handleUpgradeVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoc) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId: editingDoc.id,
          action: "UPDATE_VERSION",
          title: editTitle,
          content: editContent,
          roleBarrier: editBarrier,
          version: editingDoc.version,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upgrade document version.");
      }

      setSuccess(`Successfully upgraded policy "${editTitle}" to version v${editingDoc.version + 1}.`);
      setEditingDoc(null);
      fetchDocs();
    } catch (err: any) {
      setError(err.message || "Upgrade failed.");
    }
  };

  const pendingDocs = docs.filter((d) => d.status === "PENDING");
  const activeDocs = docs.filter((d) => d.status === "APPROVED");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-xl font-heading font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>AI Knowledge Base & Versioning Index</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Administer official corporate SOPs, policy parameters, and version iterations securely
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setError(null);
            setSuccess(null);
            setIsUploadOpen(true);
          }}
          className="h-9 font-bold flex items-center space-x-1.5 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Upload Policy Draft</span>
        </Button>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          {success}
        </div>
      )}

      {/* Main Roster Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Pending Draft Queue */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-heading font-extrabold text-foreground tracking-wider uppercase flex items-center space-x-1.5">
              <Shield className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>Pending Review Queue ({pendingDocs.length})</span>
            </h2>
            
            {loading ? (
              <p className="text-xs text-muted-foreground">Syncing pending roster...</p>
            ) : pendingDocs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No policy drafts currently awaiting review.</p>
            ) : (
              <div className="space-y-3.5">
                {pendingDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-lg bg-secondary/10 border border-border/40 hover:border-border/80 transition-all space-y-3"
                  >
                    <div>
                      <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full inline-block">
                        {doc.category}
                      </span>
                      <h4 className="text-xs font-bold text-foreground mt-1.5">{doc.title}</h4>
                      <p className="text-[10px] text-muted-foreground mt-1 leading-normal max-h-20 overflow-y-auto whitespace-pre-wrap">
                        {doc.content}
                      </p>
                    </div>

                    <div className="border-t border-border/25 pt-2 flex items-center justify-between text-[9px] text-slate-500 font-medium">
                      <span>Author: {doc.creator?.fullName || "HR Manager"}</span>
                      <span>Barrier: {doc.roleBarrier}</span>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleReviewAction(doc.id, "APPROVE")}
                        className="flex-1 h-8 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 hover:border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center justify-center space-x-1 cursor-pointer transition-all"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Approve & Index</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewAction(doc.id, "REJECT")}
                        className="h-8 w-8 rounded bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 hover:border-destructive/35 text-destructive flex items-center justify-center cursor-pointer transition-all"
                        title="Reject Policy"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Active Indexed Policies */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-heading font-extrabold text-foreground tracking-wider uppercase flex items-center space-x-1.5">
              <BookOpen className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Active AI Retrieval Index ({activeDocs.length})</span>
            </h2>

            {loading ? (
              <p className="text-xs text-muted-foreground">Syncing active index...</p>
            ) : activeDocs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No approved guidelines found. Default system policies apply.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-5 rounded-lg bg-secondary/15 border border-border/40 hover:border-border/80 flex flex-col justify-between space-y-4 transition-all relative overflow-hidden group"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-block">
                          {doc.category}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-500 border border-border px-1.5 py-0.5 rounded">
                          v{doc.version}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-foreground mt-2">{doc.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-2 leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">
                        {doc.content}
                      </p>
                    </div>

                    <div className="border-t border-border/30 pt-3 flex flex-col space-y-2 text-[9px] text-slate-500 font-semibold">
                      <div className="flex items-center justify-between">
                        <span>Approved By: {doc.approvedBy?.fullName || "Founder"}</span>
                        <span className="text-cyan-400 bg-cyan-500/5 px-1.5 py-0.5 rounded border border-cyan-500/10">
                          Clearance: {doc.roleBarrier}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingDoc(doc);
                          setEditTitle(doc.title);
                          setEditContent(doc.content);
                          setEditBarrier(doc.roleBarrier);
                        }}
                        className="mt-1 h-8 rounded bg-primary/10 hover:bg-primary border border-primary/20 hover:border-primary text-primary hover:text-primary-foreground text-[10px] font-bold flex items-center justify-center space-x-1 cursor-pointer transition-all"
                      >
                        <ArrowUpCircle className="h-3.5 w-3.5" />
                        <span>Upgrade Revision version</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RENDER MODAL A: UPLOAD NEW POLICY DRAFT */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsUploadOpen(false)}
          />
          <div className="relative bg-card border border-border/80 w-full max-w-xl rounded-lg shadow-2xl p-6 overflow-hidden animate-fadeIn text-left">
            <div className="border-b border-border/40 pb-4 mb-4">
              <h3 className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                <Plus className="h-4.5 w-4.5 text-primary shrink-0" />
                <span>Upload New Policy Document Draft</span>
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Drafts require official approval by the Founder before indexing into the active AI query index
              </p>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-4">
              <Input
                label="Policy Document Title (Required)"
                placeholder="e.g. Leave Application Standard Operating Procedure"
                value={uploadData.title}
                onChange={(e) => setUploadData((prev) => ({ ...prev, title: e.target.value }))}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    value={uploadData.category}
                    onChange={(e) => setUploadData((prev) => ({ ...prev, category: e.target.value }))}
                    className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer"
                  >
                    <option value="POLICY">POLICY</option>
                    <option value="SOP">SOP</option>
                    <option value="HR_GUIDELINE">HR GUIDELINE</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Minimum Clearance Barrier</span>
                  </label>
                  <select
                    value={uploadData.roleBarrier}
                    onChange={(e) => setUploadData((prev) => ({ ...prev, roleBarrier: e.target.value }))}
                    className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer font-semibold"
                  >
                    <option value="INTERN">INTERN</option>
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="TEAM_LEAD">TEAM_LEAD</option>
                    <option value="HR">HR</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    <option value="FOUNDER">FOUNDER</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                  Policy Text Content (Required)
                </label>
                <textarea
                  placeholder="Paste the official policy text guidelines here..."
                  value={uploadData.content}
                  onChange={(e) => setUploadData((prev) => ({ ...prev, content: e.target.value }))}
                  required
                  rows={6}
                  className="flex w-full rounded-md border border-border bg-input px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsUploadOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  className="h-9 text-xs font-bold"
                >
                  Submit for Approval
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENDER MODAL B: UPGRADE DRAFT VERSION / EDIT APPROVED */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setEditingDoc(null)}
          />
          <div className="relative bg-card border border-border/80 w-full max-w-xl rounded-lg shadow-2xl p-6 overflow-hidden animate-fadeIn text-left">
            <div className="border-b border-border/40 pb-4 mb-4">
              <h3 className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                <ArrowUpCircle className="h-4.5 w-4.5 text-primary shrink-0" />
                <span>Upgrade Document Revision version</span>
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Updating will automatically increment the index to <span className="font-bold text-cyan-400">version v{editingDoc.version + 1}</span>
              </p>
            </div>

            <form onSubmit={handleUpgradeVersionSubmit} className="space-y-4">
              <Input
                label="Policy Document Title (Required)"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
              />

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                  Minimum Clearance Barrier
                </label>
                <select
                  value={editBarrier}
                  onChange={(e) => setEditBarrier(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer font-semibold"
                >
                  <option value="INTERN">INTERN</option>
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="TEAM_LEAD">TEAM_LEAD</option>
                  <option value="HR">HR</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="FOUNDER">FOUNDER</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                  Policy Text Content (Required)
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  required
                  rows={7}
                  className="flex w-full rounded-md border border-border bg-input px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingDoc(null)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  className="h-9 text-xs font-bold"
                >
                  Publish & Re-Index v{editingDoc.version + 1}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
