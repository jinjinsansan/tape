import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "accent";
  size?: "sm" | "md" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-[#d59da9] text-white shadow-sm shadow-[#d59da9]/25 hover:bg-[#ce94a0]",
      secondary: "border border-[#f0e4d8] bg-white text-[#51433c] hover:bg-[#fff6ed]",
      outline: "border border-[#e4d9cd] bg-transparent text-[#51433c] hover:bg-white/70",
      ghost: "text-[#51433c] hover:bg-[#f7efe6]",
      accent: "bg-[#92b4d6] text-white shadow-sm shadow-[#92b4d6]/25 hover:bg-[#8aa6c7]",
    };

    const sizes = {
      sm: "h-8 px-3 text-sm rounded-full",
      md: "h-10 px-6 text-base rounded-full",
      lg: "h-12 px-8 text-lg rounded-full",
      icon: "h-10 w-10 p-0 rounded-full flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d59da9] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-[#fffaf4]",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
