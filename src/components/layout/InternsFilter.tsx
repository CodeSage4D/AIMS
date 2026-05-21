"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Search } from "lucide-react";

export default function InternsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local Input States
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [department, setDepartment] = useState(searchParams.get("department") || "");

  // Handles input triggers by pushing custom URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (department) params.set("department", department);

    const query = params.toString();
    router.push(`/interns${query ? `?${query}` : ""}`);
  }, [search, status, department, router]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-secondary/10 p-4 rounded-lg border border-border/40 select-none">
      {/* 1. Keyword search input */}
      <div className="relative md:col-span-2 group">
        <div className="absolute left-3.5 top-[39px] text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none z-10">
          <Search className="h-4.5 w-4.5" />
        </div>
        <Input
          label="Search Roster"
          placeholder="Search by name, email, or AUX ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10.5"
        />
      </div>

      {/* 2. Status Dropdown */}
      <div className="flex flex-col space-y-1.5 w-full">
        <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider select-none">
          Filter Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer"
        >
          <option value="">All Active Enrolls</option>
          <option value="ONBOARDING">Onboarding</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="TERMINATED">Terminated</option>
          <option value="ARCHIVED">Archived Records</option>
        </select>
      </div>

      {/* 3. Department Dropdown */}
      <div className="flex flex-col space-y-1.5 w-full">
        <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider select-none">
          Department
        </label>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer"
        >
          <option value="">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="Design">Design</option>
          <option value="Product">Product</option>
          <option value="Marketing">Marketing</option>
          <option value="Operations">Operations</option>
        </select>
      </div>
    </div>
  );
}
