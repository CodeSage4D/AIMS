"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, Edit, AlertTriangle, Sparkles, User, School, Heart } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ROLE_CODES, parseInternNotes } from "@/lib/roles";
import { cn } from "@/lib/utils";


const sortedRoles = Object.keys(ROLE_CODES).sort();

const AVAILABLE_BADGES = [
  "Intern",
  "Permanent",
  "Engineering",
  "Operations",
  "Design",
  "Product Team",
];

interface MentorOption {
  id: string;
  fullName: string;
  role: string;
}

interface InternData {
  id: string;
  internId: string;
  fullName: string;
  gender: string;
  dateOfBirth: Date | string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  state: string;
  country: string;
  university: string;
  degree: string;
  department: string;
  roleDomain: string;
  batchSemester: string;
  startDate: Date | string;
  endDate: Date | string | null;
  stipendAmount: any;
  paymentStatus: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  skills: string[];
  badges: string[];
  notes: string;
  ssidn: string | null;
  supervisorId: string | null;
  status: string;
  employmentType?: string;
  user?: {
    username: string | null;
    role?: string;
    status?: string;
    tempPassword?: string | null;
  } | null;
}


interface WorkspaceHeaderActionsProps {
  intern: InternData;
  mentors: MentorOption[];
  isAdmin: boolean;
}

export default function WorkspaceHeaderActions({ intern, mentors, isAdmin }: WorkspaceHeaderActionsProps) {
  const router = useRouter();
  
  // Modals state control
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State Values for Update Modal
  const [formData, setFormData] = useState(() => {
    const customFields = parseInternNotes(intern.notes);
    return {
      id: intern.id,
      fullName: intern.fullName,
      gender: intern.gender,
      dateOfBirth: new Date(intern.dateOfBirth).toISOString().split("T")[0],
      email: intern.email,
      phoneNumber: intern.phoneNumber,
      address: intern.address || "",
      city: intern.city || "",
      state: intern.state || "",
      country: intern.country || "India",
      university: intern.university,
      degree: intern.degree,
      department: intern.department,
      roleDomain: intern.roleDomain,
      batchSemester: intern.batchSemester || "",
      startDate: new Date(intern.startDate).toISOString().split("T")[0],
      endDate: intern.endDate ? new Date(intern.endDate).toISOString().split("T")[0] : "",
      employmentType: intern.employmentType || "INTERN",
      stipendAmount: String(intern.stipendAmount),
      paymentStatus: intern.paymentStatus || "UNPAID",
      emergencyContactName: intern.emergencyContactName,
      emergencyContactNumber: intern.emergencyContactNumber,
      skillsInput: intern.skills.join(", "),
      badges: intern.badges || [],
      // Custom profile fields
      notes: customFields.customNotes || "",
      linkedIn: customFields.linkedIn || "",
      gitHub: customFields.gitHub || "",
      bloodGroup: customFields.bloodGroup || "",
      accountHolderName: customFields.accountHolderName || "",
      paymentPreference: customFields.paymentPreference || "BANK_TRANSFER",
      pictureUrl: (customFields as any).pictureUrl || "",
      ssidn: intern.ssidn || "",
      supervisorId: intern.supervisorId || "",
      status: intern.status,
      username: intern.user?.username || "",
      role: intern.user?.role || "INTERN",
      userStatus: intern.user?.status || "APPROVED",
      regeneratePassword: false,
      customPassword: "",
    };
  });



  const [activeTab, setActiveTab] = useState(1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (activeTab === 1) {
      if (!formData.fullName || !formData.email || !formData.phoneNumber || !formData.dateOfBirth) {
        setError("Please complete all required personal fields.");
        return;
      }
      const nameRegex = /^[a-zA-Z\s]+$/;
      const phoneRegex = /^\+?[0-9\s\-]{7,15}$/;
      if (!nameRegex.test(formData.fullName.trim())) {
        setError("Full Name must contain alphabetical letters and spaces only.");
        return;
      }
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        setError("Primary Phone Number must be a valid number containing between 7 and 15 digits.");
        return;
      }
    } else if (activeTab === 2) {
      const isIntern = formData.employmentType === "INTERN";
      if (
        !formData.university ||
        !formData.degree ||
        !formData.roleDomain ||
        !formData.startDate ||
        (isIntern && !formData.endDate)
      ) {
        setError(
          `Please complete all required educational and ${
            isIntern ? "internship" : "employment"
          } fields.`
        );
        return;
      }
    }
    setError(null);
    setActiveTab((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setError(null);
    setActiveTab((prev) => Math.max(prev - 1, 1));
  };

  // REST DELETE Trigger
  const handleDelete = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/interns?id=${intern.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove intern.");
      }

      setIsDeleteOpen(false);
      router.push("/interns");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  // REST PUT Update Trigger
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!formData.emergencyContactName || !formData.emergencyContactNumber) {
      setError("Please fill in emergency contact information before final submission.");
      setLoading(false);
      return;
    }

    const nameRegex = /^[a-zA-Z\s]+$/;
    const phoneRegex = /^\+?[0-9\s\-]{7,15}$/;
    if (!nameRegex.test(formData.emergencyContactName.trim())) {
      setError("Emergency Contact Name must contain alphabetical letters and spaces only.");
      setLoading(false);
      return;
    }
    if (!phoneRegex.test(formData.emergencyContactNumber.trim())) {
      setError("Emergency Contact Number must be a valid number containing between 7 and 15 digits.");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        endDate: formData.employmentType !== "INTERN" && !formData.endDate ? null : formData.endDate,
      };

      const res = await fetch("/api/interns", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile.");
      }

      setIsUpdateOpen(false);
      setLoading(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during database update.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* 1. Onboard Intern button */}
      {isAdmin && (
        <Link href="/interns/add">
          <Button
            variant="primary"
            size="sm"
            className="h-9 text-xs font-semibold font-heading flex items-center space-x-1.5 bg-secondary/80 hover:bg-secondary border border-border/80 text-foreground"
          >
            <PlusCircle className="h-4 w-4 text-primary shrink-0" />
            <span>{intern.employmentType === "INTERN" ? "Onboard Intern" : "Onboard Employee"}</span>
          </Button>
        </Link>
      )}

      {/* 2. Update Intern Profile button */}
      {isAdmin && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setError(null);
            setActiveTab(1);
            setIsUpdateOpen(true);
          }}
          className="h-9 text-xs font-semibold font-heading flex items-center space-x-1.5"
        >
          <Edit className="h-4 w-4 text-primary-foreground shrink-0" />
          <span>{intern.employmentType === "INTERN" ? "Update Intern Profile" : "Update Profile"}</span>
        </Button>
      )}

      {/* 3. Remove Intern button */}
      {isAdmin && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setError(null);
            setIsDeleteOpen(true);
          }}
          className="h-9 text-xs font-semibold font-heading flex items-center space-x-1.5 border-destructive/40 hover:border-destructive/80 hover:bg-destructive/5 text-destructive"
        >
          <Trash2 className="h-4 w-4 shrink-0" />
          <span>{intern.employmentType === "INTERN" ? "Remove Intern" : "Remove Employee"}</span>
        </Button>
      )}

      {/* RENDER A: DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => !loading && setIsDeleteOpen(false)}
          />
          <div className="relative bg-card border border-border/80 w-full max-w-md rounded-lg shadow-2xl p-6 overflow-hidden animate-fadeIn text-left">
            <div className="flex items-start space-x-3.5">
              <div className="p-2 rounded-full bg-destructive/10 border border-destructive/20 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <h3 className="text-sm font-heading font-extrabold text-foreground tracking-tight">
                  {intern.employmentType === "INTERN" ? "Remove Intern Profile" : "Remove Employee Profile"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Are you sure you want to permanently remove <span className="font-semibold text-foreground">{intern.fullName}</span> (<span className="font-mono text-cyan-400 font-bold">{intern.internId}</span>) from the AIMS roster?
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
                onClick={() => setIsDeleteOpen(false)}
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

      {/* RENDER B: UPDATE INTERN PROFILE MODAL */}
      {isUpdateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => !loading && setIsUpdateOpen(false)}
          />
          <div className="relative bg-card border border-border/80 w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden animate-fadeIn text-left flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="border-b border-border/40 p-5 bg-secondary/10 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-heading font-extrabold text-foreground flex items-center space-x-2">
                  <Edit className="h-4.5 w-4.5 text-primary" />
                  <span>
                    {formData.employmentType === "INTERN"
                      ? "Update Intern Workspace Profile"
                      : "Update Employee Workspace Profile"}
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Update database records for {intern.fullName} &bull; ID: <span className="font-mono text-cyan-400 font-bold">{intern.internId}</span>
                </p>
              </div>
              <span className="text-[10px] font-heading font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded uppercase tracking-widest shrink-0">
                Step {activeTab} of 3
              </span>
            </div>

            {/* Step Selector Tabs */}
            <div className="flex border-b border-border/45 bg-secondary/5 p-3 space-x-2 shrink-0">
              {[
                { step: 1, label: "Personal", icon: User },
                {
                  step: 2,
                  label: formData.employmentType === "INTERN" ? "Internship" : "Employment",
                  icon: School,
                },
                { step: 3, label: "Emergency & Skills", icon: Heart },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.step;
                return (
                  <button
                    key={tab.step}
                    type="button"
                    onClick={() => !loading && setActiveTab(tab.step)}
                    className={cn(
                      "flex-1 flex items-center justify-center space-x-2 py-1.5 rounded-md text-[11px] font-semibold border transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-transparent text-muted-foreground border-transparent hover:bg-secondary/40"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body (Scrollable content) */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {error && (
                <div className="flex items-center space-x-3 p-3 rounded-md bg-destructive/10 border border-destructive/25 text-destructive text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="font-semibold">{error}</span>
                </div>
              )}

              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                {/* TAB 1: Personal details */}
                {activeTab === 1 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Full Name (Required)"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                      />
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                          Gender
                        </label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Date of Birth (Required)"
                        name="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        required
                      />
                      <Input
                        label="Phone Number (Required)"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Primary Email Address (Required)"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                      <Input
                        label="Custom Login Username (Optional)"
                        name="username"
                        placeholder="e.g. aaravsharma (Defaults to Intern ID)"
                        value={formData.username}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="border-t border-border/40 pt-4 space-y-4">
                      <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                        Residential Address File
                      </span>
                      <Input
                        label="Street Address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                      />
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="City"
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                        />
                        <Input
                          label="State"
                          name="state"
                          value={formData.state}
                          onChange={handleChange}
                        />
                        <Input
                          label="Country"
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: Internship / Employment Details */}
                {activeTab === 2 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="University / College"
                        name="university"
                        value={formData.university}
                        onChange={handleChange}
                        required
                      />
                      <Input
                        label="Degree Course"
                        name="degree"
                        value={formData.degree}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                          Employment Type
                        </label>
                        <select
                          name="employmentType"
                          value={formData.employmentType}
                          onChange={handleChange}
                          className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer font-semibold"
                        >
                          <option value="INTERN">Intern</option>
                          <option value="PERMANENT">Permanent / Full-Time</option>
                          <option value="CONTRACT">Contract</option>
                        </select>
                      </div>
                      <Input
                        label="Batch / Semester"
                        name="batchSemester"
                        value={formData.batchSemester}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                          Department
                        </label>
                        <select
                          name="department"
                          value={formData.department}
                          onChange={handleChange}
                          className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer"
                        >
                          <option value="Engineering">Engineering</option>
                          <option value="Design">Design</option>
                          <option value="Product">Product</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Operations">Operations</option>
                        </select>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                          <span>Role Domain</span>
                          <span className="text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1 py-0.5 rounded">
                            Code: {ROLE_CODES[formData.roleDomain] || "N/A"}
                          </span>
                        </label>
                        <select
                          name="roleDomain"
                          value={formData.roleDomain}
                          onChange={handleChange}
                          className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer font-semibold"
                        >
                          {sortedRoles.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label={formData.employmentType === "INTERN" ? "Start Date" : "Joining Date"}
                        name="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                      />
                      <Input
                        label={formData.employmentType === "INTERN" ? "End Date" : "Ending Date"}
                        name="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={handleChange}
                        required={formData.employmentType === "INTERN"}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/40 pt-4">
                      <Input
                        label="Stipend (Monthly INR)"
                        name="stipendAmount"
                        type="number"
                        value={formData.stipendAmount}
                        onChange={handleChange}
                      />
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                          Payment Status
                        </label>
                        <select
                          name="paymentStatus"
                          value={formData.paymentStatus}
                          onChange={handleChange}
                          className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer"
                        >
                          <option value="UNPAID">UNPAID</option>
                          <option value="PAID">PAID</option>
                          <option value="N_A">N/A</option>
                        </select>
                      </div>
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                          Supervisor/Mentor
                        </label>
                        <select
                          name="supervisorId"
                          value={formData.supervisorId}
                          onChange={handleChange}
                          className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer"
                        >
                          <option value="">Unassigned</option>
                          {mentors.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.fullName} ({m.role})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/40 pt-4">
                      <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                          Intern Status
                        </label>
                        <select
                          name="status"
                          value={formData.status}
                          onChange={handleChange}
                          className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer font-semibold"
                        >
                          <option value="ONBOARDING">ONBOARDING</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="TERMINATED">TERMINATED</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                          <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
                        </select>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                          User Access Role
                        </label>
                        <select
                          name="role"
                          value={formData.role}
                          onChange={handleChange}
                          disabled={!isAdmin}
                          className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer font-semibold"
                        >
                          <option value="INTERN">INTERN</option>
                          <option value="TEAM_LEAD">TEAM_LEAD</option>
                          <option value="HR">HR</option>
                          <option value="ADMIN">ADMIN</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          <option value="FOUNDER">FOUNDER</option>
                        </select>
                      </div>

                      <div className="flex flex-col space-y-1.5">
                        <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                          Account Login Status (Active/Inactive)
                        </label>
                        <select
                          name="userStatus"
                          value={formData.userStatus}
                          onChange={handleChange}
                          disabled={!isAdmin}
                          className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer font-semibold"
                        >
                          <option value="APPROVED">APPROVED (Active)</option>
                          <option value="PENDING">PENDING (Inactive/Review)</option>
                          <option value="REJECTED">REJECTED (Disabled)</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-border/40 pt-4 mt-4 space-y-4">
                      <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                        Account Password Management
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-secondary/10 p-4 rounded-lg border border-border/40">
                        <div className="flex flex-col space-y-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Current Password</span>
                          <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/5 px-2 py-1.5 rounded border border-cyan-500/10 inline-block w-fit select-all">
                            {intern.user?.tempPassword || "None Stored"}
                          </span>
                        </div>

                        <div className="flex flex-col space-y-1.5">
                          <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Custom Password Override</label>
                          <input
                            type="text"
                            placeholder="Enter new custom password"
                            value={formData.customPassword}
                            onChange={(e) => setFormData((prev) => ({ ...prev, customPassword: e.target.value, regeneratePassword: false }))}
                            className="flex h-9 w-full rounded-md border border-border bg-input px-3.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                          />
                        </div>

                        <div className="flex flex-col justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setFormData((prev) => ({ 
                                ...prev, 
                                regeneratePassword: !prev.regeneratePassword,
                                customPassword: "" 
                              }));
                            }}
                            className={cn(
                              "h-9 px-4 rounded-md text-xs font-bold transition-all border",
                              formData.regeneratePassword
                                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                                : "bg-secondary text-foreground hover:bg-secondary/80 border-border/60"
                            )}
                          >
                            {formData.regeneratePassword ? "✓ Will Regenerate on Save" : "🔄 Re-generate random password"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                )}

                {/* TAB 3: Emergency contact & Skillsets */}
                {activeTab === 3 && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="space-y-4">
                      <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                        Emergency Compliance Contact
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Emergency Contact Name"
                          name="emergencyContactName"
                          value={formData.emergencyContactName}
                          onChange={handleChange}
                          required
                        />
                        <Input
                          label="Emergency Contact Number"
                          name="emergencyContactNumber"
                          value={formData.emergencyContactNumber}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="border-t border-border/40 pt-4 space-y-4">
                      <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                        Technical Skillsets tags
                      </span>
                      <Input
                        label="Skills (Separated by Commas)"
                        name="skillsInput"
                        value={formData.skillsInput}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="border-t border-border/40 pt-4 space-y-3">
                      <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                        Assigned Identity Badges
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {AVAILABLE_BADGES.map((badge) => {
                          const isChecked = formData.badges.includes(badge);
                          return (
                            <label 
                              key={badge} 
                              className={cn(
                                "flex items-center space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer text-xs font-bold",
                                isChecked 
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-extrabold" 
                                  : "bg-secondary/5 border-border/40 text-muted-foreground hover:bg-secondary/10"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const updatedBadges = e.target.checked
                                    ? [...formData.badges, badge]
                                    : formData.badges.filter((b) => b !== badge);
                                  setFormData((prev) => ({ ...prev, badges: updatedBadges }));
                                }}
                                className="rounded border-border bg-input text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                              />
                              <span>{badge}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-border/40 pt-4 space-y-4">
                      <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                        National Compliance Identification
                      </span>
                      <Input
                        label="Social Security ID Number (SSIDN)"
                        name="ssidn"
                        value={formData.ssidn}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="border-t border-border/40 pt-4 space-y-4">
                      <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                        Social & Profile Connections
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input
                          label="LinkedIn Profile URL"
                          name="linkedIn"
                          value={formData.linkedIn}
                          onChange={handleChange}
                        />
                        <Input
                          label="GitHub Profile URL"
                          name="gitHub"
                          value={formData.gitHub}
                          onChange={handleChange}
                        />
                        <Input
                          label="Blood Group"
                          name="bloodGroup"
                          value={formData.bloodGroup}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div className="border-t border-border/40 pt-4 space-y-4">
                      <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                        Picture Attachment
                      </span>
                      <Input
                        label="Picture / Photo URL"
                        name="pictureUrl"
                        placeholder="https://example.com/photo.jpg"
                        value={formData.pictureUrl}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5 w-full border-t border-border/40 pt-4">
                      <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                        Internal Admin Remarks & Notes
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Add private evaluation notes or feedback..."
                        className="flex w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
                      />
                    </div>
                  </div>

                )}
              </form>
            </div>

            {/* Modal Footer Controls */}
            <div className="border-t border-border/40 p-5 bg-secondary/5 flex items-center justify-between shrink-0 select-none">
              {activeTab > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleBack}
                  disabled={loading}
                  className="h-9"
                >
                  Back Settings
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsUpdateOpen(false)}
                  disabled={loading}
                  className="h-9"
                >
                  Cancel
                </Button>
              )}

              {activeTab < 3 ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleNext}
                  className="h-9 font-semibold"
                >
                  Continue Steps
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleUpdateSubmit}
                  isLoading={loading}
                  className="h-9 font-semibold flex items-center space-x-1.5"
                >
                  <Sparkles className="h-4 w-4 text-primary-foreground shrink-0 animate-spin" style={{ animationDuration: "3s" }} />
                  <span>Save Profile Updates</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
