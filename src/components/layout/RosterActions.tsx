"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface RosterActionsProps {
  internId: string;
  internName: string;
  internDisplayId: string;
  isAdmin: boolean;
}

export default function RosterActions({ internId, internName, internDisplayId, isAdmin }: RosterActionsProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/interns?id=${internId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove intern.");
      }

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center space-x-2">
        <Link href={`/interns/${internId}`}>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0 rounded-md shrink-0 focus:ring-1 border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all"
            title="View Intern Workspace"
          >
            <Eye className="h-3.5 w-3.5 text-primary" />
          </Button>
        </Link>

        {isAdmin && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="h-8 w-8 p-0 rounded-md shrink-0 focus:ring-1 border border-border/40 hover:border-destructive/40 hover:bg-destructive/5 transition-all"
            title="Remove Intern Profile"
          >
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => !loading && setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-card border border-border/80 w-full max-w-md rounded-lg shadow-2xl p-6 overflow-hidden animate-fadeIn text-left">
            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-full bg-destructive/10 border border-destructive/20 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <h3 className="text-sm font-heading font-extrabold text-foreground tracking-tight">
                  Remove Intern Profile
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to permanently remove <span className="font-semibold text-foreground">{internName}</span> (<span className="font-mono text-cyan-400 font-bold">{internDisplayId}</span>) from the AIMS roster?
                </p>
                <p className="text-[11px] text-destructive font-medium border-l border-destructive/35 pl-2.5 mt-2 bg-destructive/5 py-1 rounded">
                  Warning: All associated records including attendance logs, assigned tasks, and compliance document files will be permanently deleted and cannot be undone.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-2.5 rounded bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-semibold">
                {error}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end space-x-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={loading}
                className="font-medium text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDelete}
                isLoading={loading}
                className="font-bold text-xs h-9 bg-destructive hover:bg-destructive-hover border-destructive text-destructive-foreground"
              >
                Permanently Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
