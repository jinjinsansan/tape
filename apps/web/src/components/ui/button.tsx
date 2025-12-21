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
      primary: "bg-[#c68e9b] text-white shadow-sm shadow-[#c68e9b]/25 hover:bg-[#bd8491]",
      secondary: "border border-[#e7ded5] bg-white text-[#4b3f3a] hover:bg-[#f7f1eb]",
      outline: "border border-[#d9cec4] bg-transparent text-[#4b3f3a] hover:bg-white/70",
      ghost: "text-[#4b3f3a] hover:bg-[#f4ede6]",
      accent: "bg-[#8aa9c8] text-white shadow-sm shadow-[#8aa9c8]/20 hover:bg-[#809fbe]",
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
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c68e9b] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-[#f9f7f3]",
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
