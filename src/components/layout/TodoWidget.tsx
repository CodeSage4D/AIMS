"use client";

import React, { useState, useEffect } from "react";
import { CheckSquare, Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  date: string;
  type: string;
}

export default function TodoWidget() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const fetchTodos = async () => {
    try {
      const res = await fetch("/api/todos");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Sort completed todos to bottom
          const sorted = data.todos.sort((a: TodoItem, b: TodoItem) => {
            if (a.completed === b.completed) return 0;
            return a.completed ? 1 : -1;
          });
          setTodos(sorted);
        }
      }
    } catch (err) {
      console.error("Failed to fetch widget todos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;

    setAdding(true);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTodoTitle.trim(),
          date: todayStr,
          type: "TODO",
        }),
      });

      if (res.ok) {
        setNewTodoTitle("");
        await fetchTodos();
      }
    } catch (err) {
      console.error("Failed to add todo in widget:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleToggleTodo = async (id: string, currentCompleted: boolean) => {
    // Optimistic toggle
    setTodos((prev) =>
      prev
        .map((t) => (t.id === id ? { ...t, completed: !currentCompleted } : t))
        .sort((a, b) => {
          if (a.completed === b.completed) return 0;
          return a.completed ? 1 : -1;
        })
    );

    try {
      await fetch("/api/todos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          completed: !currentCompleted,
        }),
      });
      // Fetch fresh list to align
      await fetchTodos();
    } catch (err) {
      console.error("Failed to toggle todo in widget:", err);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    // Optimistic delete
    setTodos((prev) => prev.filter((t) => t.id !== id));

    try {
      await fetch(`/api/todos?id=${id}`, {
        method: "DELETE",
      });
      await fetchTodos();
    } catch (err) {
      console.error("Failed to delete todo in widget:", err);
    }
  };

  return (
    <div className="border border-border/60 bg-card/60 backdrop-blur-md rounded-2xl p-5 shadow-xl select-none flex flex-col h-[350px]">
      <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4 shrink-0">
        <div>
          <h4 className="text-sm font-heading font-extrabold text-white flex items-center space-x-1.5">
            <CheckSquare className="h-4.5 w-4.5 text-indigo-400" />
            <span>My Personal Planner</span>
          </h4>
          <span className="text-[10px] text-muted-foreground font-semibold">Today: {todayStr}</span>
        </div>
        <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] font-bold uppercase tracking-wider">
          <Sparkles className="h-3 w-3 shrink-0" />
          <span>Active Plan</span>
        </div>
      </div>

      {/* Quick Add Form */}
      <form onSubmit={handleAddTodo} className="flex gap-2 mb-4 shrink-0">
        <Input
          type="text"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="New plan task..."
          disabled={adding}
          className="bg-white/5 border-white/10 text-white rounded-xl h-9 text-xs focus:ring-1 focus:ring-indigo-500/50"
        />
        <Button
          type="submit"
          disabled={adding || !newTodoTitle.trim()}
          variant="primary"
          size="sm"
          className="h-9 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center justify-center"
        >
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </form>

      {/* Scrollable Todo List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground space-y-2 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            <span>Fetching planner checklist...</span>
          </div>
        ) : todos.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center py-8 text-xs text-muted-foreground font-semibold">
            No items on your planner list yet. Add one above!
          </div>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className={cn(
                "p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all hover:border-indigo-500/20",
                todo.completed
                  ? "bg-gray-500/5 border-gray-500/10 text-muted-foreground opacity-60"
                  : "bg-secondary/15 border-border/40"
              )}
            >
              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggleTodo(todo.id, todo.completed)}
                  className="h-4 w-4 rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-0 cursor-pointer shrink-0"
                />
                <span
                  className={cn(
                    "font-bold text-foreground truncate block",
                    todo.completed && "line-through text-gray-500 font-semibold"
                  )}
                >
                  {todo.title}
                </span>
              </div>
              <button
                onClick={() => handleDeleteTodo(todo.id)}
                className="p-1 rounded text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer shrink-0 transition-colors"
                title="Delete item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
