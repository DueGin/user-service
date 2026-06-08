import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  icon: Icon,
  action,
  className,
}: AdminPageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-4">
        <div className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl border border-blue-300/20 bg-blue-300/10 text-blue-200 shadow-[0_0_0_1px_rgb(255_255_255/0.03)]">
          <Icon className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
            {title}
          </h1>
          <p className="mt-1 max-w-[56ch] text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </header>
  );
}
