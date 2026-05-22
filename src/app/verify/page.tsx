"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Calendar,
  User,
  Award,
  ArrowLeft,
  Building,
  CheckCircle,
  FileText
} from "lucide-react";
import Link from "next/link";

interface CertificateResult {
  valid: boolean;
  certificateId: string;
  verificationToken: string;
  holderName: string;
  type: string;
  issueDate: string;
  internDetails?: {
    internId: string;
    department: string;
    roleDomain: string;
  } | null;
}

export default function VerifyCertificatePage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CertificateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/verify?id=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No valid certificate matches this authenticity code.");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please verify your token and try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getFriendlyType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <div className="min-h-screen bg-slate-900 bg-radial-gradient text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 select-none relative overflow-hidden">
      {/* Aurora Ambient Background Effect */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation / Header */}
      <div className="w-full max-w-4xl mx-auto flex items-center justify-between mb-8 z-10">
        <Link
          href="/login"
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-all bg-white/5 border border-white/10 hover:border-white/20 px-3.5 py-2 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Login</span>
        </Link>
        <span className="text-xs font-heading font-extrabold tracking-widest text-indigo-400 uppercase select-none">
          Aurxon Trust Network
        </span>
      </div>

      {/* Main Center Box */}
      <div className="w-full max-w-2xl mx-auto z-10 my-auto">
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 shadow-inner">
            <Award className="h-8 w-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-white tracking-tight">
            Digital Certificate Verification
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Instantly audit and verify the authenticity of credentials, internship completions, and achievement records issued by AURXON.
          </p>
        </div>

        {/* Verification Form Card */}
        <Card className="border-white/[0.08] bg-slate-900/60 backdrop-blur-xl shadow-2xl rounded-3xl p-6 sm:p-8 space-y-6">
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="flex flex-col space-y-1.5">
              <label className="text-[10px] font-heading font-bold text-slate-400 uppercase tracking-widest">
                Certificate ID or Token
              </label>
              <div className="relative flex items-center">
                <Search className="absolute left-4 h-5 w-5 text-slate-500 pointer-events-none shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. AXN-CERT-2026-XXXX or verification_code"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all font-mono tracking-wider"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full h-12 rounded-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg active:scale-98 transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1" />
                  <span>Verifying Credential...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  <span>Verify Credential Authenticity</span>
                </>
              )}
            </Button>
          </form>

          {/* Verification Results Display */}
          {result && (
            <div className="space-y-6 pt-6 border-t border-white/5 animate-fadeIn">
              {/* Status Header Badge */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center space-x-3.5 text-emerald-400">
                <CheckCircle className="h-6 w-6 shrink-0" />
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-widest block font-heading leading-tight">
                    AUTHENTIC CREDENTIAL VERIFIED
                  </span>
                  <span className="text-[11px] text-emerald-500/80 font-medium">
                    This document is digitally validated and permanently recorded on the Aurxon system.
                  </span>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
                  Credential Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Holder Name */}
                  <div className="flex items-start space-x-3 p-3 bg-white/2 border border-white/5 rounded-2xl">
                    <User className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Holder Name</span>
                      <span className="text-sm font-bold text-white mt-0.5 block">{result.holderName}</span>
                    </div>
                  </div>

                  {/* Certificate Type */}
                  <div className="flex items-start space-x-3 p-3 bg-white/2 border border-white/5 rounded-2xl">
                    <Award className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Credential Type</span>
                      <span className="text-sm font-bold text-white mt-0.5 block">{getFriendlyType(result.type)}</span>
                    </div>
                  </div>

                  {/* Issue Date */}
                  <div className="flex items-start space-x-3 p-3 bg-white/2 border border-white/5 rounded-2xl">
                    <Calendar className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Date of Issue</span>
                      <span className="text-sm font-bold text-white mt-0.5 block">{formatDate(result.issueDate)}</span>
                    </div>
                  </div>

                  {/* Certificate ID */}
                  <div className="flex items-start space-x-3 p-3 bg-white/2 border border-white/5 rounded-2xl">
                    <FileText className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Certificate ID</span>
                      <span className="text-sm font-bold text-white font-mono mt-0.5 block tracking-wider uppercase">
                        {result.certificateId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Intern Meta info if any */}
                {result.internDetails && (
                  <div className="p-4 bg-white/2 border border-white/5 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-heading font-extrabold text-indigo-400 uppercase tracking-widest flex items-center space-x-1.5">
                      <Building className="h-3.5 w-3.5" />
                      <span>Authorized Enrollee Program Profile</span>
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-slate-300">
                      <div>
                        <span className="text-[9px] text-slate-500 block font-bold uppercase">Intern ID</span>
                        <span className="font-mono mt-0.5 block text-white select-text">{result.internDetails.internId}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block font-bold uppercase">Department</span>
                        <span className="mt-0.5 block text-white truncate">{result.internDetails.department}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block font-bold uppercase">Domain</span>
                        <span className="mt-0.5 block text-white truncate">{result.internDetails.roleDomain}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verification Failures */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start space-x-3.5 text-rose-400 animate-fadeIn">
              <ShieldAlert className="h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs uppercase font-extrabold tracking-widest block font-heading leading-tight">
                  VERIFICATION FAILED
                </span>
                <p className="text-xs text-rose-500/90 font-medium mt-1 leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center z-10 mt-8">
        <p className="text-[10px] font-medium text-slate-500 tracking-wider">
          © {new Date().getFullYear()} AURXON INC. ALL RIGHTS RESERVED. DIGITAL CRYPTO SECURE PROTOCOL V1.
        </p>
      </div>
    </div>
  );
}
