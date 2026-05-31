"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { User, School, Heart, Check, AlertTriangle, Copy, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { ROLE_CODES } from "@/lib/roles";
import { useSession } from "next-auth/react";

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
  const { data: session } = useSession();
  const loggedInRole = (session?.user as any)?.role || "INTERN";
  const isFounder = loggedInRole === "FOUNDER";

  // Active form section tab (1 = Personal, 2 = Academic/Internship, 3 = Emergency/Skills)
  const [activeTab, setActiveTab] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ internId: string; tempPassword: string; fullName: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State Values
  const [formData, setFormData] = useState(() => {
    const randomPass = `AXN-TMP-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
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
      pinCode: "",
      citizenship: "",
      region: "",
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
      linkedIn: "",
      gitHub: "",
      bloodGroup: "",
      bankName: "",
      accountNumber: "",
      ifscCode: "",
      upiId: "",
      branchName: "",
      panCard: "",
      accountHolderName: "",
      paymentPreference: "BANK_TRANSFER",
      tempPassword: randomPass,
      workMode: "Remote",
    };
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
      if (!nameRegex.test(formData.fullName.trim())) {
        setError("Full Name must contain alphabetical letters and spaces only.");
        return;
      }

      // Phone check
      const cleanedPhone = formData.phoneNumber.replace(/[\s\-\(\)]/g, "");
      if (formData.country.toLowerCase() === "india") {
        const isIndian = /^(?:\+91|91)?[6-9]\d{9}$/.test(cleanedPhone);
        if (!isIndian) {
          setError("Indian phone numbers must be exactly 10 digits, starting with a valid mobile prefix (6-9).");
          return;
        }
      } else {
        const isIntl = /^\+\d{7,15}$/.test(cleanedPhone);
        if (!isIntl) {
          setError("International phone numbers must start with a '+' country code followed by 7 to 15 digits.");
          return;
        }
      }

      // PIN code check (if provided)
      if (formData.pinCode) {
        const cleanPin = formData.pinCode.trim();
        if (formData.country.toLowerCase() === "india") {
          if (!/^\d{6}$/.test(cleanPin)) {
            setError("Indian PIN codes must be exactly 6 digits.");
            return;
          }
        } else {
          if (!/^[a-zA-Z0-9\s-]{3,10}$/.test(cleanPin)) {
            setError("International postal codes must be alphanumeric, between 3 and 10 characters.");
            return;
          }
        }
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
    if (!nameRegex.test(formData.emergencyContactName.trim())) {
      setError("Emergency Contact Name must contain alphabetical letters and spaces only.");
      setLoading(false);
      return;
    }
    
    // Emergency Phone check
    const cleanedEmerPhone = formData.emergencyContactNumber.replace(/[\s\-\(\)]/g, "");
    if (formData.country.toLowerCase() === "india") {
      const isIndian = /^(?:\+91|91)?[6-9]\d{9}$/.test(cleanedEmerPhone);
      if (!isIndian) {
        setError("Emergency Contact Number must be a valid 10-digit Indian mobile number.");
        setLoading(false);
        return;
      }
    } else {
      const isIntl = /^\+\d{7,15}$/.test(cleanedEmerPhone);
      if (!isIntl) {
        setError("Emergency Contact Number must start with a '+' country code followed by 7 to 15 digits.");
        setLoading(false);
        return;
      }
    }

    if (formData.accountNumber) {
      if (!/^\d{9,18}$/.test(formData.accountNumber.trim())) {
        setError("Bank account numbers must contain only digits and be between 9 and 18 digits long.");
        setLoading(false);
        return;
      }
    }

    if (formData.ifscCode) {
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(formData.ifscCode.trim())) {
        setError("Indian IFSC codes must be exactly 11 characters (first 4 uppercase letters, 5th character '0', last 6 alphanumeric).");
        setLoading(false);
        return;
      }
    }

    if (formData.upiId) {
      if (!/^[\w.-]+@[\w.-]+$/.test(formData.upiId.trim())) {
        setError("UPI ID must be in a valid format (e.g. handle@bank).");
        setLoading(false);
        return;
      }
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

      setSuccessData({
        internId: data.intern?.internId || data.internId || "Generated ID",
        tempPassword: data.tempPassword,
        fullName: formData.fullName.trim(),
      });
      setLoading(false);
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
    <>
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

          {/* TAB 1: PERSONAL & IDENTITY DETAILS */}
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

              <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/25 text-xs text-indigo-300 leading-relaxed font-semibold">
                Note: A strong, high-entropy corporate temporary password will be generated automatically on the server upon successful verification. You will be able to preview and copy it once onboarding is completed.
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <Input
                    label="PIN / Postal Code"
                    name="pinCode"
                    placeholder={formData.country.toLowerCase() === "india" ? "6-digit PIN" : "Postal Code"}
                    value={formData.pinCode}
                    onChange={handleChange}
                  />
                  <Input
                    label="Citizenship"
                    name="citizenship"
                    placeholder="e.g. Indian"
                    value={formData.citizenship}
                    onChange={handleChange}
                  />
                  <Input
                    label="Region / State"
                    name="region"
                    placeholder="e.g. Delhi"
                    value={formData.region}
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

              <div className="border-t border-border/40 pt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    Work Mode
                  </label>
                  <select
                    name="workMode"
                    value={formData.workMode}
                    onChange={handleChange}
                    disabled={!isFounder}
                    className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer font-semibold"
                  >
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Office Mode">Office Mode</option>
                  </select>
                </div>
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

              <div className="border-t border-border/40 pt-5 space-y-4">
                <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                  Personal Connections & Social Profiles
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="LinkedIn Profile URL"
                    name="linkedIn"
                    placeholder="https://linkedin.com/in/username"
                    value={formData.linkedIn}
                    onChange={handleChange}
                  />
                  <Input
                    label="GitHub Profile URL"
                    name="gitHub"
                    placeholder="https://github.com/username"
                    value={formData.gitHub}
                    onChange={handleChange}
                  />
                  <Input
                    label="Blood Group"
                    name="bloodGroup"
                    placeholder="e.g. O+, AB-"
                    value={formData.bloodGroup}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="border-t border-border/40 pt-5 space-y-4">
                <span className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                  Disbursement Banking Account Profile
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Account Holder Name"
                    name="accountHolderName"
                    placeholder="Exact name as in bank records"
                    value={formData.accountHolderName}
                    onChange={handleChange}
                  />
                  <Input
                    label="Bank Name"
                    name="bankName"
                    placeholder="e.g. State Bank of India"
                    value={formData.bankName}
                    onChange={handleChange}
                  />
                  <Input
                    label="Bank Account Number"
                    name="accountNumber"
                    placeholder="Enter account number"
                    value={formData.accountNumber}
                    onChange={handleChange}
                  />
                  <Input
                    label="IFSC Code"
                    name="ifscCode"
                    placeholder="11-digit IFSC (e.g. SBIN0001234)"
                    value={formData.ifscCode}
                    onChange={handleChange}
                  />
                  <Input
                    label="Branch Name"
                    name="branchName"
                    placeholder="Enter branch name"
                    value={formData.branchName}
                    onChange={handleChange}
                  />
                  <Input
                    label="UPI ID (Optional)"
                    name="upiId"
                    placeholder="e.g. name@okaxis"
                    value={formData.upiId}
                    onChange={handleChange}
                  />
                  <Input
                    label="PAN Card Identifier"
                    name="panCard"
                    placeholder="e.g. ABCDE1234F"
                    value={formData.panCard}
                    onChange={handleChange}
                  />
                  <div className="flex flex-col space-y-1.5 w-full">
                    <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                      Payment Method Preference
                    </label>
                    <select
                      name="paymentPreference"
                      value={formData.paymentPreference}
                      onChange={handleChange}
                      className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="UPI">UPI / Instant Pay</option>
                      <option value="CASH">Direct Cash</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col space-y-1.5 w-full border-t border-border/40 pt-5">
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

    {/* Glassmorphic CSPRNG Credentials Onboarding Success Modal */}
    {successData && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
        <div className="bg-[#0b0f19]/95 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 text-center space-y-6 animate-scaleIn">
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Check className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-heading font-extrabold text-white tracking-wide">
              Onboarding Successful!
            </h3>
            <p className="text-xs text-muted-foreground">
              The candidate file for <strong className="text-white">{successData.fullName}</strong> has been securely generated.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-black/50 border border-white/[0.06] rounded-xl p-4 text-left space-y-3.5">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">
                  Assigned Sequential ID
                </span>
                <code className="text-sm font-mono font-bold text-cyan-400 select-all block mt-1">
                  {successData.internId}
                </code>
              </div>

              <div className="border-t border-white/[0.06] pt-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">
                    Secure Temporary Password
                  </span>
                  <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                    CSPRNG Generated
                  </span>
                </div>
                <div className="flex items-center justify-between bg-black/40 border border-white/[0.04] p-2.5 rounded-lg mt-1.5 font-mono text-sm font-bold text-emerald-400">
                  <code className="select-all">{successData.tempPassword}</code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `ID: ${successData.internId}\nPassword: ${successData.tempPassword}`
                      );
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="p-1 hover:bg-white/10 rounded text-emerald-450 hover:text-emerald-400 transition-all cursor-pointer"
                  >
                    {copied ? <Check className="h-4.5 w-4.5" /> : <Copy className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10px] text-indigo-300 text-left leading-relaxed">
              <strong>Important:</strong> Copy these credentials now. The temporary password is cryptographically salted and hashed. It cannot be retrieved after leaving this screen.
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            className="w-full font-bold h-11 rounded-xl shadow-lg shadow-indigo-600/10 cursor-pointer animate-pulse"
            onClick={() => {
              setSuccessData(null);
              router.push("/interns");
              router.refresh();
            }}
          >
            Continue to Directory
          </Button>
        </div>
      </div>
    )}
    </>
  );
}
