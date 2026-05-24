"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Lock, Mail, AlertTriangle, User, Phone, Briefcase, Layers, ChevronLeft, CheckCircle, Sun, Moon, MapPin, CreditCard, Building2, Landmark } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();

  // Signup Form States
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [department, setDepartment] = useState("Software Engineering");
  const [requestedPosition, setRequestedPosition] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [country, setCountry] = useState("India");
  const [citizenship, setCitizenship] = useState("");
  const [region, setRegion] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  // Username validation states
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Theme support
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("aims-theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const activeTheme = savedTheme === "dark" || (savedTheme === null && systemPrefersDark) ? "dark" : "light";
    
    setTheme(activeTheme);
    if (activeTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("aims-theme", newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const currentTheme = mounted ? theme : "dark";

  // Username checking effect
  useEffect(() => {
    if (!username.trim()) {
      setUsernameAvailable(null);
      setUsernameSuggestions([]);
      setUsernameError(null);
      return;
    }

    setUsernameChecking(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username.trim())}`);
        const data = await res.json();
        if (data.available) {
          setUsernameAvailable(true);
          setUsernameError(null);
          setUsernameSuggestions([]);
        } else {
          setUsernameAvailable(false);
          setUsernameError(data.error || "Username is already taken.");
          setUsernameSuggestions(data.suggestions || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setUsernameChecking(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [username]);

  // Validation helpers
  const isPhoneValid = () => {
    if (!phone) return true;
    const cleaned = phone.replace(/[\s\-\(\)]/g, "");
    if (country.toLowerCase() === "india") {
      return /^(?:\+91|91)?[6-9]\d{9}$/.test(cleaned);
    } else {
      return /^\+\d{7,15}$/.test(cleaned);
    }
  };

  const isPinValid = () => {
    if (!pinCode) return true;
    const clean = pinCode.trim();
    if (country.toLowerCase() === "india") {
      return /^\d{6}$/.test(clean);
    } else {
      return /^[a-zA-Z0-9\s-]{3,10}$/.test(clean);
    }
  };

  const isAccountNumberValid = () => {
    if (!accountNumber) return true;
    return /^\d{9,18}$/.test(accountNumber.trim());
  };

  const isIfscValid = () => {
    if (!ifscCode) return true;
    return /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifscCode.trim());
  };

  const isUpiValid = () => {
    if (!upiId) return true;
    return /^[\w.-]+@[\w.-]+$/.test(upiId.trim());
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!fullName || !email || !phone || !username || !department || !requestedPosition) {
      setError("Please fill in all core enrollment fields.");
      setLoading(false);
      return;
    }

    if (usernameAvailable === false) {
      setError("Please choose a unique and valid username.");
      setLoading(false);
      return;
    }

    if (!isPhoneValid()) {
      setError(country.toLowerCase() === "india"
        ? "Indian phone numbers must be exactly 10 digits starting with mobile prefix 6-9."
        : "International phone numbers must start with a '+' country code followed by 7 to 15 digits."
      );
      setLoading(false);
      return;
    }

    if (!isPinValid()) {
      setError(country.toLowerCase() === "india"
        ? "Indian PIN codes must be exactly 6 digits."
        : "International postal codes must be alphanumeric, 3 to 10 characters."
      );
      setLoading(false);
      return;
    }

    if (accountNumber && !isAccountNumberValid()) {
      setError("Bank account numbers must contain only digits and be between 9 and 18 digits long.");
      setLoading(false);
      return;
    }

    if (ifscCode && !isIfscValid()) {
      setError("Indian IFSC codes must be exactly 11 characters (first 4 uppercase letters, 5th character '0', last 6 alphanumeric).");
      setLoading(false);
      return;
    }

    if (upiId && !isUpiValid()) {
      setError("UPI ID must be in a valid format (e.g. handle@bank).");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          username,
          department,
          requestedPosition,
          pinCode,
          country,
          citizenship,
          region,
          bankName,
          accountNumber,
          ifscCode,
          branchName,
          upiId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to process enrollment.");
      } else {
        setSuccessCode(data.referenceId);
        // Clear fields
        setFullName("");
        setEmail("");
        setPhone("");
        setUsername("");
        setRequestedPosition("");
        setPinCode("");
        setCountry("India");
        setCitizenship("");
        setRegion("");
        setBankName("");
        setAccountNumber("");
        setIfscCode("");
        setBranchName("");
        setUpiId("");
      }
    } catch (err) {
      setError("Failed to communicate with enrollment services.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`relative min-h-screen flex items-center justify-center p-4 overflow-hidden select-none transition-colors duration-500 ${
      currentTheme === "dark" ? "bg-[#030712]" : "bg-[#f1f5f9]"
    }`}>
      {/* Ambient Glowing Orbs */}
      <div className={`absolute top-[-10%] left-[-20%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full blur-[80px] sm:blur-[140px] pointer-events-none animate-pulse duration-10000 transition-colors ${
        currentTheme === "dark" ? "bg-blue-600/10" : "bg-blue-400/15"
      }`} />
      <div className={`absolute bottom-[-15%] right-[-10%] w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full blur-[80px] sm:blur-[140px] pointer-events-none animate-pulse duration-7000 transition-colors ${
        currentTheme === "dark" ? "bg-cyan-500/10" : "bg-sky-400/20"
      }`} />

      {/* Elegant Theme Selector */}
      {mounted && (
        <div className="absolute top-5 right-5 z-20">
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-all duration-300 shadow-md flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 ${
              currentTheme === "dark"
                ? "bg-[#0d1222]/80 border-white/10 text-amber-400 hover:bg-[#0d1222] hover:border-white/20 shadow-black/40"
                : "bg-white/80 border-slate-200 text-indigo-600 hover:bg-white hover:border-slate-300 shadow-slate-200/50"
            }`}
            aria-label="Toggle theme"
          >
            {currentTheme === "dark" ? (
              <Sun className="h-4.5 w-4.5 text-amber-400 animate-spin-slow" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-indigo-600" />
            )}
          </button>
        </div>
      )}

      {/* Registration Card */}
      <div className="relative z-10 w-full max-w-[92%] sm:max-w-md transition-all duration-300">
        <Card className={`transition-all duration-300 border backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl ${
          currentTheme === "dark"
            ? "border-white/10 bg-[#0b0f19]/70 shadow-black/60"
            : "border-slate-200/80 bg-white/80 shadow-slate-200/80"
        }`}>
          <CardHeader className="text-center space-y-3 pb-4 pt-8 px-5 sm:px-8">
            <div className="flex justify-center mb-1">
              <div className={`relative group flex items-center justify-center p-0.5 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500 shadow-lg ${
                currentTheme === "dark" ? "shadow-indigo-500/20" : "shadow-indigo-600/10"
              }`}>
                <div className={`px-4.5 py-1.5 rounded-[10px] transition-all ${
                  currentTheme === "dark" ? "bg-[#0b0f19]" : "bg-white"
                }`}>
                  <span className={`text-2xl font-heading font-extrabold tracking-widest bg-clip-text text-transparent drop-shadow-sm bg-gradient-to-r ${
                    currentTheme === "dark" 
                      ? "from-blue-400 via-indigo-300 to-cyan-400 drop-shadow-[0_2px_4px_rgba(59,130,246,0.3)]" 
                      : "from-blue-600 via-indigo-600 to-cyan-600"
                  }`}>
                    REGISTER
                  </span>
                </div>
              </div>
            </div>
            <CardTitle className={`text-lg sm:text-xl font-heading font-bold tracking-wide transition-colors ${
              currentTheme === "dark" ? "text-white" : "text-slate-900"
            }`}>
              Workforce Onboarding
            </CardTitle>
            <CardDescription className={`text-xs sm:text-sm font-medium transition-colors ${
              currentTheme === "dark" ? "text-gray-400/90" : "text-slate-600"
            }`}>
              Submit credentials to request corporate workspace activation
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-5 sm:px-8 pb-8 pt-2">
            {successCode ? (
              <div className="space-y-6 text-center py-4">
                <div className="flex justify-center">
                  <div className={`p-4.5 rounded-full border ${
                    currentTheme === "dark" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                  }`}>
                    <CheckCircle className="h-10 w-10 animate-bounce" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className={`text-base font-bold transition-colors ${currentTheme === "dark" ? "text-white" : "text-slate-900"}`}>
                    Registration Successful!
                  </h3>
                  <p className={`text-xs leading-relaxed transition-colors ${currentTheme === "dark" ? "text-gray-400" : "text-slate-600"}`}>
                    Your onboarding profile has been registered in the administration queue. Please record your temporary reference token below:
                  </p>
                </div>
                <div className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-1.5 ${
                  currentTheme === "dark" ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                }`}>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-500">Reference Token</span>
                  <span className={`text-lg font-mono font-extrabold tracking-wider ${currentTheme === "dark" ? "text-cyan-400" : "text-blue-600"}`}>
                    {successCode}
                  </span>
                </div>
                <p className="text-[10px] leading-relaxed text-gray-500 max-w-xs mx-auto">
                  Administrators will review your credentials, assign your role domain, and trigger a secure activation email containing your temporary passcode instructions.
                </p>
                <Button
                  onClick={() => router.push("/login")}
                  variant="primary"
                  className="w-full h-11 text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow cursor-pointer"
                >
                  Return to Portal Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                {/* Alert Indicators */}
                {error && (
                  <div className={`flex items-center space-x-3 p-3.5 rounded-xl border text-xs animate-shake ${
                    currentTheme === "dark"
                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                      : "bg-red-50 border-red-200 text-red-600"
                  }`}>
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                    <span className="font-semibold leading-normal">{error}</span>
                  </div>
                )}

                {/* Full Name Entry */}
                <div className="relative group flex flex-col">
                  <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                    currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                  }`}>
                    <User className="h-4 w-4" />
                  </div>
                  <Input
                    label="Full Name"
                    type="text"
                    placeholder="Aarav Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                      currentTheme === "dark"
                        ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                    }`}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Email Entry */}
                <div className="relative group flex flex-col">
                  <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                    currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                  }`}>
                    <Mail className="h-4 w-4" />
                  </div>
                  <Input
                    label="Corporate Email Address"
                    type="email"
                    placeholder="name@aurxon.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                      currentTheme === "dark"
                        ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                    }`}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Phone & Username Row */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="relative group flex flex-col">
                    <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                      currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                    }`}>
                      <Phone className="h-4 w-4" />
                    </div>
                    <Input
                      label="Phone Number"
                      type="tel"
                      placeholder={country.toLowerCase() === "india" ? "9876543210" : "+1 555..."}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                        currentTheme === "dark"
                          ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                      }`}
                      disabled={loading}
                      required
                    />
                    {!isPhoneValid() && (
                      <span className="text-[9px] text-red-500 font-semibold mt-1 block">
                        {country.toLowerCase() === "india" 
                          ? "Must be 10 digits starting with 6-9." 
                          : "Must start with + and have 7-15 digits."}
                      </span>
                    )}
                  </div>

                  <div className="relative group flex flex-col">
                    <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                      currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                    }`}>
                      <User className="h-4 w-4" />
                    </div>
                    <Input
                      label="Username"
                      type="text"
                      placeholder="e.g. aarav12"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setUsernameAvailable(null);
                      }}
                      className={`pl-11 pr-16 h-11 text-xs rounded-xl transition-all duration-200 ${
                        currentTheme === "dark"
                          ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                      }`}
                      disabled={loading}
                      required
                    />
                    
                    {/* Status Badge Indicators */}
                    {usernameChecking && (
                      <span className="absolute right-3 top-[37px] text-[9px] font-semibold text-indigo-400 animate-pulse bg-indigo-500/10 px-1.5 py-0.5 rounded">Checking...</span>
                    )}
                    {!usernameChecking && usernameAvailable === true && (
                      <span className="absolute right-3 top-[37px] text-[9px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Available</span>
                    )}
                    {!usernameChecking && usernameAvailable === false && (
                      <span className="absolute right-3 top-[37px] text-[9px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Taken</span>
                    )}

                    {usernameError && (
                      <span className="text-[9px] text-red-500 font-semibold mt-1 block leading-tight">{usernameError}</span>
                    )}

                    {!usernameChecking && usernameAvailable === false && usernameSuggestions.length > 0 && (
                      <div className="mt-1.5 space-y-1">
                        <span className="text-[9px] text-gray-400 font-semibold block">Suggestions:</span>
                        <div className="flex flex-wrap gap-1">
                          {usernameSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                setUsername(suggestion);
                                setUsernameAvailable(null);
                              }}
                              className={`px-1.5 py-0.5 text-[9px] font-mono font-medium rounded border transition-all duration-200 cursor-pointer ${
                                currentTheme === "dark"
                                  ? "bg-white/5 border-white/10 hover:bg-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 hover:text-white"
                                  : "bg-slate-100 border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-indigo-600"
                              }`}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Department Dropdown */}
                <div className="relative flex flex-col">
                  <label className={`text-xs font-semibold mb-1.5 transition-colors ${
                    currentTheme === "dark" ? "text-gray-300" : "text-slate-700"
                  }`}>
                    Assigned Corporate Department
                  </label>
                  <div className="relative">
                    <div className={`absolute left-4 top-3.5 transition-colors duration-300 pointer-events-none z-10 ${
                      currentTheme === "dark" ? "text-gray-400" : "text-slate-400"
                    }`}>
                      <Layers className="h-4 w-4" />
                    </div>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className={`pl-11 pr-4 h-11 w-full text-xs rounded-xl border appearance-none transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        currentTheme === "dark"
                          ? "bg-[#0f172a] border-white/10 text-white hover:border-white/20"
                          : "bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300"
                      }`}
                      disabled={loading}
                      required
                    >
                      <option value="Software Engineering">Software Engineering</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Product Management">Product Management</option>
                      <option value="Data Analytics">Data Analytics</option>
                      <option value="Operations">Operations</option>
                      <option value="Marketing & Growth">Marketing & Growth</option>
                    </select>
                  </div>
                </div>

                {/* Requested Position Entry */}
                <div className="relative group flex flex-col">
                  <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                    currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                  }`}>
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <Input
                    label="Requested Workspace Role Domain"
                    type="text"
                    placeholder="e.g. Software Engineer Intern"
                    value={requestedPosition}
                    onChange={(e) => setRequestedPosition(e.target.value)}
                    className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                      currentTheme === "dark"
                        ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                    }`}
                    disabled={loading}
                    required
                  />
                </div>

                {/* Country of Residence Dropdown */}
                <div className="relative flex flex-col">
                  <label className={`text-xs font-semibold mb-1.5 transition-colors ${
                    currentTheme === "dark" ? "text-gray-300" : "text-slate-700"
                  }`}>
                    Country of Residence
                  </label>
                  <select
                    value={country}
                    onChange={(e) => {
                      setCountry(e.target.value);
                      setError(null);
                    }}
                    className={`px-4 h-11 w-full text-xs rounded-xl border appearance-none transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      currentTheme === "dark"
                        ? "bg-[#0f172a] border-white/10 text-white hover:border-white/20"
                        : "bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300"
                    }`}
                    disabled={loading}
                    required
                  >
                    <option value="India">India</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Canada">Canada</option>
                    <option value="Australia">Australia</option>
                    <option value="Germany">Germany</option>
                    <option value="Singapore">Singapore</option>
                    <option value="United Arab Emirates">United Arab Emirates</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Citizenship & Region Row */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="relative group flex flex-col">
                    <Input
                      label="Citizenship"
                      type="text"
                      placeholder="e.g. Indian"
                      value={citizenship}
                      onChange={(e) => setCitizenship(e.target.value)}
                      className={`h-11 text-xs rounded-xl transition-all duration-200 ${
                        currentTheme === "dark"
                          ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                      }`}
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="relative group flex flex-col">
                    <Input
                      label="Region / State"
                      type="text"
                      placeholder="e.g. Delhi"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className={`h-11 text-xs rounded-xl transition-all duration-200 ${
                        currentTheme === "dark"
                          ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                      }`}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* Mailing PIN Code */}
                <div className="relative group flex flex-col">
                  <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                    currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                  }`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <Input
                    label="Mailing PIN / Postal Code"
                    type="text"
                    placeholder={country.toLowerCase() === "india" ? "110001" : "90210"}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                      currentTheme === "dark"
                        ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                    }`}
                    disabled={loading}
                    required
                  />
                  {!isPinValid() && (
                    <span className="text-[9px] text-red-500 font-semibold mt-1 block">
                      {country.toLowerCase() === "india" 
                        ? "PIN code must be exactly 6 digits." 
                        : "Postal code must be alphanumeric (3-10 chars)."}
                    </span>
                  )}
                </div>

                {/* Disbursement Bank Details */}
                <div className="border-t border-white/5 pt-4 my-2">
                  <span className={`text-[10px] font-heading font-extrabold uppercase tracking-widest block mb-3 ${
                    currentTheme === "dark" ? "text-indigo-400 animate-pulse" : "text-indigo-600"
                  }`}>
                    Disbursement Bank Details
                  </span>
                  
                  <div className="space-y-4">
                    {/* Bank Name */}
                    <div className="relative group flex flex-col">
                      <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                        currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                      }`}>
                        <Landmark className="h-4 w-4" />
                      </div>
                      <Input
                        label="Bank Name"
                        type="text"
                        placeholder="e.g. HDFC Bank"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                          currentTheme === "dark"
                            ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                        }`}
                        disabled={loading}
                      />
                    </div>

                    {/* Account Number & IFSC Code Row */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="relative group flex flex-col">
                        <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                          currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                        }`}>
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <Input
                          label="Account Number"
                          type="text"
                          placeholder="e.g. 50100234..."
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                            currentTheme === "dark"
                              ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                          }`}
                          disabled={loading}
                        />
                        {!isAccountNumberValid() && (
                          <span className="text-[9px] text-red-500 font-semibold mt-1 block">
                            Must be 9-18 digits.
                          </span>
                        )}
                      </div>

                      <div className="relative group flex flex-col">
                        <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                          currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                        }`}>
                          <Building2 className="h-4 w-4" />
                        </div>
                        <Input
                          label="IFSC Code"
                          type="text"
                          placeholder="e.g. HDFC0000240"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                          className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                            currentTheme === "dark"
                              ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                          }`}
                          disabled={loading}
                        />
                        {!isIfscValid() && (
                          <span className="text-[9px] text-red-500 font-semibold mt-1 block">
                            Must be 11 characters (e.g. HDFC0000123).
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Branch Name & UPI ID Row */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="relative group flex flex-col">
                        <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                          currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                        }`}>
                          <Building2 className="h-4 w-4" />
                        </div>
                        <Input
                          label="Branch Name"
                          type="text"
                          placeholder="Connaught Place"
                          value={branchName}
                          onChange={(e) => setBranchName(e.target.value)}
                          className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                            currentTheme === "dark"
                              ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                          }`}
                          disabled={loading}
                        />
                      </div>

                      <div className="relative group flex flex-col">
                        <div className={`absolute left-4 top-[39px] transition-colors duration-300 pointer-events-none z-10 ${
                          currentTheme === "dark" ? "text-gray-400 group-focus-within:text-blue-400" : "text-slate-400 group-focus-within:text-blue-600"
                        }`}>
                          <CreditCard className="h-4 w-4" />
                        </div>
                        <Input
                          label="UPI ID (Optional)"
                          type="text"
                          placeholder="e.g. name@okhdfc"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value)}
                          className={`pl-11 h-11 text-xs rounded-xl transition-all duration-200 ${
                            currentTheme === "dark"
                              ? "bg-white/5 border-white/10 hover:border-white/20 focus:border-blue-500/70 focus:bg-[#0d1424] text-white placeholder-gray-500"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300 focus:border-blue-500/70 focus:bg-white text-slate-900 placeholder-slate-400"
                          }`}
                          disabled={loading}
                        />
                        {!isUpiValid() && (
                          <span className="text-[9px] text-red-500 font-semibold mt-1 block">
                            Must be format handle@bank.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit & Navigation Row */}
                <div className="flex justify-between items-center pt-2">
                  <Link
                    href="/login"
                    className={`flex items-center space-x-1 text-xs transition-colors font-semibold cursor-pointer ${
                      currentTheme === "dark" ? "text-gray-400 hover:text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Back to Login</span>
                  </Link>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full h-12 text-xs font-semibold tracking-wide font-heading bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 text-white rounded-xl transition-all duration-300 scale-active-98 active:scale-98 cursor-pointer"
                  isLoading={loading}
                >
                  Submit Enrollment Request
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        
        {/* Trademark */}
        <p className={`text-center text-[9px] sm:text-[10px] mt-8 tracking-widest uppercase font-semibold transition-colors ${
          currentTheme === "dark" ? "text-gray-500/80" : "text-slate-500"
        }`}>
          © 2026 AURXON Technologies. All rights reserved.
        </p>
      </div>
    </div>
  );
}
