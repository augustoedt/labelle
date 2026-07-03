import { cn } from "@/lib/utils";

export default function PageHeader({ title, subtitle, action, className }) {
  return (
    <div className={cn("flex items-center justify-between px-5 pt-6 pb-4", className)}>
      <div>
        <h1 className="text-2xl font-heading font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}