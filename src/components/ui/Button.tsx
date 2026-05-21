import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center font-heading font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-all duration-300 btn-glow select-none",
          // Variant-specific styles
          {
            "bg-primary text-primary-foreground hover:bg-primary/95 shadow-[0_4px_16px_0_rgba(59,130,246,0.3)] hover:shadow-[0_6px_24px_0_rgba(59,130,246,0.45)] focus:ring-primary":
              variant === "primary",
            "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary border border-border":
              variant === "secondary",
            "border border-border bg-transparent text-foreground hover:bg-secondary/40 focus:ring-muted":
              variant === "outline",
            "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_4px_16px_0_rgba(239,68,68,0.25)] focus:ring-destructive":
              variant === "destructive",
            "bg-transparent text-foreground hover:bg-secondary/30 focus:ring-muted":
              variant === "ghost",
          },
          // Size-specific styles
          {
            "px-3 py-1.5 text-xs rounded-md": size === "sm",
            "px-4.5 py-2.5 text-sm": size === "md",
            "px-6 py-3.5 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
