import * as React from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, ...props }, ref) => {
    const cleanLabel = label ? label.replace(/\s*\*$/, "").replace(/\s*\(Required\)$/i, "") : "";
    return (
      <div className="flex flex-col space-y-1.5 w-full">
        {label && (
          <label className="text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider select-none flex items-center gap-1.5">
            <span>{cleanLabel}</span>
            {props.required && (
              <Sparkles className="h-3 w-3 text-indigo-500 fill-indigo-500/20 shrink-0" />
            )}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-md border border-border bg-input px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm",
            error && "border-destructive focus:ring-destructive focus:border-destructive",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-destructive font-medium mt-0.5">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
