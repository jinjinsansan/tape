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
      primary: "bg-tape-orange text-white hover:bg-tape-orange/90 shadow-sm",
      secondary: "bg-tape-beige text-tape-brown hover:bg-tape-beige/80",
      outline: "border-2 border-tape-brown/20 bg-transparent hover:bg-tape-beige text-tape-brown",
      ghost: "hover:bg-tape-beige text-tape-brown",
      accent: "bg-tape-green text-tape-brown hover:bg-tape-green/90",
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
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tape-orange focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-tape-cream",
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
