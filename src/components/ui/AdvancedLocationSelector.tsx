"use client";

import React, { useState, useEffect, useRef } from "react";
import { COUNTRIES as STATIC_COUNTRIES, TIMEZONES } from "@/lib/countryData";
import { Clock, Globe, MapPin, Sparkles } from "lucide-react";

interface AdvancedLocationSelectorProps {
  country: string;
  state: string;
  city: string;
  region: string;
  phoneNumber: string;
  onChange: (fields: { country: string; state: string; city: string; region: string; phoneNumber: string }) => void;
  disabled?: boolean;
}

export default function AdvancedLocationSelector({
  country,
  state,
  city,
  region,
  phoneNumber,
  onChange,
  disabled = false,
}: AdvancedLocationSelectorProps) {
  // Extract dial code and actual number from phoneNumber if possible
  const [dialCode, setDialCode] = useState("+91");
  const [localNumber, setLocalNumber] = useState("");

  const [currentTimeIST, setCurrentTimeIST] = useState("");
  const [currentLocalTime, setCurrentLocalTime] = useState("");

  const [countriesList, setCountriesList] = useState<any[]>(STATIC_COUNTRIES);
  const [statesList, setStatesList] = useState<any[]>([]);
  const [citiesList, setCitiesList] = useState<any[]>([]);

  const selectedCountryObj = countriesList.find((c) => c.name === country) || countriesList[0] || { code: "IN", name: "India" };

  const parsedPhoneRef = useRef(false);

  // Load countries dynamically on mount
  useEffect(() => {
    async function loadCountries() {
      try {
        const res = await fetch("/api/location?type=countries");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setCountriesList(data);
          }
        }
      } catch (e) {
        console.error("Load countries error:", e);
      }
    }
    loadCountries();
  }, []);

  // Load states dynamically when country changes
  useEffect(() => {
    if (!country) {
      setStatesList([]);
      return;
    }
    const cObj = countriesList.find((c) => c.name === country);
    if (!cObj) {
      setStatesList([]);
      return;
    }

    async function loadStates() {
      try {
        const res = await fetch(`/api/location?type=states&countryCode=${cObj.code}`);
        if (res.ok) {
          const data = await res.json();
          setStatesList(data || []);
        }
      } catch (e) {
        console.error("Load states error:", e);
      }
    }
    loadStates();
  }, [country, countriesList]);

  // Load cities dynamically when state changes
  useEffect(() => {
    if (!state || !country) {
      setCitiesList([]);
      return;
    }
    const cObj = countriesList.find((c) => c.name === country);
    const sObj = statesList.find((s) => s.name === state);
    if (!cObj || !sObj) {
      setCitiesList([]);
      return;
    }

    async function loadCities() {
      try {
        const res = await fetch(`/api/location?type=cities&countryCode=${cObj.code}&stateCode=${sObj.code}`);
        if (res.ok) {
          const data = await res.json();
          setCitiesList(data || []);
        }
      } catch (e) {
        console.error("Load cities error:", e);
      }
    }
    loadCities();
  }, [state, statesList, country, countriesList]);

  // Parse initial phone number once countries list is populated
  useEffect(() => {
    if (phoneNumber && countriesList.length > 0 && !parsedPhoneRef.current) {
      const sorted = [...countriesList].sort((a, b) => b.dialCode.length - a.dialCode.length);
      const match = sorted.find((c) => phoneNumber.startsWith(c.dialCode));
      if (match) {
        setDialCode(match.dialCode);
        setLocalNumber(phoneNumber.slice(match.dialCode.length).trim());
      } else {
        setLocalNumber(phoneNumber);
      }
      parsedPhoneRef.current = true;
    } else if (phoneNumber && !parsedPhoneRef.current) {
      setLocalNumber(phoneNumber);
    }
  }, [phoneNumber, countriesList]);

  // Time station effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      // IST
      const istOptions: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata", hour: '2-digit', minute: '2-digit', second: '2-digit' };
      setCurrentTimeIST(now.toLocaleTimeString("en-US", istOptions));
      
      // Local time if not India
      if (selectedCountryObj && selectedCountryObj.code !== "IN") {
        const tz = TIMEZONES[selectedCountryObj.code] || "UTC";
        try {
          const localOptions: Intl.DateTimeFormatOptions = { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' };
          setCurrentLocalTime(now.toLocaleTimeString("en-US", localOptions));
        } catch (e) {
          setCurrentLocalTime("");
        }
      } else {
        setCurrentLocalTime("");
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedCountryObj]);

  const updateFields = (updates: any) => {
    const newCountry = updates.country !== undefined ? updates.country : country;
    const newState = updates.state !== undefined ? updates.state : state;
    const newCity = updates.city !== undefined ? updates.city : city;
    const newRegion = updates.region !== undefined ? updates.region : region;
    const newDialCode = updates.dialCode !== undefined ? updates.dialCode : dialCode;
    const newLocalNumber = updates.localNumber !== undefined ? updates.localNumber : localNumber;
    
    onChange({
      country: newCountry,
      state: newState,
      city: newCity,
      region: newRegion,
      phoneNumber: `${newDialCode} ${newLocalNumber}`.trim(),
    });
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountryName = e.target.value;
    const cObj = countriesList.find((c) => c.name === newCountryName);
    if (cObj) {
      setDialCode(cObj.dialCode);
      updateFields({
        country: cObj.name,
        region: cObj.region,
        state: "",
        city: "",
        dialCode: cObj.dialCode
      });
    } else {
      updateFields({
        country: "",
        region: "",
        state: "",
        city: ""
      });
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center space-x-2 text-cyan-600 dark:text-cyan-400 mb-2">
        <Globe className="h-5 w-5" />
        <h4 className="text-sm font-heading font-extrabold tracking-wide uppercase">Location & Contact Station</h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Country */}
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
            <span>Country</span>
            <Sparkles className="h-3 w-3 text-cyan-500" />
          </label>
          <select
            disabled={disabled}
            value={country}
            onChange={handleCountryChange}
            className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <option value="">Select Country</option>
            {countriesList.map((c) => (
              <option key={c.code} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* State */}
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
            <span>State / Province</span>
            <Sparkles className="h-3 w-3 text-cyan-500" />
          </label>
          <select
            disabled={disabled || !country}
            value={state}
            onChange={(e) => updateFields({ state: e.target.value, city: "" })}
            className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <option value="">Select State</option>
            {statesList.map((s) => (
              <option key={s.code + s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* City */}
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
            <span>City</span>
            <Sparkles className="h-3 w-3 text-cyan-500" />
          </label>
          <select
            disabled={disabled || !state}
            value={city}
            onChange={(e) => updateFields({ city: e.target.value })}
            className="flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <option value="">Select City</option>
            {citiesList.map((c) => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Region */}
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
            Region
          </label>
          <div className="flex h-11 w-full items-center rounded-md border border-border bg-secondary/50 px-3.5 py-2 text-sm text-muted-foreground cursor-not-allowed font-medium">
            <MapPin className="h-4 w-4 mr-2 opacity-50" />
            {region || "Select a country"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Phone Number */}
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1">
            <span>Contact Number</span>
            <Sparkles className="h-3 w-3 text-cyan-500" />
          </label>
          <div className="flex">
            <select
              disabled={disabled}
              value={dialCode}
              onChange={(e) => {
                setDialCode(e.target.value);
                updateFields({ dialCode: e.target.value });
              }}
              className="flex h-11 w-24 rounded-l-md border border-r-0 border-border bg-secondary/30 px-2 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 font-mono font-bold"
            >
              {countriesList.map((c) => (
                <option key={c.code} value={c.dialCode}>{c.code} ({c.dialCode})</option>
              ))}
            </select>
            <input
              disabled={disabled}
              type="text"
              placeholder="Phone number"
              value={localNumber}
              onChange={(e) => {
                setLocalNumber(e.target.value);
                updateFields({ localNumber: e.target.value });
              }}
              className="flex h-11 w-full rounded-r-md border border-border bg-input px-3.5 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 font-mono"
            />
          </div>
        </div>

        {/* Time Station Sync */}
        <div className="flex flex-col space-y-1.5 w-full">
          <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider">
            Time Station Sync
          </label>
          <div className="flex h-11 w-full items-center justify-between rounded-md border border-indigo-500/20 bg-indigo-500/5 px-3.5 py-2 text-sm shadow-sm overflow-hidden">
            <div className="flex items-center space-x-2 w-1/2 border-r border-indigo-500/20">
              <Clock className="h-4 w-4 text-indigo-400" />
              <div className="flex flex-col leading-none justify-center">
                <span className="text-[9px] font-bold text-indigo-400 uppercase">India (IST)</span>
                <span className="font-mono font-semibold text-indigo-300 text-xs">{currentTimeIST || "--:--:--"}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2 pl-3 w-1/2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <div className="flex flex-col leading-none justify-center">
                <span className="text-[9px] font-bold text-emerald-400 uppercase">{selectedCountryObj.code !== "IN" ? selectedCountryObj.name : "Local"}</span>
                <span className="font-mono font-semibold text-emerald-300 text-xs">{selectedCountryObj.code !== "IN" ? currentLocalTime || "--:--:--" : "Matches IST"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
