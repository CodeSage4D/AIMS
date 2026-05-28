"use client";

import React, { useState, useEffect } from "react";
import { FileText, ShieldCheck, CheckCircle2, XCircle, AlertCircle, Printer, Edit3, Save, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";

interface DocumentDetail {
  id: string;
  internId: string;
  type: "OFFER_LETTER" | "NDA" | "ID_CARD";
  content: any;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DEACTIVATED";
  approvedById?: string;
  approvedBy?: { fullName: string; role: string };
  approvedAt?: string;
  signature?: string;
  notes?: string;
  createdAt: string;
  intern: {
    fullName: string;
    internId: string;
    email: string;
    roleDomain: string;
    department: string;
  };
}

export default function ApprovalsPage() {
  const [documents, setDocuments] = useState<DocumentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/documents/approvals");
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents);
        setError(null);
      } else {
        setError(data.error || "Failed to load generated documents.");
      }
    } catch (err) {
      setError("An unexpected error occurred while fetching approvals.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDoc = (doc: DocumentDetail) => {
    setSelectedDoc(doc);
    setEditContent(JSON.parse(JSON.stringify(doc.content)));
    setAdminNotes(doc.notes || "");
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedDoc || !editContent) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/documents/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: selectedDoc.id,
          action: "EDIT",
          content: editContent,
          notes: adminNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Update local items
        setDocuments((prev) =>
          prev.map((d) => (d.id === selectedDoc.id ? { ...d, content: editContent, notes: adminNotes } : d))
        );
        setSelectedDoc((prev) => prev ? { ...prev, content: editContent, notes: adminNotes } : null);
        setIsEditing(false);
        alert("Draft content updated successfully.");
      } else {
        alert(data.error || "Failed to save edits.");
      }
    } catch (err) {
      alert("Error occurred while saving modifications.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAndSign = async (docId: string) => {
    if (!confirm("Are you sure you want to digitally sign and approve this official document?")) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/documents/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docId,
          action: "APPROVE",
          notes: adminNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Document approved and digitally signed successfully.");
        await fetchDocuments();
        // Update selected document state
        const updated = data.document;
        setSelectedDoc((prev) => prev && prev.id === docId ? { ...prev, ...updated } : prev);
      } else {
        alert(data.error || "Approval failed.");
      }
    } catch (err) {
      alert("Error occurred during signing.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (docId: string) => {
    const feedback = prompt("Please provide a reason or modification instructions for this rejection:");
    if (feedback === null) return; // Cancelled
    try {
      setSubmitting(true);
      const res = await fetch("/api/documents/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docId,
          action: "REJECT",
          notes: feedback || "Rejected during administrative review",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Document draft marked as REJECTED.");
        await fetchDocuments();
        const updated = data.document;
        setSelectedDoc((prev) => prev && prev.id === docId ? { ...prev, ...updated } : prev);
      } else {
        alert(data.error || "Rejection failed.");
      }
    } catch (err) {
      alert("Error occurred during rejection.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateCard = async (docId: string) => {
    const feedback = prompt("Please provide a compliance reason for deactivating this credential:");
    if (feedback === null) return; // Cancelled
    try {
      setSubmitting(true);
      const res = await fetch("/api/documents/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docId,
          action: "DEACTIVATE",
          notes: feedback || "Credential deactivated by compliance.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Credential deactivated successfully.");
        await fetchDocuments();
        const updated = data.document;
        setSelectedDoc((prev) => prev && prev.id === docId ? { ...prev, ...updated } : prev);
      } else {
        alert(data.error || "Deactivation failed.");
      }
    } catch (err) {
      alert("Error occurred during deactivation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateCard = async (docId: string) => {
    if (!confirm("Are you sure you want to reactivate and digitally re-sign this deactivated credential?")) return;
    try {
      setSubmitting(true);
      const res = await fetch("/api/documents/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: docId,
          action: "ACTIVATE",
          notes: adminNotes || "Credential reactivated.",
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Credential reactivated and signed successfully.");
        await fetchDocuments();
        const updated = data.document;
        setSelectedDoc((prev) => prev && prev.id === docId ? { ...prev, ...updated } : prev);
      } else {
        alert(data.error || "Reactivation failed.");
      }
    } catch (err) {
      alert("Error occurred during reactivation.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredDocs = documents.filter((doc) => {
    const typeMatch = filterType === "ALL" || doc.type === filterType;
    const statusMatch = filterStatus === "ALL" || doc.status === filterStatus;
    return typeMatch && statusMatch;
  });

  const getGroupedDocs = () => {
    const groups: { [monthYear: string]: { [internKey: string]: DocumentDetail[] } } = {};
    
    // Sort documents desc by createdAt so latest groups are first
    const sorted = [...filteredDocs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    sorted.forEach((doc) => {
      const date = new Date(doc.createdAt);
      const monthYear = date.toLocaleString("en-US", { month: "long", year: "numeric" });
      const internKey = `${doc.intern.internId} - ${doc.intern.fullName}`;
      
      if (!groups[monthYear]) {
        groups[monthYear] = {};
      }
      if (!groups[monthYear][internKey]) {
        groups[monthYear][internKey] = [];
      }
      groups[monthYear][internKey].push(doc);
    });
    
    return groups;
  };

  return (
    <div className="space-y-6 select-none print:p-0 print:m-0">
      {/* Page Header (Hidden in Print) */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-xl font-heading font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            Founder Compliance & Document Approvals
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Review, live-edit, and digitally sign dynamic corporate credentials for onboarded interns and employees.
          </p>
        </div>
        <Link
          href="/documents"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5 bg-white dark:bg-[#0c1220]/90 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Document Vault
        </Link>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Document Registry List (Hidden in Print) */}
        <div className="lg:col-span-5 space-y-4 print:hidden">
          <div className="bg-white dark:bg-[#0d1222]/90 border border-slate-100 dark:border-white/[0.06] rounded-xl p-4 shadow-sm backdrop-blur-xl">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-wider uppercase mb-3">
              Filters & Search
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-heading font-extrabold text-slate-400 uppercase mb-1">
                  Document Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white font-medium focus:ring-1 focus:ring-primary/40 focus:outline-none"
                >
                  <option value="ALL">All Formats</option>
                  <option value="OFFER_LETTER">Offer Letter</option>
                  <option value="NDA">NDA Agreement</option>
                  <option value="ID_CARD">Digital ID Card</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-heading font-extrabold text-slate-400 uppercase mb-1">
                  Review Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white font-medium focus:ring-1 focus:ring-primary/40 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="APPROVED">Digitally Signed</option>
                  <option value="REJECTED">Rejected / Draft</option>
                  <option value="DEACTIVATED">Deactivated</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0d1222]/90 border border-slate-100 dark:border-white/[0.06] rounded-xl p-4 shadow-sm max-h-[500px] overflow-y-auto space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white tracking-wider uppercase mb-2">
              Generated Records ({filteredDocs.length})
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading document vault files...</div>
            ) : filteredDocs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No matching generated documents found.</div>
            ) : (
              <div className="space-y-4">
                {Object.entries(getGroupedDocs()).map(([monthYear, internsMap]) => (
                  <div key={monthYear} className="space-y-2 border-b border-slate-100/5 dark:border-white/[0.04] pb-3">
                    <h4 className="text-[10px] font-heading font-extrabold text-sky-500 dark:text-sky-400 uppercase tracking-widest px-1">
                      {monthYear}
                    </h4>
                    <div className="pl-2 space-y-3">
                      {Object.entries(internsMap).map(([internKey, docs]) => (
                        <div key={internKey} className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 truncate pl-1.5 border-l-2 border-sky-500/50">
                            {internKey}
                          </p>
                          <div className="pl-1 space-y-1">
                            {docs.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => handleSelectDoc(doc)}
                                className={`w-full text-left p-2 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                                  selectedDoc?.id === doc.id
                                    ? "border-sky-500 bg-sky-50/40 dark:bg-sky-500/5 text-slate-900 dark:text-white"
                                    : "border-slate-100 dark:border-white/5 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-gray-300"
                                }`}
                              >
                                <span className="text-[10px] font-medium flex items-center gap-1.5 truncate">
                                  <FileText className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                                  {doc.type.replace("_", " ")}
                                </span>
                                <span className="shrink-0 scale-90">
                                  {doc.status === "PENDING" && (
                                    <span className="text-[8px] font-extrabold uppercase px-1 py-0.5 rounded bg-amber-500/10 text-amber-500">
                                      Pending
                                    </span>
                                  )}
                                  {doc.status === "APPROVED" && (
                                    <span className="text-[8px] font-extrabold uppercase px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                      Signed
                                    </span>
                                  )}
                                  {doc.status === "REJECTED" && (
                                    <span className="text-[8px] font-extrabold uppercase px-1 py-0.5 rounded bg-red-500/10 text-red-500">
                                      Rejected
                                    </span>
                                  )}
                                  {doc.status === "DEACTIVATED" && (
                                    <span className="text-[8px] font-extrabold uppercase px-1 py-0.5 rounded bg-rose-950/20 text-rose-500 border border-rose-500/20">
                                      Deactivated
                                    </span>
                                  )}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Document Visual Canvas (Print-Ready) */}
        <div className="lg:col-span-7 print:col-span-12 space-y-6">
          {selectedDoc ? (
            <div className="space-y-4">
              {/* Document Info and Action Card (Hidden in Print) */}
              <div className="bg-white dark:bg-[#0d1222]/90 border border-slate-100 dark:border-white/[0.06] rounded-xl p-4 shadow-sm print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Compliance Audit Desk: {selectedDoc.type.replace("_", " ")}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">
                    For Intern: <strong className="text-slate-800 dark:text-white">{selectedDoc.intern.fullName}</strong> ({selectedDoc.intern.internId})
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedDoc.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => setIsEditing((prev) => !prev)}
                        disabled={submitting}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-bold text-slate-700 dark:text-gray-300 cursor-pointer disabled:opacity-50"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        {isEditing ? "View Template" : "Edit Details"}
                      </button>
                      <button
                        onClick={() => handleReject(selectedDoc.id)}
                        disabled={submitting}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-600 dark:text-red-400 border border-red-500/20 cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveAndSign(selectedDoc.id)}
                        disabled={submitting}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-md shadow-sky-600/15 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Approve & Sign
                      </button>
                    </>
                  )}

                  {selectedDoc.status === "APPROVED" && (
                    <>
                      <button
                        onClick={handlePrint}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print / Download PDF
                      </button>
                      <button
                        onClick={() => handleDeactivateCard(selectedDoc.id)}
                        disabled={submitting}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-600 dark:text-red-400 border border-red-500/20 cursor-pointer disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Deactivate Card
                      </button>
                    </>
                  )}

                  {selectedDoc.status === "DEACTIVATED" && (
                    <>
                      <button
                        onClick={() => handleActivateCard(selectedDoc.id)}
                        disabled={submitting}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-md shadow-sky-600/15 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Reactivate & Sign
                      </button>
                      <span className="text-xs font-bold text-red-500 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" />
                        Deactivated Compliance State.
                      </span>
                    </>
                  )}

                  {selectedDoc.status === "REJECTED" && (
                    <span className="text-xs font-bold text-red-500 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4" />
                      Rejected Draft File. Edit terms to resubmit.
                    </span>
                  )}
                </div>
              </div>

              {/* Live Edit Fields Form Panel (Hidden in Print) */}
              {isEditing && selectedDoc.status === "PENDING" && (
                <div className="bg-slate-50 dark:bg-[#080d19] border border-slate-200 dark:border-white/5 rounded-xl p-4 print:hidden space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-1.5">
                    <Edit3 className="h-4 w-4 text-sky-500" />
                    Modify Document Draft Content Variables
                  </h4>

                  {/* EDIT DRAFT FOR OFFER LETTER */}
                  {selectedDoc.type === "OFFER_LETTER" && editContent && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Title Header</label>
                        <input
                          type="text"
                          value={editContent.title || ""}
                          onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Intern/Employee Role</label>
                        <input
                          type="text"
                          value={editContent.role || ""}
                          onChange={(e) => setEditContent({ ...editContent, role: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Department</label>
                        <input
                          type="text"
                          value={editContent.department || ""}
                          onChange={(e) => setEditContent({ ...editContent, department: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Start Date</label>
                        <input
                          type="text"
                          value={editContent.startDate || ""}
                          onChange={(e) => setEditContent({ ...editContent, startDate: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Stipend Details</label>
                        <input
                          type="text"
                          value={editContent.stipend || ""}
                          onChange={(e) => setEditContent({ ...editContent, stipend: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Introduction Clause</label>
                        <textarea
                          rows={3}
                          value={editContent.introduction || ""}
                          onChange={(e) => setEditContent({ ...editContent, introduction: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* EDIT DRAFT FOR NDA */}
                  {selectedDoc.type === "NDA" && editContent && (
                    <div className="grid grid-cols-1 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">NDA Title</label>
                        <input
                          type="text"
                          value={editContent.title || ""}
                          onChange={(e) => setEditContent({ ...editContent, title: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Governing Law Jurisdiction</label>
                        <input
                          type="text"
                          value={editContent.governingLaw || ""}
                          onChange={(e) => setEditContent({ ...editContent, governingLaw: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* EDIT DRAFT FOR ID CARD */}
                  {selectedDoc.type === "ID_CARD" && editContent && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Full Name</label>
                        <input
                          type="text"
                          value={editContent.fullName || ""}
                          onChange={(e) => setEditContent({ ...editContent, fullName: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Employee Role</label>
                        <input
                          type="text"
                          value={editContent.role || ""}
                          onChange={(e) => setEditContent({ ...editContent, role: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Department</label>
                        <input
                          type="text"
                          value={editContent.department || ""}
                          onChange={(e) => setEditContent({ ...editContent, department: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Valid Until</label>
                        <input
                          type="text"
                          value={editContent.validUntil || ""}
                          onChange={(e) => setEditContent({ ...editContent, validUntil: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* ADMIN NOTES */}
                  <div className="text-xs pt-2">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Founder Approver Notes</label>
                    <input
                      type="text"
                      placeholder="Add notes, e.g. 'Approved with standard Bangalore jurisdiction terms.'"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-lg p-2 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={submitting}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white cursor-pointer"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Draft Changes
                    </button>
                  </div>
                </div>
              )}

              {/* RENDER DYNAMIC VISUAL TEMPLATE CANVAS */}
              <div className="bg-white border border-slate-200/80 rounded-xl p-8 shadow-md text-slate-800 max-w-[800px] mx-auto min-h-[600px] flex flex-col justify-between font-serif relative">
                
                {/* Cryptographic Compliance Background Seal Stamp (AIMS Authenticity Overlay) */}
                {selectedDoc.status === "APPROVED" && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none select-none">
                    <ShieldCheck className="h-96 w-96 text-sky-900" />
                  </div>
                )}

                {/* 1. VISUAL RENDER OF OFFER LETTER */}
                {selectedDoc.type === "OFFER_LETTER" && (
                  <div className="space-y-6 text-sm leading-relaxed text-slate-800 font-serif">
                    {/* Header Logo */}
                    <div className="border-b-2 border-slate-900 pb-4 text-center">
                      <h1 className="text-2xl font-sans font-extrabold tracking-widest text-slate-900">AURXON</h1>
                      <p className="text-[10px] font-sans font-bold tracking-widest text-slate-500 uppercase mt-0.5">
                        DB & Software Systems Inc.
                      </p>
                    </div>

                    <div className="text-right text-xs font-sans text-slate-500">
                      Date: {new Date(selectedDoc.createdAt).toLocaleDateString()}
                    </div>

                    <div className="text-center font-sans font-bold text-md text-slate-900 underline tracking-wide">
                      {selectedDoc.content.title}
                    </div>

                    <div className="space-y-4">
                      <p className="font-bold">{selectedDoc.content.salutation}</p>
                      <p className="text-justify">{selectedDoc.content.introduction}</p>
                      
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg font-sans text-xs space-y-2">
                        <div className="grid grid-cols-3">
                          <span className="font-bold text-slate-500">Designated Role:</span>
                          <span className="col-span-2 font-semibold text-slate-950">{selectedDoc.content.role}</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="font-bold text-slate-500">Department Domain:</span>
                          <span className="col-span-2 font-semibold text-slate-950">{selectedDoc.content.department}</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="font-bold text-slate-500">Effective Start Date:</span>
                          <span className="col-span-2 font-semibold text-slate-950">{selectedDoc.content.startDate}</span>
                        </div>
                        <div className="grid grid-cols-3">
                          <span className="font-bold text-slate-500">Stipend Remuneration:</span>
                          <span className="col-span-2 font-semibold text-slate-950">{selectedDoc.content.stipend}</span>
                        </div>
                      </div>

                      <p className="font-sans font-bold text-xs text-slate-900 uppercase tracking-wide">Key Internship Terms & Scope:</p>
                      <ul className="list-disc pl-5 text-xs space-y-1.5 text-justify">
                        {selectedDoc.content.terms?.map((term: string, idx: number) => (
                          <li key={idx}>{term}</li>
                        ))}
                      </ul>

                      <p className="pt-2">{selectedDoc.content.closing}</p>
                    </div>

                    {/* Bottom Signature Seals */}
                    <div className="pt-8 border-t border-slate-100 flex items-end justify-between font-sans">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Authorized Officer</p>
                        <p className="text-sm font-extrabold text-slate-900 mt-2">AURXON HR Compliance</p>
                      </div>

                      {/* Cryptographic Digital Signature Block */}
                      <div className="text-right">
                        {selectedDoc.status === "APPROVED" ? (
                          <div className="bg-emerald-50 border border-emerald-200/60 rounded-lg p-2.5 max-w-[320px] text-left">
                            <span className="text-[8px] font-extrabold text-emerald-600 tracking-wider uppercase block">
                              ✓ Digitally Signed & Approved
                            </span>
                            <span className="text-[9px] font-extrabold text-slate-900 block truncate mt-0.5">
                              Founder Authorized Agent
                            </span>
                            <span className="text-[7px] font-mono text-slate-500 mt-1 block truncate">
                              {selectedDoc.signature}
                            </span>
                            <span className="text-[7px] text-slate-400 block mt-0.5">
                              Approved At: {new Date(selectedDoc.approvedAt!).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <div className="border border-dashed border-slate-200 rounded-lg p-3 text-center text-slate-400 text-[10px] w-48">
                            Pending Digital Signature Stamp
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. VISUAL RENDER OF NDA AGREEMENT */}
                {selectedDoc.type === "NDA" && (
                  <div className="space-y-6 text-sm leading-relaxed text-slate-800 font-serif">
                    <div className="border-b border-slate-900 pb-4 text-center">
                      <h1 className="text-xl font-sans font-black tracking-widest text-slate-900">AURXON COMPLIANCE</h1>
                      <p className="text-[8px] font-sans font-bold text-slate-500 uppercase mt-0.5">
                        Proprietary Protection & Legal Guard Rails
                      </p>
                    </div>

                    <div className="text-center font-sans font-bold text-md text-slate-900 uppercase underline tracking-wider pt-2">
                      {selectedDoc.content.title}
                    </div>

                    <div className="text-xs space-y-4">
                      <p className="text-justify">
                        This Non-Disclosure and Confidentiality Agreement is entered into on this day of <strong>{selectedDoc.content.effectiveDate}</strong>, by and between the corporate entity <strong>{selectedDoc.content.partyA}</strong> and the onboarded Recipient / Intern <strong>{selectedDoc.content.partyB}</strong>.
                      </p>

                      <div className="space-y-3">
                        {selectedDoc.content.clauses?.map((clause: any, idx: number) => (
                          <div key={idx} className="space-y-1">
                            <p className="font-bold font-sans text-[11px] text-slate-950">{clause.title}</p>
                            <p className="text-justify text-slate-700">{clause.text}</p>
                          </div>
                        ))}
                      </div>

                      <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg font-sans text-[10px] space-y-1">
                        <p className="font-bold text-slate-800 uppercase tracking-wide">Governing Law Jurisdiction</p>
                        <p className="text-slate-600">{selectedDoc.content.governingLaw}</p>
                      </div>
                    </div>

                    {/* Signatures Row */}
                    <div className="pt-8 border-t border-slate-100 flex items-end justify-between font-sans text-xs">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Intern Recipient Signature</p>
                        <p className="font-bold text-slate-900 mt-2">{selectedDoc.content.partyB}</p>
                        <span className="text-[8px] text-slate-400 font-mono">Acknowledged digitally upon login</span>
                      </div>

                      <div className="text-right">
                        {selectedDoc.status === "APPROVED" ? (
                          <div className="bg-emerald-50 border border-emerald-200/60 rounded-lg p-2.5 max-w-[320px] text-left">
                            <span className="text-[8px] font-extrabold text-emerald-600 tracking-wider uppercase block">
                              ✓ Authenticated Compliance Lock
                            </span>
                            <span className="text-[9px] font-extrabold text-slate-900 block truncate mt-0.5">
                              Founder Approved System
                            </span>
                            <span className="text-[7px] font-mono text-slate-500 mt-1 block truncate">
                              {selectedDoc.signature}
                            </span>
                          </div>
                        ) : (
                          <div className="border border-dashed border-slate-200 rounded-lg p-3 text-center text-slate-400 text-[10px] w-48">
                            Pending Authorized Seal
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. VISUAL RENDER OF DIGITAL ID CARD (Enterprise Corporate Badge) */}
                {selectedDoc.type === "ID_CARD" && (
                  <div className="font-sans py-4 flex flex-col items-center justify-center min-h-[480px]">
                    
                    {/* Visual Vertical Badge Mockup */}
                    <div className="w-[300px] h-[460px] rounded-2xl border border-slate-200/80 bg-gradient-to-b from-slate-950 via-[#0a0e1a] to-slate-950 text-white shadow-2xl p-6 relative overflow-hidden flex flex-col justify-between items-center text-center">
                      
                      {/* Top Glacial Accent Mesh Background */}
                      <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-transparent pointer-events-none" />
                      
                      {/* Top Branded Emblem */}
                      <div className="z-10">
                        <span className="text-md font-heading font-extrabold tracking-widest text-white">
                          {selectedDoc.content.companyName}
                        </span>
                        <div className="h-[1px] w-12 bg-sky-500 mx-auto mt-1" />
                        <span className="text-[8px] font-bold text-sky-400 tracking-widest uppercase block mt-1">
                          Enterprise Pass
                        </span>
                      </div>

                      {/* Avatar Circle & ID Ring */}
                      <div className="z-10 flex flex-col items-center mt-3">
                        <div className="h-24 w-24 rounded-full border-2 border-sky-400/60 bg-sky-950/40 backdrop-blur-md flex items-center justify-center text-3xl font-heading font-black text-sky-400 shadow-lg shadow-sky-500/10 select-none overflow-hidden">
                          {selectedDoc.content.fullName ? selectedDoc.content.fullName[0].toUpperCase() : "A"}
                        </div>

                        <h3 className="text-md font-bold mt-3 text-white truncate max-w-[240px]">
                          {selectedDoc.content.fullName}
                        </h3>
                        <span className="text-[10px] font-semibold text-sky-400 uppercase tracking-widest mt-0.5">
                          {selectedDoc.content.role}
                        </span>
                      </div>

                      {/* Info Panel Details */}
                      <div className="w-full z-10 grid grid-cols-2 gap-y-2.5 gap-x-2 border-t border-white/[0.08] pt-4 text-left text-[10px] text-gray-300">
                        <div>
                          <span className="text-gray-500 font-extrabold uppercase block text-[8px]">ID Badge:</span>
                          <span className="font-mono text-sky-300 font-semibold">{selectedDoc.content.internId}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-extrabold uppercase block text-[8px]">Department:</span>
                          <span className="font-semibold">{selectedDoc.content.department}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-extrabold uppercase block text-[8px]">Joining Date:</span>
                          <span className="font-semibold">{selectedDoc.content.joiningDate}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 font-extrabold uppercase block text-[8px]">Valid Until:</span>
                          <span className="font-semibold text-sky-300">{selectedDoc.content.validUntil}</span>
                        </div>
                      </div>

                      {/* Bottom Barcode, Verification Shield and QR representation */}
                      <div className="w-full z-10 mt-2 flex flex-col items-center">
                        {/* Simulation Barcode */}
                        <div className="h-6 w-full flex items-center justify-center font-mono text-[9px] tracking-[6px] text-gray-400 font-bold bg-white/5 border border-white/10 rounded px-2 select-none">
                          {selectedDoc.content.barcode}
                        </div>
                        
                        <div className="w-full mt-3 flex items-center justify-center">
                          {selectedDoc.status === "APPROVED" ? (
                            <div className="text-[7px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3 shrink-0" />
                              Digitally Signed & Validated
                            </div>
                          ) : (
                            <div className="text-[7px] text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              Pending Compliance Approval
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0d1222]/90 border border-slate-100 dark:border-white/[0.06] rounded-xl p-16 text-center shadow-sm backdrop-blur-xl print:hidden">
              <FileText className="h-10 w-10 text-slate-300 dark:text-white/20 mx-auto" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-white mt-4 tracking-wider uppercase">
                Select a document from the registry
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                Choose any generated draft Offer Letter, NDA confidentiality agreement, or Digital ID Card from the left roster list to load its interactive review canvas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
