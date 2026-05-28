"use client";

import React, { useState, useEffect } from "react";
import { countryData } from "@/lib/countryData";
import { Input } from "./Input";
import { Clock, MapPin, Globe, Phone, Sparkles } from "lucide-react";

interface AdvancedLocationSelectorProps {
  country: string;
  state: string;
  city: string;
  region: string;
  phoneNumber: string;
  onCountryChange: (val: string) => void;
  onStateChange: (val: string) => void;
  onCityChange: (val: string) => void;
  onRegionChange: (val: string) => void;
  onPhoneNumberChange: (val: string) => void;
  currentTheme?: "light" | "dark";
  disabled?: boolean;
  required?: boolean;
}

export default function AdvancedLocationSelector({
  country,
  state,
  city,
  region,
  phoneNumber,
  onCountryChange,
  onStateChange,
  onCityChange,
  onRegionChange,
  onPhoneNumberChange,
  currentTheme = "dark",
  disabled = false,
  required = true,
}: AdvancedLocationSelectorProps) {
  // Local state to manage the split dial code and phone number suffix
  const [selectedDialCode, setSelectedDialCode] = useState("+91");
  const [phoneSuffix, setPhoneSuffix] = useState("");
  const [timeState, setTimeState] = useState({ ist: "", local: "", localZoneName: "" });

  // Sync / Parse phoneNumber from parent
  useEffect(() => {
    if (!phoneNumber) {
      setPhoneSuffix("");
      return;
    }
    // Try to find if phoneNumber starts with any dialCode in countryData
    const sortedCountries = [...countryData].sort((a, b) => b.dialCode.length - a.dialCode.length);
    const matched = sortedCountries.find((c) => phoneNumber.startsWith(c.dialCode));
    if (matched) {
      setSelectedDialCode(matched.dialCode);
      setPhoneSuffix(phoneNumber.slice(matched.dialCode.length).trim());
    } else {
      // Default fallback if no match
      setPhoneSuffix(phoneNumber);
    }
  }, [phoneNumber]);

  // When selected country changes, auto-populate region and dialing code
  const handleCountrySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    onCountryChange(selectedName);

    const countryObj = countryData.find((c) => c.name === selectedName);
    if (countryObj) {
      onRegionChange(countryObj.region);
      setSelectedDialCode(countryObj.dialCode);
      // Auto trigger state / city reset if predefined
      const availableStates = Object.keys(countryObj.states);
      if (availableStates.length > 0) {
        onStateChange(availableStates[0]);
        const cities = countryObj.states[availableStates[0]];
        if (cities && cities.length > 0) {
          onCityChange(cities[0]);
        } else {
          onCityChange("");
        }
      } else {
        onStateChange("");
        onCityChange("");
      }

      // Propagate new phone with new dialCode
      onPhoneNumberChange(countryObj.dialCode + phoneSuffix);
    }
  };

  const handleStateSelect = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const selectedState = e.target.value;
    onStateChange(selectedState);

    const countryObj = countryData.find((c) => c.name === country);
    if (countryObj && countryObj.states[selectedState]) {
      const cities = countryObj.states[selectedState];
      if (cities && cities.length > 0) {
        onCityChange(cities[0]);
      } else {
        onCityChange("");
      }
    }
  };

  const handlePhoneSuffixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/[^0-9]/g, ""); // allow only digits
    setPhoneSuffix(rawVal);
    onPhoneNumberChange(selectedDialCode + rawVal);
  };

  const handleDialCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setSelectedDialCode(newCode);
    onPhoneNumberChange(newCode + phoneSuffix);
  };

  // Live clock tick
  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      // IST Clock formatting
      const istOptions: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      const istStr = now.toLocaleTimeString("en-US", istOptions);

      // Selected country local clock formatting
      const countryObj = countryData.find((c) => c.name === country);
      let localStr = "";
      let localZoneName = "";

      if (countryObj && countryObj.timezone) {
        localZoneName = countryObj.timezone;
        try {
          const localOptions: Intl.DateTimeFormatOptions = {
            timeZone: countryObj.timezone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          };
          localStr = now.toLocaleTimeString("en-US", localOptions);
        } catch (e) {
          localStr = istStr;
          localZoneName = "Asia/Kolkata";
        }
      }

      setTimeState({ ist: istStr, local: localStr, localZoneName });
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, [country]);

  const selectedCountryObj = countryData.find((c) => c.name === country);
  const statesList = selectedCountryObj ? Object.keys(selectedCountryObj.states) : [];
  const citiesList = (selectedCountryObj && state && selectedCountryObj.states[state])
    ? selectedCountryObj.states[state]
    : [];

  const isDark = currentTheme === "dark";

  return (
    <div className="space-y-4 w-full">
      {/* Country Selection */}
      <div className="relative flex flex-col space-y-1.5">
        <label className={`text-xs font-heading font-semibold uppercase tracking-wider select-none flex items-center space-x-1.5 ${
          isDark ? "text-gray-300" : "text-slate-700"
        }`}>
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span>Country of Residence</span>
          {required && <Sparkles className="h-3 w-3 text-indigo-500 fill-indigo-500/20 shrink-0" />}
        </label>
        <select
          value={country}
          onChange={handleCountrySelect}
          disabled={disabled}
          className={`flex h-11 w-full rounded-md border px-3.5 py-2 text-sm transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary ${
            isDark
              ? "border-white/10 bg-[#0f172a] text-white focus:border-primary"
              : "border-slate-200 bg-white text-slate-900 focus:border-primary"
          }`}
        >
          {countryData.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.code})
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
      </div>

      {/* State & City & Region Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* State Selection */}
        <div className="relative flex flex-col space-y-1.5">
          <label className={`text-xs font-heading font-semibold uppercase tracking-wider select-none flex items-center space-x-1.5 ${
            isDark ? "text-gray-300" : "text-slate-700"
          }`}>
            <MapPin className="h-3.5 w-3.5 text-indigo-400" />
            <span>State / Territory</span>
            {required && <Sparkles className="h-3 w-3 text-indigo-500 fill-indigo-500/20 shrink-0" />}
          </label>
          {statesList.length > 0 ? (
            <select
              value={state}
              onChange={handleStateSelect}
              disabled={disabled}
              className={`flex h-11 w-full rounded-md border px-3.5 py-2 text-sm transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                isDark
                  ? "border-white/10 bg-[#0f172a] text-white focus:border-primary"
                  : "border-slate-200 bg-white text-slate-900 focus:border-primary"
              }`}
            >
              {statesList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={state}
              onChange={(e) => onStateChange(e.target.value)}
              disabled={disabled}
              placeholder="Enter State"
              required={required}
              className={`flex h-11 w-full rounded-md border px-3.5 py-2 text-sm transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                isDark
                  ? "border-white/10 bg-[#0f172a] text-white placeholder-gray-500 focus:border-primary"
                  : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-primary"
              }`}
            />
          )}
        </div>

        {/* City Selection */}
        <div className="relative flex flex-col space-y-1.5">
          <label className={`text-xs font-heading font-semibold uppercase tracking-wider select-none flex items-center space-x-1.5 ${
            isDark ? "text-gray-300" : "text-slate-700"
          }`}>
            <MapPin className="h-3.5 w-3.5 text-blue-400" />
            <span>City</span>
            {required && <Sparkles className="h-3 w-3 text-indigo-500 fill-indigo-500/20 shrink-0" />}
          </label>
          {citiesList.length > 0 ? (
            <select
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              disabled={disabled}
              className={`flex h-11 w-full rounded-md border px-3.5 py-2 text-sm transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                isDark
                  ? "border-white/10 bg-[#0f172a] text-white focus:border-primary"
                  : "border-slate-200 bg-white text-slate-900 focus:border-primary"
              }`}
            >
              {citiesList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={city}
              onChange={(e) => onCityChange(e.target.value)}
              disabled={disabled}
              placeholder="Enter City"
              required={required}
              className={`flex h-11 w-full rounded-md border px-3.5 py-2 text-sm transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary ${
                isDark
                  ? "border-white/10 bg-[#0f172a] text-white placeholder-gray-500 focus:border-primary"
                  : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-primary"
              }`}
            />
          )}
        </div>

        {/* Region (Read-only if predefined country, editable if Other) */}
        <div className="relative flex flex-col space-y-1.5">
          <label className={`text-xs font-heading font-semibold uppercase tracking-wider select-none ${
            isDark ? "text-gray-300" : "text-slate-700"
          }`}>
            Region
          </label>
          <input
            type="text"
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            readOnly={!!selectedCountryObj}
            disabled={disabled}
            placeholder="Region (e.g. Asia, EU)"
            className={`flex h-11 w-full rounded-md border px-3.5 py-2 text-sm transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary ${
              isDark
                ? "border-white/10 bg-[#0f172a] text-white placeholder-gray-500 focus:border-primary"
                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-primary"
            } ${selectedCountryObj ? "opacity-60 cursor-not-allowed" : ""}`}
          />
        </div>
      </div>

      {/* Phone Number Field */}
      <div className="relative flex flex-col space-y-1.5">
        <label className={`text-xs font-heading font-semibold uppercase tracking-wider select-none flex items-center space-x-1.5 ${
          isDark ? "text-gray-300" : "text-slate-700"
        }`}>
          <Phone className="h-3.5 w-3.5 text-emerald-400" />
          <span>Mobile Phone Number</span>
          {required && <Sparkles className="h-3 w-3 text-indigo-500 fill-indigo-500/20 shrink-0" />}
        </label>
        <div className="flex space-x-2">
          {/* Dialing Code Selector */}
          <select
            value={selectedDialCode}
            onChange={handleDialCodeChange}
            disabled={disabled}
            className={`flex h-11 w-28 rounded-md border px-2 py-2 text-sm transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary shrink-0 ${
              isDark
                ? "border-white/10 bg-[#0f172a] text-white focus:border-primary"
                : "border-slate-200 bg-white text-slate-900 focus:border-primary"
            }`}
          >
            {countryData.map((c) => (
              <option key={`${c.name}-dial`} value={c.dialCode}>
                {c.dialCode} ({c.code})
              </option>
            ))}
            <option value="+1">+1 (NA)</option>
            <option value="+44">+44 (UK)</option>
            <option value="+91">+91 (IN)</option>
          </select>

          {/* Suffix Number Input */}
          <input
            type="tel"
            value={phoneSuffix}
            onChange={handlePhoneSuffixChange}
            disabled={disabled}
            required={required}
            placeholder={country.toLowerCase() === "india" ? "98765 43210" : "0123 4567"}
            className={`flex h-11 w-full rounded-md border px-3.5 py-2 text-sm transition-all duration-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary ${
              isDark
                ? "border-white/10 bg-[#0f172a] text-white placeholder-gray-500 focus:border-primary"
                : "border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:border-primary"
            }`}
          />
        </div>
      </div>

      {/* Live Clocks Station */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 ${
        isDark
          ? "bg-slate-900/40 border-white/[0.06] text-white"
          : "bg-slate-50 border-slate-200 text-slate-800"
      }`}>
        <div className="flex items-center space-x-2 shrink-0">
          <Clock className="h-4.5 w-4.5 text-primary shrink-0 animate-pulse" />
          <span className="text-xs font-bold font-heading uppercase tracking-wide">
            Live Global Clock Station
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
          {/* India IST Clock */}
          <div className="px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <span className="text-[10px] text-muted-foreground mr-1 uppercase">IST (India):</span>
            <span>{timeState.ist || "--:--:--"}</span>
          </div>

          {/* Selected Country local Clock (Only if outside India) */}
          {country !== "India" && timeState.local && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 animate-fadeIn">
              <span className="text-[10px] text-muted-foreground mr-1 uppercase">
                Local ({country}):
              </span>
              <span>{timeState.local}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
