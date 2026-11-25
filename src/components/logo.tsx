import Image from "next/image";
import Link from "next/link";
import { APP } from "@/config/brand";

export function Logo({
  lockup = false,
  className = "",
  href,
}: {
  lockup?: boolean;
  className?: string;
  href?: string;
}) {
  const image = (
    <Image
      src={lockup ? "/brand/rvt-logo.webp" : "/brand/rvt-mark.webp"}
      alt={APP.org}
      width={lockup ? 960 : 256}
      height={lockup ? 812 : 256}
      sizes={lockup ? "(max-width: 768px) 240px, 360px" : "40px"}
      className={className}
      priority={lockup}
      unoptimized
    />
  );
  if (!href) return image;
  return (
    <Link href={href} className="inline-flex min-h-11 min-w-11 items-center">
      {image}
    </Link>
  );
}
