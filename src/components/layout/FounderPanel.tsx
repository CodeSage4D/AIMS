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
  Users
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
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

export default function FounderPanel() {
  const [activeTab, setActiveTab] = useState<"planner" | "diary" | "projects">("planner");
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

  // Load Initial Data
  useEffect(() => {
    fetchPlanner();
    fetchDiaries();
    fetchProjects();
    fetchContacts();
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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Upper Navigation Tabs */}
      <div className="flex border-b border-border/40 p-1.5 bg-secondary/15 backdrop-blur-md rounded-xl space-x-2 w-fit">
        {[
          { id: "planner", label: "Personal Planner", icon: CheckSquare },
          { id: "diary", label: "Diary Database", icon: BookOpen },
          { id: "projects", label: "Projects Directory", icon: Briefcase },
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
                "flex items-center space-x-2.5 px-5 py-2.5 rounded-lg text-xs font-heading font-bold transition-all border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                  : "bg-transparent text-muted-foreground border-transparent hover:bg-secondary/40 hover:text-foreground"
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
            <Card className="border-border/60 bg-card/40 backdrop-blur-md sticky top-6">
              <CardHeader>
                <CardTitle className="text-sm font-heading font-extrabold flex items-center space-x-2">
                  <PlusCircle className="h-4.5 w-4.5 text-primary" />
                  <span>Create Planner Task</span>
                </CardTitle>
                <CardDescription>Schedule a personal TODO or priority reminder.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTodo} className="space-y-4">
                  <Input
                    label="Task Title"
                    placeholder="e.g. Audit onboarding vaults"
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    required
                  />
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                      Description (Optional)
                    </label>
                    <textarea
                      placeholder="Add specific action items..."
                      value={newTodoDesc}
                      onChange={(e) => setNewTodoDesc(e.target.value)}
                      rows={3}
                      className="flex w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
                    />
                  </div>
                  <Input
                    label="Task Date"
                    type="date"
                    value={newTodoDate}
                    onChange={(e) => setNewTodoDate(e.target.value)}
                    required
                  />
                  <Button type="submit" variant="primary" size="md" className="w-full font-bold">
                    Add Planner Task
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Planner Tasks Queue */}
          <div className="lg:col-span-2">
            <Card className="border-border/60 bg-card/60 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
                <div>
                  <CardTitle>Planner Tasks</CardTitle>
                  <CardDescription>Your personal todo items and chronological reminders.</CardDescription>
                </div>
                <span className="text-[10px] font-heading font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                  {todos.filter(t => t.completed).length} / {todos.length} Completed
                </span>
              </CardHeader>
              <CardContent className="pt-6">
                {todos.length === 0 ? (
                  <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center space-y-3">
                    <CheckSquare className="h-10 w-10 text-muted-foreground/35" />
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
                            ? "bg-secondary/5 border-border/20 opacity-70" 
                            : "bg-secondary/15 hover:bg-secondary/25 border-border/40 hover:border-border/80"
                        )}
                      >
                        <div className="flex items-start space-x-3.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={() => handleToggleTodo(todo.id, todo.completed)}
                            className="h-4 w-4 rounded border-border bg-input text-primary focus:ring-primary mt-0.5 cursor-pointer"
                          />
                          <div className="min-w-0">
                            <p className={cn(
                              "text-xs font-heading font-extrabold tracking-tight truncate text-white",
                              todo.completed && "line-through text-muted-foreground"
                            )}>
                              {todo.title}
                            </p>
                            {todo.description && (
                              <p className={cn(
                                "text-xs text-muted-foreground mt-1 select-text whitespace-pre-line",
                                todo.completed && "line-through"
                              )}>
                                {todo.description}
                              </p>
                            )}
                            <div className="flex items-center space-x-1.5 mt-2.5 text-[9px] font-bold text-muted-foreground/80 uppercase">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(todo.date)}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteTodo(todo.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive border border-transparent hover:border-destructive/25 transition-all shrink-0"
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
            <Card className="border-border/60 bg-card/60 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
                <div>
                  <CardTitle className="text-sm font-heading font-extrabold">Diary Entries</CardTitle>
                  <CardDescription>Your personal daily logbook.</CardDescription>
                </div>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="h-8.5 text-[10px] font-bold px-3 shrink-0"
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
                  <div className="py-12 text-center text-xs text-muted-foreground italic">
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
                              ? "bg-primary/10 border-primary text-white" 
                              : "bg-secondary/15 hover:bg-secondary/25 border-border/30 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <h4 className="text-xs font-heading font-bold truncate text-white">
                            {note.title}
                          </h4>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                            {note.content}
                          </p>
                          <span className="text-[8px] font-bold block mt-2 opacity-80 uppercase font-mono">
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
              <Card className="border-border/60 bg-card/60 backdrop-blur-md h-full flex flex-col justify-between">
                <CardHeader className="border-b border-border/40 flex flex-row items-start justify-between pb-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-heading font-extrabold text-white tracking-tight leading-tight select-text">
                      {selectedDiary.title}
                    </h3>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase font-mono tracking-wider">
                      Created: {formatDate(selectedDiary.createdAt)} &bull; Updated: {formatDate(selectedDiary.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="h-8.5 w-8.5 p-0"
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
                      className="h-8.5 w-8.5 p-0 text-destructive hover:bg-destructive/15 border-transparent"
                      onClick={() => handleDeleteDiary(selectedDiary.id)}
                      title="Delete Note"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 flex-1 max-h-[50vh] overflow-y-auto">
                  <p className="text-xs text-foreground/90 font-medium leading-relaxed select-text whitespace-pre-wrap font-sans">
                    {selectedDiary.content}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full border border-border/60 rounded-xl bg-card/40 backdrop-blur-md flex flex-col items-center justify-center p-12 text-center text-xs text-muted-foreground select-none min-h-[40vh]">
                <BookOpen className="h-10 w-10 text-muted-foreground/35 mb-3" />
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
              <p className="text-xs text-muted-foreground mt-0.5">
                Review active codebases, assign intern access credentials, and track repositories.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="h-10 font-bold px-4"
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
            <div className="py-20 text-center text-xs text-muted-foreground border border-border/60 rounded-xl bg-card/40 backdrop-blur-md flex flex-col items-center justify-center space-y-3">
              <Briefcase className="h-10 w-10 text-muted-foreground/35" />
              <span>No corporate projects registered. Add projects to start assigning access.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((project) => (
                <Card 
                  key={project.id}
                  className="border-border/60 hover:border-border transition-all duration-200 bg-card/60 backdrop-blur-md flex flex-col justify-between p-5 space-y-4"
                >
                  <div className="space-y-3.5">
                    {/* Project ID & Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-extrabold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded tracking-wider">
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
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 select-text font-medium">
                        {project.description}
                      </p>
                    </div>

                    {/* Detailed Info if available */}
                    {project.details && (
                      <div className="bg-secondary/10 p-3 rounded-lg border border-border/30 text-[11px] text-gray-300 leading-relaxed font-sans select-text whitespace-pre-line italic">
                        {project.details}
                      </div>
                    )}

                    {/* Assigned Interns count */}
                    <div className="flex items-center space-x-1.5 text-[10px] font-bold text-muted-foreground/80 uppercase">
                      <Users className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span>{project.allowedUsers.length} Interns Allowed to learn/work</span>
                    </div>
                  </div>

                  {/* Actions & Member display */}
                  <div className="pt-3 border-t border-border/35 flex items-center justify-between gap-3">
                    {/* Allowed Members Avatar previews */}
                    <div className="flex -space-x-2 overflow-hidden">
                      {project.allowedUsers.slice(0, 5).map((userId, idx) => {
                        const m = contacts.find(c => c.id === userId);
                        return (
                          <div 
                            key={idx}
                            className="h-6 w-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-[9px] font-bold text-indigo-400 ring-2 ring-card select-none"
                            title={m?.fullName || "Assigned Intern"}
                          >
                            {m?.fullName ? m.fullName[0].toUpperCase() : "I"}
                          </div>
                        );
                      })}
                      {project.allowedUsers.length > 5 && (
                        <div className="h-6 w-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[8px] font-bold text-muted-foreground ring-2 ring-card">
                          +{project.allowedUsers.length - 5}
                        </div>
                      )}
                    </div>

                    {/* Project Admin Actions */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 text-[10px] font-bold"
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
                        className="h-8 text-[10px] font-bold text-destructive hover:bg-destructive/10 border-transparent"
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
              <Input
                label="Note Title"
                placeholder="Enter title..."
                value={diaryTitle}
                onChange={(e) => setDiaryTitle(e.target.value)}
                required
              />
              <div className="flex flex-col space-y-1.5">
                <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                  Content
                </label>
                <textarea
                  placeholder="Start writing..."
                  value={diaryContent}
                  onChange={(e) => setDiaryContent(e.target.value)}
                  rows={8}
                  className="flex w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm font-sans"
                  required
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setIsDiaryModalOpen(false)} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={loading}>
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
          <div className="relative bg-card border border-border/80 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden animate-fadeIn text-left flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-border/40 bg-secondary/5 flex justify-between items-center">
              <h3 className="text-sm font-heading font-extrabold text-white flex items-center space-x-2">
                <Briefcase className="h-4.5 w-4.5 text-primary" />
                <span>{selectedProject ? "Modify Corporate Project Access" : "Register Corporate Project"}</span>
              </h3>
              <span className="text-[10px] font-heading font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded tracking-wider uppercase">
                {selectedProject ? selectedProject.projectId : "AXN-PRJ-NEW"}
              </span>
            </div>

            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Project parameters */}
              <div className="space-y-4">
                <Input
                  label="Project Name / Title"
                  placeholder="e.g. AIMS Intern Portal Upgrade"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                  required
                />
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    Core Description
                  </label>
                  <textarea
                    placeholder="Short description of the project purpose..."
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    rows={3}
                    className="flex w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
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
                    className="flex w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm font-mono text-xs"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm cursor-pointer"
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
                  <label className="text-xs font-heading font-bold text-foreground uppercase tracking-widest block">
                    Learn & Work Access Delegation
                  </label>
                  <span className="text-[10px] text-muted-foreground leading-relaxed block">
                    Check employees or interns below to grant permissions to query details & contribute code.
                  </span>
                </div>

                {/* Search bar */}
                <div className="relative shrink-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search roster members..."
                    value={searchMemberQuery}
                    onChange={(e) => setSearchMemberQuery(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-border bg-input pl-10 pr-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                  />
                </div>

                {/* Checklist container */}
                <div className="border border-border/40 rounded-lg p-3 bg-secondary/15 space-y-2 max-h-[30vh] overflow-y-auto flex-1">
                  {filteredContacts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-muted-foreground italic">
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
                              : "bg-transparent border-transparent text-muted-foreground hover:bg-secondary/40"
                          )}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleMember(contact.id)}
                              className="h-3.5 w-3.5 rounded border-border bg-input text-primary focus:ring-primary cursor-pointer"
                            />
                            <div className="min-w-0 text-left">
                              <p className="font-bold text-white truncate">{contact.fullName}</p>
                              <p className="text-[9px] text-muted-foreground truncate uppercase font-semibold">
                                {contact.roleDomain || contact.role}
                              </p>
                            </div>
                          </div>
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-secondary/50 border border-border/40 text-muted-foreground shrink-0 uppercase">
                            {contact.role}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-border/40 bg-secondary/5 flex items-center justify-end space-x-3">
              <Button variant="secondary" size="sm" onClick={() => setIsProjectModalOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveProject} isLoading={loading}>
                Save Project
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
