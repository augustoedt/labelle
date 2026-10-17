import { cn } from "@/lib/utils";

export default function PageHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn("app-header flex items-end justify-between gap-4 px-5 pt-7 pb-5 rounded-b-3xl", className)}>
      <div className="min-w-0">
        <h1 className="text-[1.7rem] leading-[1.05] font-heading font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-white/90 mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 [&_button]:rounded-full">{action}</div>}
    </div>
  );
}