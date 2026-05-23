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
  Plus,
  Lock,
  Check,
  CheckSquare
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
  groupId?: string | null;
  isRead?: boolean;
  createdAt: string;
  sender: {
    id: string;
    fullName: string;
    role: string;
  };
}

interface GroupItem {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
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
  const [groups, setGroups] = useState<GroupItem[]>([]);
  
  // Selection States
  const [activeContact, setActiveContact] = useState<Contact | null>(null); 
  const [activeGroup, setActiveGroup] = useState<GroupItem | null>(null); // Null activeContact + Null activeGroup = General Announcements Board
  
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  // Loading & Action states
  const [contactsLoading, setContactsLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Group Creation modal state
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [createGroupName, setCreateGroupName] = useState("");
  const [createGroupDesc, setCreateGroupDesc] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [createGroupError, setCreateGroupError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isModerator = currentUser.role !== "INTERN" && currentUser.role !== "TEAM_LEAD";

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

  // Load Groups
  const loadGroups = async () => {
    if (!isOpen) return;
    setGroupsLoading(true);
    try {
      const res = await fetch("/api/messages/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error("Failed to load chat groups:", err);
    } finally {
      setGroupsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [isOpen]);

  // Load Messages (Private, Group, or Announcements Board)
  useEffect(() => {
    if (!isOpen) return;

    const loadMessages = async () => {
      setMessagesLoading(true);
      try {
        let url = "/api/messages"; // General Board Announcements
        if (activeContact) {
          url = `/api/messages?receiverId=${activeContact.id}`;
        } else if (activeGroup) {
          url = `/api/messages?groupId=${activeGroup.id}`;
        }
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

    // Polling interval (every 4s) for lightweight operational feel
    const interval = setInterval(loadMessages, 4000);
    return () => clearInterval(interval);
  }, [isOpen, activeContact, activeGroup]);

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
          receiverId: activeContact ? activeContact.id : null,
          groupId: activeGroup ? activeGroup.id : null
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

  // Submit Official Group Creator
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateGroupError("");
    if (!createGroupName.trim()) return;

    setCreateGroupLoading(true);
    try {
      const res = await fetch("/api/messages/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createGroupName,
          description: createGroupDesc,
          memberIds: selectedMembers
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateGroupModal(false);
        setCreateGroupName("");
        setCreateGroupDesc("");
        setSelectedMembers([]);
        loadGroups();
      } else {
        setCreateGroupError(data.error || "Failed to create official group");
      }
    } catch (err) {
      setCreateGroupError("Network error creating group.");
    } finally {
      setCreateGroupLoading(false);
    }
  };

  const handleToggleSelectMember = (mId: string) => {
    setSelectedMembers(prev =>
      prev.includes(mId) ? prev.filter(id => id !== mId) : [...prev, mId]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop overlay closer */}
      <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn" onClick={onClose} />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-full max-w-lg h-full bg-card border-l border-border shadow-2xl flex flex-col z-50 animate-slideOver text-foreground">
        
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center space-x-2.5">
            <MessageSquare className="h-5 w-5 text-primary" />
            <div>
              <h3 className="text-sm font-extrabold font-heading text-foreground">AIMS Messaging Center</h3>
              <p className="text-[10px] text-muted-foreground">Secure workspace support, team channels, and official groups.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent hover:border-border transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Main Section split into Contacts (1/3) & Chats (2/3) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Contacts & Groups Column */}
          <div className="w-1/3 border-r border-border flex flex-col bg-secondary/10">
            {/* General board selector */}
            <div className="p-2 border-b border-border/50">
              <button
                onClick={() => {
                  setActiveContact(null);
                  setActiveGroup(null);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-xl text-xs font-bold font-heading flex items-center space-x-2 border transition-all cursor-pointer",
                  (!activeContact && !activeGroup)
                    ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                    : "border-transparent hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <Users className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">General Board</span>
              </button>
            </div>

            {/* Official Groups list */}
            <div className="p-2 border-b border-border/40 space-y-1">
              <div className="flex items-center justify-between px-2.5 pb-1">
                <span className="text-[8px] font-heading font-extrabold text-muted-foreground uppercase tracking-widest block select-none">
                  Official Groups
                </span>
                {isModerator && (
                  <button
                    onClick={() => setShowCreateGroupModal(true)}
                    className="p-1 rounded bg-secondary hover:bg-secondary/80 text-primary border border-border/40 hover:scale-105 transition-all cursor-pointer"
                    title="Create Group"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="max-h-[22vh] overflow-y-auto space-y-1">
                {groupsLoading && groups.length === 0 ? (
                  <div className="flex justify-center py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : groups.length === 0 ? (
                  <span className="text-[9px] px-2.5 italic text-muted-foreground/75 block">No groups joined</span>
                ) : (
                  groups.map((grp) => (
                    <button
                      key={grp.id}
                      onClick={() => {
                        setActiveContact(null);
                        setActiveGroup(grp);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-1.5 rounded-lg border transition-all flex flex-col cursor-pointer",
                        activeGroup?.id === grp.id
                          ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                          : "border-transparent hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-xs font-extrabold truncate">{grp.name}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Workspace Contacts list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <span className="text-[8px] font-heading font-extrabold text-muted-foreground uppercase tracking-widest px-2 block select-none">
                Workspace Contacts
              </span>
              
              <div className="space-y-1">
                {contactsLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="text-[9px] text-center text-muted-foreground font-bold py-6">
                    No online contacts
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => {
                        setActiveGroup(null);
                        setActiveContact(contact);
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-xl border transition-all flex flex-col space-y-0.5 cursor-pointer",
                        activeContact?.id === contact.id
                          ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                          : "border-transparent hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="text-xs font-extrabold truncate">{contact.fullName}</span>
                      <span className="text-[8.5px] uppercase font-heading font-bold text-muted-foreground tracking-wider truncate">
                        {contact.role === "INTERN" ? contact.roleDomain || "Intern" : contact.role}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Active Chat Column */}
          <div className="flex-1 flex flex-col bg-background/35">
            {/* Active Contact Header Banner */}
            <div className="px-4 py-3 bg-muted/15 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-heading font-extrabold text-primary select-none">
                  {activeContact ? activeContact.fullName[0].toUpperCase() : activeGroup ? activeGroup.name[0].toUpperCase() : "G"}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-extrabold text-foreground truncate">
                    {activeContact ? activeContact.fullName : activeGroup ? activeGroup.name : "General Announcements"}
                  </h4>
                  <p className="text-[9px] text-muted-foreground font-medium truncate uppercase tracking-wide">
                    {activeContact
                      ? activeContact.role === "INTERN"
                        ? activeContact.roleDomain || "Active Intern"
                        : `${activeContact.role} Suite`
                      : activeGroup
                      ? activeGroup.description || "Official Group Chat"
                      : "Announcements Channel (Read-Only for Interns)"}
                  </p>
                </div>
              </div>

              {/* Direct Mail Shortcut Button */}
              {activeContact && (
                <a
                  href={`mailto:${activeContact.email}?subject=AURXON AIMS Request&body=Hi ${activeContact.fullName},`}
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/25 text-primary text-[9px] font-heading font-extrabold uppercase transition-all shrink-0 cursor-pointer shadow-sm"
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
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4 space-y-2 select-none opacity-50">
                  <MessageSquare className="h-8 w-8 text-muted-foreground/60" />
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Beginning of Thread
                  </span>
                  <p className="text-[9px] text-muted-foreground max-w-[180px] leading-relaxed">
                    {activeContact 
                      ? `This is the start of your secure direct message history with ${activeContact.fullName}.`
                      : activeGroup
                      ? `This is the start of the ${activeGroup.name} official group conversation.`
                      : "General announcement log. Highly secure, auditable, and platform logs validated."}
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
                      <div className="flex items-center space-x-1.5 text-[9px] font-bold text-muted-foreground">
                        <span>{msg.sender.fullName}</span>
                        <span className="text-[8px] uppercase px-1 rounded bg-secondary text-secondary-foreground font-heading shrink-0 tracking-wide font-extrabold">
                          {msg.sender.role}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed border transition-colors shadow-sm",
                          isMe
                            ? "bg-primary text-primary-foreground border-primary/20 rounded-tr-none"
                            : "bg-secondary/40 text-foreground border-border/25 rounded-tl-none"
                        )}
                      >
                        {msg.content}
                      </div>
                      <div className="flex items-center space-x-1.5 text-[8px] text-muted-foreground font-semibold">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </span>
                        {isMe && msg.receiverId && (
                          <span className={cn(
                            "font-bold select-none",
                            msg.isRead ? "text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-muted-foreground/60"
                          )}>
                            • {msg.isRead ? "Seen" : "Sent"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Submission Footer Form */}
            {(!activeContact && !activeGroup && !isModerator) ? (
              <div className="p-3 bg-secondary/20 border-t border-border flex items-center justify-center space-x-2 text-muted-foreground text-[10px] font-bold">
                <Lock className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
                <span>Announcements Channel: Read-Only for enrollees.</span>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="p-3 bg-secondary/15 border-t border-border flex items-center space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message securely..."
                  className="flex-1 h-10 px-3 bg-card border border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-xl text-xs font-medium placeholder:text-muted-foreground focus:outline-none transition-all text-foreground"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className={cn(
                    "h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-md transition-all cursor-pointer shrink-0 border border-white/5",
                    (!newMessage.trim() || sending) && "opacity-50 cursor-not-allowed bg-primary/45"
                  )}
                >
                  {sending ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <Send className="h-4.5 w-4.5" />
                  )}
                </button>
              </form>
            )}

          </div>

        </div>

      </div>

      {/* 2. Group Creator Modal (Founder/Admin Locked) */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl space-y-4 animate-scaleIn text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-heading font-extrabold text-foreground">
                  Create Official Chat Group
                </h3>
                <p className="text-[9px] text-muted-foreground">Setup isolated, secure channels for selective department files.</p>
              </div>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {createGroupError && (
              <div className="p-2.5 bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-semibold rounded-lg">
                {createGroupError}
              </div>
            )}

            <form onSubmit={handleCreateGroup} className="space-y-3.5 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-[9px] uppercase text-muted-foreground font-extrabold block">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontend Engineers"
                  value={createGroupName}
                  onChange={(e) => setCreateGroupName(e.target.value)}
                  className="w-full h-9 px-3 bg-secondary/15 border border-border rounded-lg focus:outline-none focus:border-primary/50 text-foreground"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase text-muted-foreground font-extrabold block">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Core team discussions"
                  value={createGroupDesc}
                  onChange={(e) => setCreateGroupDesc(e.target.value)}
                  className="w-full h-9 px-3 bg-secondary/15 border border-border rounded-lg focus:outline-none focus:border-primary/50 text-foreground"
                />
              </div>

              {/* Members selection list */}
              <div className="space-y-1">
                <label className="text-[9px] uppercase text-muted-foreground font-extrabold block mb-1">Select Initial Members</label>
                <div className="max-h-[22vh] overflow-y-auto border border-border rounded-lg bg-secondary/5 p-1.5 space-y-1">
                  {contacts.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground/75 italic block py-2 text-center">No workspace contacts online</span>
                  ) : (
                    contacts.map((c) => {
                      const isSelected = selectedMembers.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleToggleSelectMember(c.id)}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg cursor-pointer border hover:bg-secondary/40 transition-all",
                            isSelected ? "bg-primary/5 border-primary/20 text-primary" : "border-transparent text-foreground"
                          )}
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold block truncate">{c.fullName}</span>
                            <span className="text-[8px] uppercase tracking-wide text-muted-foreground font-extrabold">
                              {c.role === "INTERN" ? c.roleDomain || "Intern" : c.role}
                            </span>
                          </div>

                          <div className={cn(
                            "h-4 w-4 rounded border flex items-center justify-center transition-all",
                            isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border bg-card"
                          )}>
                            {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="h-9 px-4 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-bold transition-all cursor-pointer border border-border/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGroupLoading || !createGroupName.trim()}
                  className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  {createGroupLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Create Group</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
