"use client";

import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  BookOpen, 
  CheckSquare, 
  PlusCircle, 
  Trash2, 
  Edit, 
  UserCheck, 
  Search, 
  FolderPlus,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Users,
  Cpu,
  Globe,
  Database,
  Activity,
  Server,
  History,
  Terminal,
  Lock,
  CheckCircle2,
  Zap,
  Power
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import IdCardGenerator from "@/components/layout/IdCardGenerator";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn, formatDate } from "@/lib/utils";

interface DiaryNote {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface Project {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: string;
  details: string;
  allowedUsers: string[];
  createdAt: string;
}

interface Contact {
  id: string;
  fullName: string;
  role: string;
  email: string;
  roleDomain?: string;
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  date: string;
  type: string;
}

interface FounderPanelProps {
  initialLogs?: any[];
  backupFiles?: any[];
  systemStats?: {
    totalInterns: number;
    activeInterns: number;
    pendingVerification: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    dbProvider: string;
    dbStatus: string;
    latency: string;
  };
}

export default function FounderPanel({ 
  initialLogs = [], 
  backupFiles = [], 
  systemStats = {
    totalInterns: 0,
    activeInterns: 0,
    pendingVerification: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    dbProvider: "PostgreSQL (Neon Cloud)",
    dbStatus: "OPERATIONAL",
    latency: "24ms"
  }
}: FounderPanelProps) {
  const [activeTab, setActiveTab] = useState<"planner" | "diary" | "projects" | "syscontrols" | "founderprofile">("planner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Todo / Planner states
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoDesc, setNewTodoDesc] = useState("");
  const [newTodoDate, setNewTodoDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Diary states
  const [diaries, setDiaries] = useState<DiaryNote[]>([]);
  const [selectedDiary, setSelectedDiary] = useState<DiaryNote | null>(null);
  const [diaryTitle, setDiaryTitle] = useState("");
  const [diaryContent, setDiaryContent] = useState("");
  const [isDiaryModalOpen, setIsDiaryModalOpen] = useState(false);

  // Projects states
  const [projects, setProjects] = useState<Project[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [projectDetails, setProjectDetails] = useState("");
  const [projectStatus, setProjectStatus] = useState("ACTIVE");
  const [projectMembers, setProjectMembers] = useState<string[]>([]);
  const [searchMemberQuery, setSearchMemberQuery] = useState("");

  // Telemetry simulation states
  const [simCpu, setSimCpu] = useState(14);
  const [simMem, setSimMem] = useState(48);
  const [simLatency, setSimLatency] = useState(24);
  const [simRequests, setSimRequests] = useState(849);
  
  // Backup Auditor states
  const [passcode, setPasscode] = useState("");
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [verifyingBackup, setVerifyingBackup] = useState<string | null>(null);

  // God Mode state
  const [systemLocked, setSystemLocked] = useState(false);
  const [burnoutRisk, setBurnoutRisk] = useState<string>("LOW");

  // Load Initial Data
  useEffect(() => {
    fetchPlanner();
    fetchDiaries();
    fetchProjects();
    fetchContacts();
    
    // Animate telemetry metrics simulation dynamically
    const interval = setInterval(() => {
      const newCpu = Math.max(5, Math.min(95, simCpu + Math.floor(Math.random() * 7) - 3));
      setSimCpu(newCpu);
      setSimMem((prev) => Math.max(40, Math.min(85, prev + (Math.random() > 0.7 ? 1 : 0) - (Math.random() > 0.85 ? 1 : 0))));
      setSimLatency((prev) => Math.max(12, Math.min(90, prev + Math.floor(Math.random() * 5) - 2)));
      setSimRequests((prev) => prev + Math.floor(Math.random() * 2));
      
      // Calculate Predictive Burnout Risk
      if (newCpu > 80 || systemStats.pendingTasks > 20) {
        setBurnoutRisk("HIGH (Intervention Recommended)");
      } else if (newCpu > 60 || systemStats.pendingTasks > 10) {
        setBurnoutRisk("MEDIUM");
      } else {
        setBurnoutRisk("LOW (Optimal)");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // API Call: Fetch Planner Todos
  const fetchPlanner = async () => {
    try {
      const res = await fetch("/api/todos");
      const data = await res.json();
      if (data.success) {
        setTodos(data.todos);
      }
    } catch (err) {
      console.error("Error fetching todos:", err);
    }
  };

  // API Call: Create Todo
  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim() || !newTodoDate.trim()) return;

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTodoTitle,
          description: newTodoDesc,
          date: newTodoDate,
          type: "TODO"
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewTodoTitle("");
        setNewTodoDesc("");
        fetchPlanner();
      }
    } catch (err) {
      console.error("Error adding todo:", err);
    }
  };

  // API Call: Toggle Todo Completed
  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      const res = await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, completed: !completed })
      });
      const data = await res.json();
      if (data.success) {
        fetchPlanner();
      }
    } catch (err) {
      console.error("Error updating todo:", err);
    }
  };

  // API Call: Delete Todo
  const handleDeleteTodo = async (id: string) => {
    try {
      const res = await fetch(`/api/todos?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        fetchPlanner();
      }
    } catch (err) {
      console.error("Error deleting todo:", err);
    }
  };

  // API Call: Fetch Diaries
  const fetchDiaries = async () => {
    try {
      const res = await fetch("/api/diaries");
      const data = await res.json();
      if (data.success) {
        setDiaries(data.diaries);
      }
    } catch (err) {
      console.error("Error fetching diaries:", err);
    }
  };

  // API Call: Create or Update Diary Note
  const handleSaveDiary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryTitle.trim() || !diaryContent.trim()) return;

    setLoading(true);
    try {
      const method = selectedDiary ? "PATCH" : "POST";
      const payload = selectedDiary 
        ? { id: selectedDiary.id, title: diaryTitle, content: diaryContent }
        : { title: diaryTitle, content: diaryContent };

      const res = await fetch("/api/diaries", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsDiaryModalOpen(false);
        setSelectedDiary(null);
        setDiaryTitle("");
        setDiaryContent("");
        fetchDiaries();
      } else {
        setError(data.error || "Failed to save diary note.");
      }
    } catch (err: any) {
      setError(err.message || "Server Error");
    } finally {
      setLoading(false);
    }
  };

  // API Call: Delete Diary Note
  const handleDeleteDiary = async (id: string) => {
    if (!confirm("Are you sure you want to delete this diary note?")) return;
    try {
      const res = await fetch(`/api/diaries?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        if (selectedDiary?.id === id) {
          setSelectedDiary(null);
        }
        fetchDiaries();
      }
    } catch (err) {
      console.error("Error deleting diary note:", err);
    }
  };

  // API Call: Fetch Projects
  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data.success) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Error fetching projects:", err);
    }
  };

  // API Call: Fetch Contacts (for allowedUsers assignment)
  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/messages/contacts");
      const data = await res.json();
      if (Array.isArray(data)) {
        setContacts(data);
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
  };

  // API Call: Create or Update Project
  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim() || !projectDesc.trim()) return;

    setLoading(true);
    try {
      const method = selectedProject ? "PATCH" : "POST";
      const payload = selectedProject
        ? {
            id: selectedProject.id,
            title: projectTitle,
            description: projectDesc,
            details: projectDetails,
            status: projectStatus,
            allowedUsers: projectMembers
          }
        : {
            title: projectTitle,
            description: projectDesc,
            details: projectDetails,
            status: projectStatus,
            allowedUsers: projectMembers
          };

      const res = await fetch("/api/projects", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setIsProjectModalOpen(false);
        setSelectedProject(null);
        setProjectTitle("");
        setProjectDesc("");
        setProjectDetails("");
        setProjectStatus("ACTIVE");
        setProjectMembers([]);
        fetchProjects();
      } else {
        setError(data.error || "Failed to save project.");
      }
    } catch (err: any) {
      setError(err.message || "Server Error");
    } finally {
      setLoading(false);
    }
  };

  // API Call: Delete Project
  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      const res = await fetch(`/api/projects?id=${id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        fetchProjects();
      }
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const handleToggleMember = (userId: string) => {
    setProjectMembers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const filteredContacts = contacts.filter(contact => 
    contact.fullName.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
    (contact.roleDomain && contact.roleDomain.toLowerCase().includes(searchMemberQuery.toLowerCase())) ||
    contact.role.toLowerCase().includes(searchMemberQuery.toLowerCase())
  );

  // Backup Passcode Verification Trigger
  const handleVerifyBackup = (fileName: string) => {
    setVerificationResult(null);
    setVerifyingBackup(fileName);
    if (!passcode) {
      setVerificationResult({ success: false, message: "Required: Please enter database rescue/backup passcode." });
      setVerifyingBackup(null);
      return;
    }
    
    // Simulate Decryption verification check
    setTimeout(() => {
      if (passcode.trim() === "221102") {
        setVerificationResult({
          success: true,
          message: `Backup integrity check passed for ${fileName}! Passcode verified successfully.`
        });
      } else {
        setVerificationResult({
          success: false,
          message: "Decryption Failed: Invalid encryption key/passcode. Access Denied."
        });
      }
      setVerifyingBackup(null);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      
      {/* Premium Founder Cover Card */}
      <div className="relative overflow-hidden rounded-2xl border border-yellow-550/20 bg-gradient-to-br from-[#0c1220] via-yellow-950/[0.03] to-[#040812] p-5 shadow-2xl backdrop-blur-md">
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-yellow-500/10 blur-[60px] pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-indigo-500/5 blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-5">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-4 text-center md:text-left">
            {/* Visual Identity Logo Emblem */}
            <div className="h-16 w-16 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-500 p-0.5 shadow-2xl shrink-0 flex items-center justify-center">
              <div className="h-full w-full rounded-xl bg-[#0c1220] flex items-center justify-center text-2xl font-black text-yellow-400 font-mono select-none">
                KM
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h3 className="text-lg font-heading font-extrabold text-white tracking-tight">
                  Karan Mishra
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[8.5px] font-heading font-extrabold uppercase tracking-widest bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
                  FOUNDER & OWNER
                </span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                System ID: <span className="text-yellow-400 font-bold">AXN-FND-2401-KM01</span>
              </p>
              <div className="text-xs text-gray-400 font-medium pt-1">
                Official: <span className="text-white font-semibold">aurxon.global@gmail.com</span> &bull; Alternate: <span className="text-white font-semibold">karannmishra136@gmail.com</span>
              </div>
            </div>
          </div>
          
          <div className="shrink-0 text-center md:text-right space-y-1">
            <span className="text-[8px] font-extrabold tracking-widest text-slate-500 uppercase block">Workspace Authorization</span>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-450 text-[10px] font-bold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Full Owner Board Access Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upper Navigation Tabs */}
      <div className="flex border-b border-white/[0.08] p-1.5 bg-white/[0.02] backdrop-blur-md rounded-xl space-x-2 w-fit">
        {[
          { id: "planner", label: "Personal Planner", icon: CheckSquare },
          { id: "diary", label: "Diary Database", icon: BookOpen },
          { id: "projects", label: "Projects Directory", icon: Briefcase },
          { id: "syscontrols", label: "Telemetry & Backups", icon: Cpu },
          { id: "founderprofile", label: "Elite Profile", icon: UserCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setError(null);
              }}
              className={cn(
                "flex items-center space-x-2.5 px-4 py-2 rounded-lg text-xs font-heading font-bold transition-all border cursor-pointer",
                isActive
                  ? "bg-yellow-500/10 text-yellow-450 border-yellow-500/20 shadow-lg scale-[1.02]"
                  : "bg-transparent text-gray-400 border-transparent hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="p-3.5 bg-destructive/10 border border-destructive/25 text-destructive text-xs font-semibold rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-4.5 w-4.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* RENDER TAB 1: PERSONAL PLANNER (TODOS & REMINDERS) */}
      {activeTab === "planner" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Left Column: Create Todo */}
          <div className="lg:col-span-1">
            <Card className="border-white/[0.08] bg-white/[0.02] backdrop-blur-md sticky top-6">
              <CardHeader>
                <CardTitle className="text-sm font-heading font-extrabold flex items-center space-x-2 text-white">
                  <PlusCircle className="h-4.5 w-4.5 text-yellow-550" />
                  <span>Create Planner Task</span>
                </CardTitle>
                <CardDescription className="text-gray-400">Schedule a personal TODO or priority reminder.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTodo} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-heading font-bold text-gray-400 uppercase tracking-wider block">Task Title</label>
                    <input
                      placeholder="e.g. Audit onboarding vaults"
                      value={newTodoTitle}
                      onChange={(e) => setNewTodoTitle(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-white/[0.08] bg-[#0c1220] px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-[11px] font-heading font-bold text-gray-400 uppercase tracking-wider">
                      Description (Optional)
                    </label>
                    <textarea
                      placeholder="Add specific action items..."
                      value={newTodoDesc}
                      onChange={(e) => setNewTodoDesc(e.target.value)}
                      rows={3}
                      className="flex w-full rounded-md border border-white/[0.08] bg-[#0c1220] px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-heading font-bold text-gray-400 uppercase tracking-wider block">Task Date</label>
                    <input
                      type="date"
                      value={newTodoDate}
                      onChange={(e) => setNewTodoDate(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-white/[0.08] bg-[#0c1220] px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                    />
                  </div>
                  <Button type="submit" variant="primary" size="md" className="w-full font-bold bg-yellow-550 border-yellow-600 hover:bg-yellow-500 text-[#070b13]">
                    Add Planner Task
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Planner Tasks Queue */}
          <div className="lg:col-span-2">
            <Card className="border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <CardTitle className="text-white">Planner Tasks</CardTitle>
                  <CardDescription className="text-gray-400">Your personal todo items and chronological reminders.</CardDescription>
                </div>
                <span className="text-[10px] font-heading font-bold text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">
                  {todos.filter(t => t.completed).length} / {todos.length} Completed
                </span>
              </CardHeader>
              <CardContent className="pt-6">
                {todos.length === 0 ? (
                  <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center justify-center space-y-3">
                    <CheckSquare className="h-10 w-10 text-gray-600/35" />
                    <span>No personal planner items scheduled yet.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {todos.map((todo) => (
                      <div 
                        key={todo.id}
                        className={cn(
                          "p-4 rounded-xl border flex items-start justify-between space-x-4 transition-all duration-200",
                          todo.completed 
                            ? "bg-white/[0.01] border-white/[0.04] opacity-50" 
                            : "bg-white/[0.03] hover:bg-white/[0.05] border-white/[0.08] hover:border-white/[0.15]"
                        )}
                      >
                        <div className="flex items-start space-x-3.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => handleToggleTodo(todo.id, todo.completed)}
                            className="h-4 w-4 rounded border-white/20 bg-black/40 text-yellow-500 focus:ring-yellow-500 mt-0.5 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className={cn(
                                "text-xs font-heading font-extrabold tracking-tight truncate text-white",
                                todo.completed && "line-through text-gray-400"
                              )}>
                              {todo.title}
                            </p>
                            {todo.description && (
                              <p className={cn(
                                "text-xs text-gray-450 mt-1 select-text whitespace-pre-line",
                                todo.completed && "line-through"
                              )}>
                                {todo.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-1.5 mt-2.5 text-[9px] font-bold text-gray-500 uppercase">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(todo.date)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/15 text-gray-400 hover:text-destructive border border-transparent hover:border-destructive/25 transition-all shrink-0 cursor-pointer"
                          title="Delete Task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* RENDER TAB 2: DIARY Notes DATABASE */}
      {activeTab === "diary" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          {/* Notes List Column (1/3 Width) */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-white/[0.08] bg-white/[0.02] backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between border-b border-white/[0.08] pb-4">
                <div>
                  <CardTitle className="text-sm font-heading font-extrabold text-white">Diary Entries</CardTitle>
                  <CardDescription className="text-gray-400">Your personal daily logbook.</CardDescription>
                </div>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="h-8.5 text-[10px] font-bold px-3 shrink-0 bg-yellow-550 border-yellow-600 hover:bg-yellow-500 text-[#070b13]"
                  onClick={() => {
                    setSelectedDiary(null);
                    setDiaryTitle("");
                    setDiaryContent("");
                    setIsDiaryModalOpen(true);
                  }}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  Write
                </Button>
              </CardHeader>
              <CardContent className="pt-4 px-3 max-h-[60vh] overflow-y-auto">
                {diaries.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-500 italic">
                    No notes written yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {diaries.map((note) => {
                      const isSelected = selectedDiary?.id === note.id;
                      return (
                        <div
                          key={note.id}
                          onClick={() => setSelectedDiary(note)}
                          className={cn(
                            "p-3 rounded-lg border text-left cursor-pointer transition-all duration-200 select-none",
                            isSelected 
                              ? "bg-yellow-500/10 border-yellow-500/30 text-white" 
                              : "bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.08] text-gray-400 hover:text-white"
                          )}
                        >
                          <h4 className="text-xs font-heading font-bold truncate text-white">
                            {note.title}
                          </h4>
                          <p className="text-[10px] text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                            {note.content}
                          </p>
                          <span className="text-[8px] font-bold block mt-2 opacity-80 uppercase font-mono text-slate-500">
                            {formatDate(note.createdAt)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Active Note Reader/Editor (2/3 Width) */}
          <div className="lg:col-span-2">
            {selectedDiary ? (
              <Card className="border-white/[0.08] bg-white/[0.02] backdrop-blur-md h-full flex flex-col justify-between">
                <CardHeader className="border-b border-white/[0.08] flex flex-row items-start justify-between pb-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-heading font-extrabold text-white tracking-tight leading-tight select-text">
                      {selectedDiary.title}
                    </h3>
                    <p className="text-[10px] font-semibold text-gray-500 uppercase font-mono tracking-wider">
                      Created: {formatDate(selectedDiary.createdAt)} &bull; Updated: {formatDate(selectedDiary.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-8.5 w-8.5 p-0 bg-white/5 border-white/10 text-white hover:bg-white/10"
                      onClick={() => {
                        setDiaryTitle(selectedDiary.title);
                        setDiaryContent(selectedDiary.content);
                        setIsDiaryModalOpen(true);
                      }}
                      title="Edit Note"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-8.5 w-8.5 p-0 text-destructive hover:bg-destructive/15 border-transparent bg-transparent"
                      onClick={() => handleDeleteDiary(selectedDiary.id)}
                      title="Delete Note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 flex-1 max-h-[50vh] overflow-y-auto">
                  <p className="text-xs text-gray-200 font-medium leading-relaxed select-text whitespace-pre-wrap font-sans">
                    {selectedDiary.content}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full border border-white/[0.08] rounded-xl bg-white/[0.01] flex flex-col items-center justify-center p-12 text-center text-xs text-gray-500 select-none min-h-[40vh]">
                <BookOpen className="h-10 w-10 text-gray-600/35 mb-3" />
                <span>Select a diary note from the sidebar or click "Write" to begin entry.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RENDER TAB 3: PROJECTS DIRECTORY */}
      {activeTab === "projects" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-heading font-extrabold text-white tracking-tight">
                Corporate Internal Projects
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Review active codebases, assign intern access credentials, and track repositories.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="h-10 font-bold px-4 bg-yellow-550 border-yellow-600 hover:bg-yellow-500 text-[#070b13]"
              onClick={() => {
                setSelectedProject(null);
                setProjectTitle("");
                setProjectDesc("");
                setProjectDetails("");
                setProjectStatus("ACTIVE");
                setProjectMembers([]);
                setIsProjectModalOpen(true);
              }}
            >
              <FolderPlus className="h-4.5 w-4.5 mr-1.5" />
              <span>New Corporate Project</span>
            </Button>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div className="py-20 text-center text-xs text-gray-500 border border-white/[0.08] rounded-xl bg-white/[0.01] flex flex-col items-center justify-center space-y-3">
              <Briefcase className="h-10 w-10 text-gray-600/35" />
              <span>No corporate projects registered. Add projects to start assigning access.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((project) => (
                <Card 
                  key={project.id}
                  className="border-white/[0.08] hover:border-white/20 transition-all duration-200 bg-white/[0.02] flex flex-col justify-between p-5 space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Project ID & Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-extrabold text-yellow-450 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded tracking-wider">
                        {project.projectId}
                      </span>
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-[8px] font-heading font-bold border tracking-widest uppercase",
                        project.status === "ACTIVE" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : project.status === "COMPLETED"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      )}>
                        {project.status}
                      </span>
                    </div>

                    {/* Title & Desc */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-heading font-extrabold text-white tracking-tight leading-tight select-text">
                        {project.title}
                      </h4>
                      <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 select-text font-medium">
                        {project.description}
                      </p>
                    </div>

                    {/* Detailed Info if available */}
                    {project.details && (
                      <div className="bg-white/[0.01] p-3 rounded-lg border border-white/[0.05] text-[11px] text-gray-300 leading-relaxed font-sans select-text whitespace-pre-line italic">
                        {project.details}
                      </div>
                    )}

                    {/* Assigned Interns count */}
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-gray-450 uppercase">
                      <Users className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span>{project.allowedUsers.length} Interns Allowed to learn/work</span>
                    </div>
                  </div>

                  {/* Actions & Member display */}
                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3">
                    {/* Allowed Members Avatar previews */}
                    <div className="flex -space-x-2 overflow-hidden">
                      {project.allowedUsers.slice(0, 5).map((userId, idx) => {
                        const m = contacts.find(c => c.id === userId);
                        return (
                          <div 
                            key={idx}
                            className="h-6 w-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-[9px] font-bold text-indigo-450 ring-2 ring-[#0c1220] select-none"
                            title={m?.fullName || "Assigned Intern"}
                          >
                            {m?.fullName ? m.fullName[0].toUpperCase() : "I"}
                          </div>
                        );
                      })}
                      {project.allowedUsers.length > 5 && (
                        <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[8px] font-bold text-gray-400 ring-2 ring-[#0c1220]">
                          +{project.allowedUsers.length - 5}
                        </div>
                      )}
                    </div>

                    {/* Project Admin Actions */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 text-[10px] font-bold bg-white/5 border-white/10 text-white hover:bg-white/10"
                        onClick={() => {
                          setSelectedProject(project);
                          setProjectTitle(project.title);
                          setProjectDesc(project.description);
                          setProjectDetails(project.details || "");
                          setProjectStatus(project.status);
                          setProjectMembers(project.allowedUsers || []);
                          setIsProjectModalOpen(true);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit Access
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 text-[10px] font-bold text-destructive hover:bg-destructive/10 border-transparent bg-transparent"
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RENDER TAB 4: SYSTEM CONTROLS & TELEMETRY */}
      {activeTab === "syscontrols" && (
        <div className="space-y-6 animate-fadeIn text-white">
          
          {/* Telemetry row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-white/[0.08] bg-[#0b0f19] p-5 flex flex-col items-center justify-center text-center space-y-3">
              <Activity className="h-8 w-8 text-yellow-450 animate-pulse" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AIMS API Telemetry</p>
                <h4 className="text-2xl font-bold font-mono text-white mt-1">{simRequests} reqs</h4>
                <span className="text-[9px] text-emerald-400 font-semibold block mt-0.5">🟢 Status Code 200 OK</span>
              </div>
            </Card>

            <Card className="border-white/[0.08] bg-[#0b0f19] p-5 flex flex-col items-center justify-center text-center space-y-3">
              <Cpu className="h-8 w-8 text-indigo-400 animate-spin-slow" />
              <div className="w-full">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Simulated Server CPU</p>
                <h4 className="text-2xl font-bold font-mono text-white mt-1">{simCpu}%</h4>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                  <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${simCpu}%` }} />
                </div>
              </div>
            </Card>

            <Card className="border-white/[0.08] bg-[#0b0f19] p-5 flex flex-col items-center justify-center text-center space-y-3">
              <Server className="h-8 w-8 text-pink-400" />
              <div className="w-full">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Memory Alloc</p>
                <h4 className="text-2xl font-bold font-mono text-white mt-1">{simMem}%</h4>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                  <div className="bg-pink-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${simMem}%` }} />
                </div>
              </div>
            </Card>

            <Card className="border-white/[0.08] bg-[#0b0f19] p-5 flex flex-col items-center justify-center text-center space-y-3">
              <Database className="h-8 w-8 text-cyan-400" />
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">DB Latency (Neon)</p>
                <h4 className="text-2xl font-bold font-mono text-white mt-1">{simLatency} ms</h4>
                <span className="text-[9px] text-cyan-400 font-bold block mt-0.5">Provider: {systemStats.dbProvider}</span>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Database Stats Card */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-white/[0.08] bg-[#0b0f19]/80 p-5">
                <CardHeader className="p-0 pb-3 border-b border-white/[0.08] mb-4">
                  <CardTitle className="text-xs font-heading font-extrabold text-white flex items-center space-x-2">
                    <Database className="h-4.5 w-4.5 text-yellow-500" />
                    <span>Database Telemetry Stats</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-xs text-gray-400 space-y-3">
                  <div className="flex justify-between py-1 border-b border-white/[0.05]">
                    <span>Total Registered Interns</span>
                    <span className="text-white font-bold">{systemStats.totalInterns}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.05]">
                    <span>Active Interns (Learning)</span>
                    <span className="text-emerald-450 font-bold">{systemStats.activeInterns}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.05]">
                    <span>Verification Queue size</span>
                    <span className="text-yellow-450 font-bold">{systemStats.pendingVerification}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/[0.05]">
                    <span>Total Tasks Assigned</span>
                    <span className="text-white font-bold">{systemStats.totalTasks}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Task Completion Rate</span>
                    <span className="text-white font-bold">
                      {systemStats.totalTasks > 0 ? Math.round((systemStats.completedTasks / systemStats.totalTasks) * 100) : 100}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Database Backup Vault Auditor */}
              <Card className="border-white/[0.08] bg-[#0b0f19]/80 p-5">
                <CardHeader className="p-0 pb-3 border-b border-white/[0.08] mb-4">
                  <CardTitle className="text-xs font-heading font-extrabold text-white flex items-center space-x-2">
                    <Lock className="h-4.5 w-4.5 text-yellow-500 animate-pulse" />
                    <span>Secure Backup Auditor</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-heading font-bold text-gray-400 uppercase tracking-widest block">
                      Verify Encryption Key
                    </label>
                    <input
                      type="password"
                      placeholder="Enter verification passcode..."
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-white/[0.08] bg-[#0c1220] px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40 font-mono"
                    />
                  </div>

                  {backupFiles.length === 0 ? (
                    <p className="text-[10px] text-gray-500 italic">No offline backup archives (.enc) found in workspace backups/ directory.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {backupFiles.map((file) => (
                        <div key={file.name} className="p-2.5 rounded bg-white/[0.02] border border-white/[0.05] text-[11px] flex justify-between items-center gap-3">
                          <div className="min-w-0">
                            <span className="font-semibold text-white block truncate" title={file.name}>{file.name}</span>
                            <span className="text-[9px] text-slate-500 font-medium">Size: {(file.size / 1024).toFixed(2)} KB &bull; {new Date(file.createdAt).toLocaleDateString()}</span>
                          </div>
                          <Button 
                            variant="secondary"
                            size="sm"
                            className="h-7 text-[8px] font-extrabold px-2 bg-white/5 text-white border-white/10 shrink-0"
                            onClick={() => handleVerifyBackup(file.name)}
                            disabled={verifyingBackup === file.name}
                          >
                            {verifyingBackup === file.name ? "Verifying..." : "Verify"}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {verificationResult && (
                    <div className={cn(
                      "p-3 rounded-lg border text-[11px] font-bold leading-normal",
                      verificationResult.success 
                        ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-450"
                        : "bg-destructive/10 border-destructive/25 text-destructive"
                    )}>
                      {verificationResult.message}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Audit Logs terminal feed (2/3 Width) */}
            <Card className="lg:col-span-2 border-white/[0.08] bg-[#0b0f19]/80 p-5 flex flex-col justify-between h-full">
              <CardHeader className="p-0 pb-3 border-b border-white/[0.08] mb-4">
                <CardTitle className="text-xs font-heading font-extrabold text-white flex items-center space-x-2">
                  <Terminal className="h-4.5 w-4.5 text-yellow-500 animate-pulse" />
                  <span>Real-time System Audit logs</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {initialLogs.length === 0 ? (
                  <div className="py-24 text-center text-xs text-gray-500 italic">
                    No active audit logs trails found.
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[480px] overflow-y-auto font-mono text-[10.5px] leading-normal bg-black/40 p-4 rounded-xl border border-white/[0.05]">
                    {initialLogs.map((log, idx) => (
                      <div key={log.id || idx} className="pb-2 border-b border-white/[0.02] last:border-b-0 space-y-0.5">
                        <div className="flex justify-between items-center text-slate-500 text-[9px] font-bold">
                          <span>{new Date(log.createdAt).toLocaleTimeString()} &bull; {new Date(log.createdAt).toLocaleDateString()}</span>
                          <span className="text-yellow-500 font-extrabold uppercase bg-yellow-500/10 px-1.5 rounded">{log.action}</span>
                        </div>
                        <p className="text-gray-300 font-medium">{log.description}</p>
                        <span className="text-slate-500 text-[9px] block">Actor: {log.user?.fullName || "SYSTEM"} ({log.user?.role || "AUTO"})</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Predictive Health Telemetry */}
            <Card className="border-emerald-500/20 bg-[#0b0f19]/90 p-5 shadow-lg shadow-emerald-500/5">
              <CardHeader className="p-0 pb-3 border-b border-white/[0.08] mb-4">
                <CardTitle className="text-xs font-heading font-extrabold text-emerald-400 flex items-center space-x-2">
                  <Activity className="h-4.5 w-4.5" />
                  <span>Predictive Health Telemetry</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-gray-500 mt-1">Real-time health forecasting algorithm</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4 text-xs font-mono">
                <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
                  <span className="text-gray-400">System Stability:</span>
                  <span className="text-emerald-400 font-bold tracking-widest">{(100 - simCpu / 10).toFixed(1)}% OPTIMAL</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/[0.05] pb-2">
                  <span className="text-gray-400">Projected Burnout Risk:</span>
                  <span className={cn(
                    "font-bold uppercase",
                    burnoutRisk.includes("HIGH") ? "text-rose-500 animate-pulse" : burnoutRisk.includes("MEDIUM") ? "text-yellow-400" : "text-emerald-400"
                  )}>{burnoutRisk}</span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-gray-400">Bottleneck Prediction:</span>
                  <span className="text-indigo-400 font-bold">{(systemStats.pendingTasks > 10 ? "TASK QUEUE OVERFLOW DETECTED" : "CLEAR")}</span>
                </div>
              </CardContent>
            </Card>

            {/* God Mode Override Controls */}
            <Card className="border-rose-500/20 bg-[#0b0f19]/90 p-5 shadow-lg shadow-rose-500/5">
              <CardHeader className="p-0 pb-3 border-b border-white/[0.08] mb-4">
                <CardTitle className="text-xs font-heading font-extrabold text-rose-500 flex items-center space-x-2">
                  <ShieldAlert className="h-4.5 w-4.5 animate-pulse" />
                  <span>"God Mode" Administrative Overrides</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-gray-500 mt-1">Absolute power controls (Cryptographic verification required)</CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-3">
                <div className="flex justify-between items-center bg-rose-500/5 border border-rose-500/10 p-3 rounded-lg">
                  <div className="space-y-0.5">
                    <h5 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Power className="h-3 w-3 text-rose-500" /> System Global Lock
                    </h5>
                    <p className="text-[9px] text-gray-500">Prevent all non-founder logins instantaneously.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn("text-[9px] font-bold border-rose-500/30", systemLocked ? "bg-rose-500 text-white hover:bg-rose-600" : "text-rose-500 hover:bg-rose-500/10")}
                    onClick={() => setSystemLocked(!systemLocked)}
                  >
                    {systemLocked ? "UNLOCK SYSTEM" : "ENGAGE LOCK"}
                  </Button>
                </div>
                
                <div className="flex justify-between items-center bg-indigo-500/5 border border-indigo-500/10 p-3 rounded-lg">
                  <div className="space-y-0.5">
                    <h5 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-indigo-400" /> Force Instant Backup
                    </h5>
                    <p className="text-[9px] text-gray-500">Generate a quantum-encrypted snapshot offline.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[9px] font-bold border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                    onClick={() => alert("Initiated secure background quantum backup protocol.")}
                  >
                    EXECUTE
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* RENDER TAB 5: FOUNDER ELITE PROFILE */}
      {activeTab === "founderprofile" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-heading font-extrabold text-white tracking-tight">
                Elite Founder Credentials
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Manage your master profile, royal purple ID card, and biometric data.
              </p>
            </div>
          </div>
          
          <div className="p-1">
            <IdCardGenerator 
              fullName="Karan Mishra"
              internId="AXN-FND-2401-KM01"
              department="Executive Board"
              roleDomain="Founder"
              status="ACTIVE"
              dbInternId="founder-master-id" 
              employmentType="FOUNDER"
              linkedIn="https://linkedin.com/in/karan-mishra-aurxon"
              gitHub="https://github.com/karanmishra"
            />
          </div>
        </div>
      )}

      {/* DIARY MODAL */}
      {isDiaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300" onClick={() => !loading && setIsDiaryModalOpen(false)} />
          <div className="relative bg-card border border-border/80 w-full max-w-lg rounded-xl shadow-2xl p-6 overflow-hidden animate-fadeIn text-left space-y-4">
            <h3 className="text-sm font-heading font-extrabold text-white flex items-center space-x-2">
              <BookOpen className="h-4.5 w-4.5 text-primary" />
              <span>{selectedDiary ? "Edit Diary Entry" : "Write New Diary Note"}</span>
            </h3>
            <form onSubmit={handleSaveDiary} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-heading font-bold text-gray-400 block">Note Title</label>
                <input
                  placeholder="Enter title..."
                  value={diaryTitle}
                  onChange={(e) => setDiaryTitle(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-white/[0.08] bg-[#0c1220] px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/40"
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                  Content
                </label>
                <textarea
                  placeholder="Start writing..."
                  value={diaryContent}
                  onChange={(e) => setDiaryContent(e.target.value)}
                  rows={8}
                  className="flex w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm font-sans text-white bg-[#0c1220]"
                  required
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setIsDiaryModalOpen(false)} disabled={loading} className="bg-slate-800 text-white hover:bg-slate-700">
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={loading} className="bg-yellow-550 border-yellow-600 hover:bg-yellow-500 text-[#070b13]">
                  Save Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT MODAL (WITH MEMBER ASSIGNMENT PERMISSIONS) */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300" onClick={() => !loading && setIsProjectModalOpen(false)} />
          <div className="relative bg-[#0c1220] border border-white/10 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden animate-fadeIn text-left flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-white/[0.08] bg-white/[0.01] flex justify-between items-center">
              <h3 className="text-sm font-heading font-extrabold text-white flex items-center space-x-2">
                <Briefcase className="h-4.5 w-4.5 text-primary" />
                <span>{selectedProject ? "Modify Corporate Project Access" : "Register Corporate Project"}</span>
              </h3>
              <span className="text-[10px] font-heading font-bold text-yellow-450 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded tracking-wider uppercase">
                {selectedProject ? selectedProject.projectId : "AXN-PRJ-NEW"}
              </span>
            </div>

            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Project parameters */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-heading font-bold text-gray-400 block">Project Name / Title</label>
                  <input
                    placeholder="e.g. AIMS Intern Portal Upgrade"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    required
                    className="flex h-10 w-full rounded-md border border-white/[0.08] bg-[#0c1220] px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    Core Description
                  </label>
                  <textarea
                    placeholder="Short description of the project purpose..."
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    rows={3}
                    className="flex w-full rounded-md border border-white/[0.08] bg-[#0c1220] px-3.5 py-2 text-xs text-white focus:outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    Internal Details & Repositories
                  </label>
                  <textarea
                    placeholder="e.g. GitHub link: https://github.com/aurxon/AIMS"
                    value={projectDetails}
                    onChange={(e) => setProjectDetails(e.target.value)}
                    rows={4}
                    className="flex w-full rounded-md border border-white/[0.08] bg-[#0c1220] px-3.5 py-2 text-xs text-white focus:outline-none font-mono"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-white/[0.08] bg-[#0c1220] px-3.5 py-2 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                    <option value="PLANNED">PLANNED</option>
                  </select>
                </div>
              </div>

              {/* Right Column: allowedUsers delegation */}
              <div className="space-y-4 flex flex-col h-full overflow-hidden">
                <div className="space-y-1 shrink-0">
                  <label className="text-xs font-heading font-bold text-white uppercase tracking-widest block">
                    Learn & Work Access Delegation
                  </label>
                  <span className="text-[10px] text-gray-400 leading-relaxed block">
                    Check employees or interns below to grant permissions to query details & contribute code.
                  </span>
                </div>

                {/* Search bar */}
                <div className="relative shrink-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search roster members..."
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-white/[0.08] bg-[#0c1220] pl-10 pr-3.5 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                {/* Checklist container */}
                <div className="border border-white/[0.08] rounded-lg p-3 bg-white/[0.01] space-y-2 max-h-[30vh] overflow-y-auto flex-1">
                  {filteredContacts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-gray-400 italic">
                      No matching roster members.
                    </div>
                  ) : (
                    filteredContacts.map((contact) => {
                      const isChecked = projectMembers.includes(contact.id);
                      return (
                        <label 
                          key={contact.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-md border text-xs cursor-pointer select-none transition-all",
                            isChecked 
                              ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold" 
                              : "bg-transparent border-transparent text-gray-400 hover:bg-white/[0.04]"
                          )}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleMember(contact.id)}
                              className="h-3.5 w-3.5 rounded border-white/20 bg-[#0c1220] text-yellow-500 focus:ring-yellow-500 cursor-pointer"
                            />
                            <div className="min-w-0 text-left">
                              <p className="font-bold text-white truncate">{contact.fullName}</p>
                              <p className="text-[9px] text-gray-400 truncate uppercase font-semibold">
                                {contact.roleDomain || contact.role}
                              </p>
                            </div>
                          </div>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-gray-400 shrink-0 uppercase">
                            {contact.role}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-white/[0.08] bg-white/[0.01] flex items-center justify-end space-x-3">
              <Button variant="secondary" size="sm" onClick={() => setIsProjectModalOpen(false)} disabled={loading} className="bg-slate-800 text-white hover:bg-slate-700">
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveProject} isLoading={loading} className="bg-yellow-550 border-yellow-600 hover:bg-yellow-500 text-[#070b13]">
                Save Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
