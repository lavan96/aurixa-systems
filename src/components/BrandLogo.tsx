import { Link } from "react-router-dom";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  compact?: boolean;
  /**
   * The header mark is the first thing painted and must not arrive late; the
   * footer mark is well below the fold on every page. Callers say which.
   */
  priority?: boolean;
}

export function BrandLogo({ className, imageClassName, compact = false, priority = false }: BrandLogoProps) {
  return (
    <Link
      to="/"
      aria-label="Aurixa Systems home"
      className={[
        "block",
        // The compact height tracks the header, which shrinks on short
        // landscape viewports. See --brand-logo-height in index.css.
        compact
          ? "h-[var(--brand-logo-height,5.5rem)] w-[340px] sm:w-[430px] lg:w-[480px]"
          : "h-28 w-[430px] sm:w-[560px]",
        className
      ].filter(Boolean).join(" ")}
    >
      <img
        src="/brand/aurixa-systems-logo-source.jpg"
        alt="Aurixa Systems"
        width={compact ? 480 : 560}
        height={compact ? 160 : 187}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "low"}
        className={["h-full w-full object-contain", imageClassName].filter(Boolean).join(" ")}
      />
    </Link>
  );
}
