import type React from "react";
import { cn } from "@/lib/utils";

export const PageContainer = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className={cn("w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8", className)}>
      {children}
    </div>
  );
};

