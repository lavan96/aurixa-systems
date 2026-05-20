import { Link } from "react-router-dom";

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
      className={[
        "block",
        compact ? "h-[5.5rem] w-[340px] sm:w-[430px] lg:w-[480px]" : "h-28 w-[430px] sm:w-[560px]",
        className
      ].filter(Boolean).join(" ")}
    >
      <img
        src="/brand/aurixa-systems-logo-source.jpg"
        alt="Aurixa Systems"
        width={compact ? 480 : 560}
        height={compact ? 160 : 187}
        className={["h-full w-full object-contain", imageClassName].filter(Boolean).join(" ")}
      />
    </Link>
  );
}
