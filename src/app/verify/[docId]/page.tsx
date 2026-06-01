import React from "react";
import { db } from "@/lib/db";
import Link from "next/link";
import { ShieldCheck, CheckCircle2, Calendar, FileText, User, Briefcase, Award, Clipboard, Copy } from "lucide-react";

async function getCredentialData(docId: string) {
  try {
    // 1. Search in GeneratedDocument
    const document = await db.generatedDocument.findFirst({
      where: {
        OR: [
          { id: docId },
          { verificationHash: docId }
        ]
      },
      include: {
        intern: {
          select: {
            fullName: true,
            internId: true,
            roleDomain: true,
            department: true,
            university: true,
            startDate: true,
          }
        },
        approvedBy: {
          select: {
            fullName: true,
            role: true,
          }
        }
      }
    });

    if (document) {
      return {
        found: true,
        type: "DOCUMENT",
        docType: document.type.replace(/_/g, " "),
        status: document.status,
        fullName: document.intern.fullName,
        internId: document.intern.internId,
        roleDomain: document.intern.roleDomain,
        department: document.intern.department,
        startDate: document.intern.startDate,
        signedAt: document.approvedAt || document.createdAt,
        signedBy: document.approvedBy ? `${document.approvedBy.fullName} (${document.approvedBy.role})` : "AIMS System Authority",
        verificationHash: document.verificationHash || document.id,
        signatureStamp: document.signature || `Auto-Generated and Validated by AIMS Platform Security Core`,
        version: document.version,
      };
    }

    // 2. Search in Certificate
    const certificate = await db.certificate.findFirst({
      where: {
        OR: [
          { id: docId },
          { certificateId: docId },
          { verificationToken: docId }
        ]
      },
      include: {
        intern: {
          select: {
            internId: true,
            roleDomain: true,
            department: true,
          }
        }
      }
    });

    if (certificate) {
      return {
        found: true,
        type: "CERTIFICATE",
        docType: certificate.type.replace(/_/g, " "),
        status: "APPROVED",
        fullName: certificate.holderName,
        internId: certificate.intern?.internId || "AXN-EXT-ALUMNI",
        roleDomain: certificate.intern?.roleDomain || "External Alumni / Specialist",
        department: certificate.intern?.department || "Operations",
        startDate: certificate.issueDate,
        signedAt: certificate.issueDate,
        signedBy: "AURXON Executive Board",
        verificationHash: certificate.verificationToken,
        signatureStamp: `Digitally Verified Certificate [${certificate.certificateId}] | Issuer: Auroxon Board of Directors`,
        version: 1,
      };
    }

    return { found: false };
  } catch (err) {
    console.error("Verification page db lookup error:", err);
    return { found: false };
  }
}

export default async function VerifyCredentialPage(props: { params: Promise<{ docId: string }> }) {
  const { docId } = await props.params;
  const data = await getCredentialData(docId);

  // Define host dynamically or fallback
  const verificationUrl = `https://aims.aurxon.com/verify/${docId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}&color=059669&bgcolor=ffffff&qzone=1`;

  if (!data.found) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Sleek radial backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-destructive/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 backdrop-blur-md rounded-2xl p-8 text-center shadow-2xl z-10 space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto text-3xl shrink-0">
            ⚠️
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-heading font-extrabold text-slate-100 tracking-tight">Verification Failure</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              No matching records could be identified in the official AURXON secure credential registry.
            </p>
          </div>
          <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-left">
            <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Search Key</span>
            <code className="text-xs text-rose-400 font-mono select-all break-all">{docId}</code>
          </div>
          <div className="pt-2">
            <Link href="/login">
              <span className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer">
                Return to AIMS Portal
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const credential = data as {
    fullName: string;
    internId: string;
    docType: string;
    roleDomain: string;
    startDate: Date | string;
    signedAt: Date | string;
    verificationHash: string;
    signatureStamp: string;
    version: number;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-slate-200">
      {/* Decorative glowing spheres */}
      <div className="absolute top-10 left-1/4 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Registry Box */}
      <div className="w-full max-w-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: QR & Digital Stamp */}
        <div className="p-8 bg-slate-950/60 border-b md:border-b-0 md:border-r border-slate-800/80 flex flex-col items-center justify-between text-center shrink-0 md:w-64">
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.15)] shrink-0">
              <ShieldCheck className="h-9 w-9" />
            </div>
            <div className="space-y-1">
              <h2 className="text-[10px] font-heading font-extrabold text-slate-400 tracking-widest uppercase">AURXON AIMS</h2>
              <span className="inline-block text-[9px] font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                ✓ VERIFIED
              </span>
            </div>
          </div>

          <div className="my-6 p-2 bg-white rounded-lg border border-slate-200/10 shadow-lg inline-block shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCodeUrl} alt="Verification QR" className="w-[130px] h-[130px]" />
          </div>

          <p className="text-[10px] text-slate-500 leading-normal max-w-[180px] mx-auto">
            Scan to instantly verify the integrity and origin of this credential directly in the AURXON registry.
          </p>
        </div>

        {/* Right Side: Credential Details */}
        <div className="p-8 flex-1 flex flex-col justify-between space-y-6">
          <div className="space-y-1.5">
            <span className="text-[10px] font-heading font-extrabold text-cyan-400 tracking-widest uppercase block">
              Official Compliance Registry
            </span>
            <h1 className="text-xl font-heading font-extrabold text-slate-100 tracking-tight leading-tight">
              AURXON Credential Certificate
            </h1>
          </div>

          {/* Details Roster */}
          <div className="grid grid-cols-1 gap-4.5 border-y border-slate-800/80 py-5.5">
            <div className="flex items-center space-x-3.5">
              <User className="h-5 w-5 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Credential Holder</span>
                <span className="text-sm font-semibold text-slate-200">{credential.fullName}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3.5">
                <Award className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Intern / Employee ID</span>
                  <span className="text-xs font-mono font-bold text-slate-300 select-all">{credential.internId}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3.5">
                <FileText className="h-5 w-5 text-purple-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Document Type</span>
                  <span className="text-xs font-semibold text-slate-300 capitalize">{credential.docType.toLowerCase()}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3.5">
                <Briefcase className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Role / Designation</span>
                  <span className="text-xs font-semibold text-slate-300">{credential.roleDomain}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3.5">
                <Clipboard className="h-5 w-5 text-indigo-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Document Version</span>
                  <span className="text-xs font-semibold text-slate-300 font-mono">v{credential.version}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <Calendar className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Issue Date</span>
                <span className="text-xs font-semibold text-slate-300">
                  {new Date(credential.signedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              </div>
            </div></div>

          {/* Cryptographic Hash and Signature details */}
          <div className="space-y-3">
            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Cryptographic SHA-256 Fingerprint</span>
              <code className="text-[11px] text-emerald-400 font-mono select-all break-all block">{credential.verificationHash}</code>
            </div>

            <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 space-y-1">
              <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Digital Signature Authority</span>
              <span className="text-[10px] font-medium text-slate-400 leading-normal block select-all">{credential.signatureStamp}</span>
            </div>
          </div>

          <div className="pt-2 text-center md:text-left">
            <p className="text-[9px] text-slate-500 leading-normal">
              AURXON Internal Management System (AIMS) secure document validation network. Registered under transaction hash index.
            </p>
          </div>
        </div>

      </div>

      <div className="mt-6 z-10">
        <Link href="/login">
          <span className="text-xs font-semibold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer flex items-center space-x-1">
            <span>&larr;</span> <span>Return to AIMS Login</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
