import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  compact?: boolean;
}

export function BrandLogo({ className, imageClassName, compact = false }: BrandLogoProps) {
  return (
    <Link
      to="/"
      aria-label="Aurixa Systems home"
      className={cn(
        "brand-logo-shell group relative flex items-center overflow-visible rounded-sm",
        compact ? "h-16 w-[260px] sm:w-[330px] lg:w-[360px]" : "h-20 w-[320px] sm:w-[420px]",
        className
      )}
    >
      <img
        src="/brand/aurixa-systems-logo-source.jpg"
        alt="Aurixa Systems"
        width={compact ? 360 : 420}
        height={compact ? 120 : 140}
        className={cn("brand-logo-image relative z-10 h-full w-full object-contain", imageClassName)}
      />
    </Link>
  );
}
