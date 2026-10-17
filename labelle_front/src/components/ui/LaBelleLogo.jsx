import { cn } from "@/lib/utils";

export default function LaBelleLogo({
  size = "md",
  white = false,
  imageOnly = false,
}) {
  return (
    <span
      className={cn(
        "brand-logo",
        `brand-logo-${size}`,
        white && "brand-logo-white",
      )}
      role="img"
      aria-label="La Belle Studio"
    >
      <span className="brand-emblem" aria-hidden="true">
        <img src="/logo.png" alt="" />
      </span>
      {!imageOnly && (
        <span className="brand-wordmark" aria-hidden="true">
          <span>LA BELLE</span>
          <small>Studio</small>
        </span>
      )}
    </span>
  );
}
