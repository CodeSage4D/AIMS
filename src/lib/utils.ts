import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind classes dynamically with high efficiency and no layout collisions.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats numeric values into professional local currency displays (Rupees by default for Aurxon).
 */
export function formatCurrency(amount: number | string) {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(numericAmount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount);
}

/**
 * Converts dynamic date signatures into beautiful, high-readability strings.
 * Example output: "May 21, 2026"
 */
export function formatDate(date: string | Date | null | undefined) {
  if (!date) return "N/A";
  const parsedDate = typeof date === "string" ? new Date(date) : date;
  if (isNaN(parsedDate.getTime())) return "N/A";
  return parsedDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Dynamically computes attendance rate given total working days and present counts.
 */
export function calculateAttendancePercentage(present: number, total: number) {
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
}
