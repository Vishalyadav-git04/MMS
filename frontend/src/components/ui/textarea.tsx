import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[56px] w-full rounded-[8px] border border-input bg-card px-2.5 py-2 text-[13px] shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-[rgba(20,86,140,0.14)] disabled:cursor-not-allowed disabled:opacity-50 font-variant-numeric:tabular-nums",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
