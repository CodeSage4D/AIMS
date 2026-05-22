"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type CurrencyType = "INR" | "USD";

interface CurrencyContextProps {
  currency: CurrencyType;
  setCurrency: (currency: CurrencyType) => void;
  convert: (amountInINR: number | string) => number;
  format: (amountInINR: number | string) => string;
}

const CurrencyContext = createContext<CurrencyContextProps | undefined>(undefined);

const USD_RATE = 83; // 1 USD = 83 INR

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyType>("INR");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("aurxon_preferred_currency") as CurrencyType;
    if (saved === "INR" || saved === "USD") {
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = (newCurrency: CurrencyType) => {
    setCurrencyState(newCurrency);
    localStorage.setItem("aurxon_preferred_currency", newCurrency);
    // Sync with cookies so server components can optionally read user's choice
    document.cookie = `aurxon_currency=${newCurrency}; path=/; max-age=31536000; SameSite=Lax`;
    
    // Broadcast storage event to sync all browser tabs/windows
    window.dispatchEvent(new Event("storage"));
  };

  const convert = (amountInINR: number | string): number => {
    const inrVal = typeof amountInINR === "string" ? parseFloat(amountInINR) : Number(amountInINR);
    if (isNaN(inrVal)) return 0;
    if (currency === "USD") {
      return inrVal / USD_RATE;
    }
    return inrVal;
  };

  const format = (amountInINR: number | string): string => {
    const numericAmount = typeof amountInINR === "string" ? parseFloat(amountInINR) : Number(amountInINR);
    if (isNaN(numericAmount)) return currency === "USD" ? "$0" : "₹0";

    const converted = convert(numericAmount);

    if (currency === "USD") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(converted);
    } else {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(converted);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, convert, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
