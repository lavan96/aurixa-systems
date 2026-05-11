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
        "brand-logo-shell group relative flex items-center overflow-hidden rounded-sm",
        compact ? "h-12 w-[180px] sm:w-[230px]" : "h-16 w-[240px] sm:w-[300px]",
        className
      )}
    >
      <span className="brand-logo-ambient" aria-hidden="true" />
      <img
        src="/brand/aurixa-systems-logo-upscaled.svg"
        alt="Aurixa Systems"
        width={compact ? 230 : 300}
        height={compact ? 77 : 100}
        className={cn("brand-logo-image relative z-10 h-full w-full object-cover", imageClassName)}
      />
    </Link>
  );
}
