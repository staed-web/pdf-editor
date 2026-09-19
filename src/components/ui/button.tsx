"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-amber-500 text-zinc-950 shadow-sm hover:bg-amber-400",
        secondary:
          "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:border-zinc-700/80",
        ghost:
          "hover:bg-zinc-100 text-zinc-700 hover:text-zinc-950 dark:hover:bg-zinc-800/80 dark:text-zinc-300 dark:hover:text-zinc-50",
        outline:
          "border border-zinc-300 bg-transparent hover:bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-800/60 dark:text-zinc-200",
        destructive: "bg-red-600/90 text-white hover:bg-red-500",
        tool: "h-9 w-9 p-0 rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 data-[active=true]:bg-amber-500/15 data-[active=true]:text-amber-600 data-[active=true]:ring-1 data-[active=true]:ring-amber-500/40 dark:text-zinc-400 dark:hover:text-zinc-50 dark:hover:bg-zinc-800 dark:data-[active=true]:text-amber-400",
      },
      size: {
        default: "h-9 px-3.5 py-2",
        sm: "h-8 rounded-md px-2.5 text-xs",
        lg: "h-11 rounded-xl px-5",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
