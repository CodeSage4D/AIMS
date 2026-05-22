"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  Users,
  Mail,
  User,
  ShieldAlert,
  Loader2,
  Calendar,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Contact {
  id: string; // User ID
  fullName: string;
  role: string;
  email: string;
  roleDomain?: string;
}

interface MessageItem {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string | null;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    role: string;
  };
}

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: string;
    name?: string | null;
    role?: string;
  };
}

export default function ChatDrawer({ isOpen, onClose, currentUser }: ChatDrawerProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null); // null means General Channel
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [contactsLoading, setContactsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load Contacts
  useEffect(() => {
    if (!isOpen) return;

    const loadContacts = async () => {
      setContactsLoading(true);
      try {
        const res = await fetch("/api/messages/contacts");
        if (res.ok) {
          const data = await res.json();
          setContacts(data);
        }
      } catch (err) {
        console.error("Failed to load chat contacts:", err);
      } finally {
        setContactsLoading(false);
      }
    };

    loadContacts();
  }, [isOpen]);

  // Load Messages (Private or General Channel)
  useEffect(() => {
    if (!isOpen) return;

    const loadMessages = async () => {
      setMessagesLoading(true);
      try {
        const url = activeContact
          ? `/api/messages?receiverId=${activeContact.id}`
          : "/api/messages"; // General Channel
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessages();

    // Setup basic polling interval (e.g. every 5s) for live feel
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [isOpen, activeContact]);

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMessage,
          receiverId: activeContact ? activeContact.id : null
        })
      });

      if (res.ok) {
        const message = await res.json();
        setMessages((prev) => [...prev, message]);
        setNewMessage("");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop overlay closer */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn" onClick={onClose} />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-full max-w-lg h-full bg-white dark:bg-[#0a0f1d] border-l border-slate-200 dark:border-white/[0.08] shadow-2xl flex flex-col z-50 animate-slideOver text-slate-800 dark:text-white">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between bg-slate-50 dark:bg-[#0e162a]">
          <div className="flex items-center space-x-2.5">
            <MessageSquare className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            <div>
              <h3 className="text-sm font-extrabold font-heading text-slate-900 dark:text-white">AIMS Messaging Center</h3>
              <p className="text-[10px] text-slate-500 dark:text-gray-400">Direct workspace support and team channels.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/10 transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Main Section split into Contacts (1/3) & Chats (2/3) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Contacts Column */}
          <div className="w-1/3 border-r border-slate-200 dark:border-white/[0.08] flex flex-col bg-slate-50/80 dark:bg-[#080d19]">
            <div className="p-2 border-b border-slate-200/60 dark:border-white/[0.05]">
              <button
                onClick={() => setActiveContact(null)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-xs font-bold font-heading flex items-center space-x-2 border transition-all cursor-pointer",
                  !activeContact
                    ? "bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "border-transparent hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-600 dark:text-gray-300 hover:text-slate-950 dark:hover:text-white"
                )}
              >
                <Users className="h-4 w-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
                <span className="truncate">General Board</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <span className="text-[9px] font-heading font-extrabold text-slate-400 dark:text-gray-500 uppercase tracking-widest px-3 block select-none">
                Workspace Contacts
              </span>
              
              {contactsLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 text-indigo-500 dark:text-indigo-400 animate-spin" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-[10px] text-center text-slate-400 dark:text-gray-500 font-bold py-6 px-2">
                  No online contacts
                </div>
              ) : (
                contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => setActiveContact(contact)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl border transition-all flex flex-col space-y-0.5 cursor-pointer",
                      activeContact?.id === contact.id
                        ? "bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/25 text-cyan-700 dark:text-cyan-400 shadow-sm"
                        : "border-transparent hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-600 dark:text-gray-300 hover:text-slate-950 dark:hover:text-white"
                    )}
                  >
                    <span className="text-xs font-extrabold truncate">{contact.fullName}</span>
                    <span className="text-[8.5px] uppercase font-heading font-bold text-slate-400 dark:text-gray-400 tracking-wider truncate">
                      {contact.role === "INTERN" ? contact.roleDomain || "Intern" : contact.role}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Active Chat Column */}
          <div className="flex-1 flex flex-col bg-slate-50/30 dark:bg-[#090e1c]">
            {/* Active Contact Header Banner */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-[#0d1428] border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-indigo-500/15 dark:bg-primary/10 border border-indigo-500/20 dark:border-primary/20 flex items-center justify-center text-xs font-heading font-extrabold text-indigo-600 dark:text-indigo-400 select-none">
                  {activeContact ? activeContact.fullName[0].toUpperCase() : "G"}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                    {activeContact ? activeContact.fullName : "General Board Announcements"}
                  </h4>
                  <p className="text-[9px] text-slate-500 dark:text-gray-400 font-medium truncate uppercase tracking-wide">
                    {activeContact
                      ? activeContact.role === "INTERN"
                        ? activeContact.roleDomain || "Active Intern"
                        : `${activeContact.role} Suite`
                      : "Public Workspace Channel"}
                  </p>
                </div>
              </div>

              {/* Direct Mail Shortcut Button */}
              {activeContact && (
                <a
                  href={`mailto:${activeContact.email}?subject=AURXON AIMS Request&body=Hi ${activeContact.fullName},`}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-600/10 hover:bg-indigo-100 dark:hover:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/25 text-indigo-600 dark:text-indigo-400 text-[10px] font-heading font-extrabold uppercase transition-all shrink-0 cursor-pointer"
                  title={`Send onboarding email to ${activeContact.email}`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Direct Email</span>
                </a>
              )}
            </div>

            {/* Messages Display Board */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messagesLoading && messages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-6 w-6 text-indigo-500 dark:text-indigo-400 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 space-y-2 select-none opacity-50">
                  <MessageSquare className="h-8 w-8 text-slate-300 dark:text-gray-500" />
                  <span className="text-xs font-bold text-slate-400 dark:text-gray-400 uppercase tracking-widest">
                    Beginning of Thread
                  </span>
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 max-w-xs leading-relaxed">
                    Log your remarks or chat directly. All discussions are securely captured under AIMS logs.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col max-w-[80%] space-y-1",
                        isMe ? "ml-auto items-end" : "mr-auto items-start"
                      )}
                    >
                      <div className="flex items-center space-x-1.5 text-[9px] font-bold text-slate-500 dark:text-gray-400">
                        <span>{msg.sender.fullName}</span>
                        <span className="text-[8px] uppercase px-1 rounded bg-slate-200 dark:bg-secondary text-slate-600 dark:text-gray-300 font-heading shrink-0 tracking-wide font-extrabold">
                          {msg.sender.role}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm border transition-colors",
                          isMe
                            ? "bg-indigo-50 dark:bg-indigo-600/10 border-indigo-100 dark:border-indigo-500/20 text-indigo-950 dark:text-white rounded-tr-none"
                            : "bg-white dark:bg-[#131b31] border-slate-200 dark:border-white/[0.06] text-slate-800 dark:text-gray-100 rounded-tl-none"
                        )}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[8px] text-slate-400 dark:text-gray-500 font-medium">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Submission Footer Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-50 dark:bg-[#0c1223] border-t border-slate-200 dark:border-white/[0.08] flex items-center space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message securely..."
                className="flex-1 h-10 px-3 bg-white dark:bg-[#11172a] hover:bg-slate-100 dark:hover:bg-[#131b32] focus:bg-white dark:focus:bg-[#141d37] border border-slate-200 dark:border-white/[0.08] focus:border-indigo-500 dark:focus:border-indigo-500/50 rounded-xl text-xs font-medium placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/25 transition-all text-slate-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className={cn(
                  "h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-600/10 transition-all cursor-pointer shrink-0 border border-white/5",
                  (!newMessage.trim() || sending) && "opacity-50 cursor-not-allowed bg-indigo-600/45"
                )}
              >
                {sending ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <Send className="h-4.5 w-4.5" />
                )}
              </button>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
}
