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
        compact ? "h-[5.5rem] w-[340px] sm:w-[430px] lg:w-[480px]" : "h-28 w-[430px] sm:w-[560px]",
        className
      )}
    >
      <img
        src="/brand/aurixa-systems-logo-source.jpg"
        alt="Aurixa Systems"
        width={compact ? 480 : 560}
        height={compact ? 160 : 187}
        className={cn("brand-logo-image relative z-10 h-full w-full object-contain", imageClassName)}
      />
    </Link>
  );
}
