"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { User, School, Heart, Sparkles, Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_CODES } from "@/lib/roles";

const sortedRoles = Object.keys(ROLE_CODES).sort();


interface MentorOption {
  id: string;
  fullName: string;
  role: string;
}

interface AddInternFormProps {
  mentors: MentorOption[];
}

export default function AddInternForm({ mentors }: AddInternFormProps) {
  const router = useRouter();

  // Active form section tab (1 = Personal, 2 = Academic/Internship, 3 = Emergency/Skills)
  const [activeTab, setActiveTab] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State Values
  const [formData, setFormData] = useState({
    id: "",
    fullName: "",
    gender: "Male",
    dateOfBirth: "",
    email: "",
    phoneNumber: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    university: "",
    degree: "",
    department: "Engineering",
    roleDomain: "Software Engineer", // Default compliant role
    batchSemester: "",
    startDate: "",
    endDate: "",
    employmentType: "INTERN",
    stipendAmount: "",
    paymentStatus: "UNPAID",
    emergencyContactName: "",
    emergencyContactNumber: "",
    skillsInput: "",
    notes: "",
    ssidn: "",
    supervisorId: "",
    username: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    // Basic verification per tab
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Final checks
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
        internId: "",
        id: "",
      };

      const res = await fetch("/api/interns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to onboard new intern.");
      }

      router.push("/interns");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during database save.");
      setLoading(false);
    }
  };

  const calculatePreview = () => {
    const roleCode = ROLE_CODES[formData.roleDomain] || "SWE";

    let yymm = "YYMM";
    if (formData.startDate) {
      const date = new Date(formData.startDate);
      if (!isNaN(date.getTime())) {
        const yy = String(date.getFullYear()).slice(-2);
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        yymm = `${yy}${mm}`;
      }
    }

    let initials = "INIT";
    const name = formData.fullName.trim();
    if (name) {
      const parts = name.split(/\s+/);
      if (parts.length === 1) {
        const word = parts[0].toUpperCase();
        initials = word.length >= 2 ? word.slice(0, 2) : word + "X";
      } else if (parts.length > 1) {
        const firstChar = parts[0][0]?.toUpperCase() || "X";
        const lastChar = parts[parts.length - 1][0]?.toUpperCase() || "X";
        initials = firstChar + lastChar;
      }
    }

    return `AXN-${roleCode}-${yymm}-${initials}01`;
  };

  // Tabs List Headers
  const tabs = [
    { step: 1, label: "Personal Data", icon: User },
    {
      step: 2,
      label: formData.employmentType === "INTERN" ? "Internship Details" : "Employment Details",
      icon: School,
    },
    { step: 3, label: "Compliance & Skills", icon: Heart },
  ];

  return (
    <Card className="border-border/60 max-w-4xl mx-auto shadow-2xl select-none">
      {/* 1. Header with Tab steps tracker */}
      <div className="border-b border-border/40 p-6 bg-secondary/10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <CardTitle>
              {formData.employmentType === "INTERN"
                ? "Intern Onboarding Center"
                : "Employee Onboarding Center"}
            </CardTitle>
            <CardDescription>Enroll a new profile directly into AIMS workspace database.</CardDescription>
          </div>
          <span className="text-xs font-heading font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded">
            STEP {activeTab} OF 3
          </span>
        </div>

        {/* Dynamic step tabs buttons */}
        <div className="flex space-x-2 md:space-x-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isCompleted = activeTab > tab.step;
            const isActive = activeTab === tab.step;

            return (
              <div
                key={tab.step}
                className={cn(
                  "flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-xs font-semibold border transition-all duration-300",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : isCompleted
                    ? "bg-secondary/40 text-emerald-400 border-border/80"
                    : "bg-secondary/15 text-muted-foreground border-transparent"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Icon className="h-4 w-4 shrink-0" />
                )}
                <span className="hidden sm:inline">{tab.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="flex items-center space-x-3 p-3.5 rounded-md bg-destructive/10 border border-destructive/25 text-destructive text-xs animate-pulse">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL & DEMOGRAPHICS */}
          {activeTab === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <Input
                    label="Intern Full Name (Required)"
                    name="fullName"
                    placeholder="Enter full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    Intern Unique ID
                  </label>
                  <div className="flex h-11 w-full items-center justify-between rounded-md border border-cyan-500/25 bg-cyan-500/5 px-3.5 py-2 text-xs font-bold font-mono text-cyan-400 select-all cursor-copy relative overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.08)] border-dashed">
                    <div className="flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span className="tracking-wider">{calculatePreview()}</span>
                    </div>
                    <span className="text-[8px] uppercase font-bold tracking-widest text-cyan-400/70 font-heading bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/10 select-none">
                      Auto Preview
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    Gender
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Input
                  label="Date of Birth"
                  name="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Phone Number"
                  name="phoneNumber"
                  placeholder="e.g. +91 9876543210"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Primary Contact Email (Required)"
                  name="email"
                  type="email"
                  placeholder="name@aurxon.com"
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

              <div className="border-t border-border/40 pt-5 space-y-4">
                <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                  Residential Address
                </span>
                <Input
                  label="Street Address"
                  name="address"
                  placeholder="Enter residential address"
                  value={formData.address}
                  onChange={handleChange}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Input
                    label="City"
                    name="city"
                    placeholder="Enter city"
                    value={formData.city}
                    onChange={handleChange}
                  />
                  <Input
                    label="State"
                    name="state"
                    placeholder="Enter state"
                    value={formData.state}
                    onChange={handleChange}
                  />
                  <Input
                    label="Country"
                    name="country"
                    placeholder="Enter country"
                    value={formData.country}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACADEMIC & INTERNSHIP SPECIFICS */}
          {activeTab === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="University / College (Required)"
                  name="university"
                  placeholder="e.g. Delhi University"
                  value={formData.university}
                  onChange={handleChange}
                  required
                />
                <Input
                  label="Degree Course (Required)"
                  name="degree"
                  placeholder="e.g. B.Tech Computer Science"
                  value={formData.degree}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    Employment Type
                  </label>
                  <select
                    name="employmentType"
                    value={formData.employmentType}
                    onChange={handleChange}
                    className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer font-semibold"
                  >
                    <option value="INTERN">Intern</option>
                    <option value="PERMANENT">Permanent / Full-Time</option>
                    <option value="CONTRACT">Contract</option>
                  </select>
                </div>
                <Input
                  label="Batch / Semester"
                  name="batchSemester"
                  placeholder="e.g. Semester 6 / 2026"
                  value={formData.batchSemester}
                  onChange={handleChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    Core Department
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Product">Product</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Role Domain</span>
                    <span className="text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-1.5 py-0.5 rounded">
                      Code: {ROLE_CODES[formData.roleDomain] || "N/A"}
                    </span>
                  </label>
                  <select
                    name="roleDomain"
                    value={formData.roleDomain}
                    onChange={handleChange}
                    className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer font-semibold"
                  >
                    {sortedRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label={formData.employmentType === "INTERN" ? "Internship Start Date (Required)" : "Joining Date (Required)"}
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
                <Input
                  label={formData.employmentType === "INTERN" ? "Internship End Date (Required)" : "Ending Date (Optional)"}
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleChange}
                  required={formData.employmentType === "INTERN"}
                />
              </div>

              <div className="border-t border-border/40 pt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
                <Input
                  label="Stipend Amount (INR / Monthly)"
                  name="stipendAmount"
                  type="number"
                  placeholder="0"
                  value={formData.stipendAmount}
                  onChange={handleChange}
                />
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    Initial Payment Status
                  </label>
                  <select
                    name="paymentStatus"
                    value={formData.paymentStatus}
                    onChange={handleChange}
                    className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer"
                  >
                    <option value="UNPAID">UNPAID</option>
                    <option value="PAID">PAID</option>
                    <option value="N_A">N/A</option>
                  </select>
                </div>
                <div className="flex flex-col space-y-1.5 w-full">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    Supervisor / Mentor Assignment
                  </label>
                  <select
                    name="supervisorId"
                    value={formData.supervisorId}
                    onChange={handleChange}
                    className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer"
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
            </div>
          )}

          {/* TAB 3: COMPLIANCE & SKILLSETS */}
          {activeTab === 3 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="space-y-4">
                <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                  Emergency Medical Contact File
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input
                    label="Emergency Contact Name (Required)"
                    name="emergencyContactName"
                    placeholder="Enter name"
                    value={formData.emergencyContactName}
                    onChange={handleChange}
                    required
                  />
                  <Input
                    label="Emergency Contact Number (Required)"
                    name="emergencyContactNumber"
                    placeholder="Enter contact number"
                    value={formData.emergencyContactNumber}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="border-t border-border/40 pt-5 space-y-4">
                <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                  Skillsets Tags Profile
                </span>
                <Input
                  label="Skills Tags (Separated by Commas)"
                  name="skillsInput"
                  placeholder="e.g. React, Next.js, Node, TypeScript, Figma"
                  value={formData.skillsInput}
                  onChange={handleChange}
                />
              </div>

              <div className="border-t border-border/40 pt-5 space-y-4">
                <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                  National Compliance Identification
                </span>
                <Input
                  label="Social Security ID Number (SSIDN) / National ID"
                  name="ssidn"
                  placeholder="e.g. XXX-XX-XXXX"
                  value={formData.ssidn}
                  onChange={handleChange}
                />
              </div>

              <div className="flex flex-col space-y-1.5 w-full">
                <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                  Internal Notes & Remarks
                </label>
                <textarea
                  name="notes"
                  placeholder="Add administrative notes, interview feedback, or compliance items..."
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  className="flex w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm"
                />
              </div>
            </div>
          )}

          {/* Form Action Controls */}
          <div className="flex justify-between border-t border-border/40 pt-6 mt-6 select-none">
            {activeTab > 1 ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleBack}
                disabled={loading}
              >
                Back Settings
              </Button>
            ) : (
              <div />
            )}

            {activeTab < 3 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNext}
                className="font-semibold"
              >
                Continue Steps
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="font-semibold flex items-center space-x-1.5"
                isLoading={loading}
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>
                  {formData.employmentType === "INTERN"
                    ? "Onboard Intern File"
                    : "Onboard Employee File"}
                </span>
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
