import Image from "next/image";
import { APP } from "@/config/brand";

export function Logo({ lockup = false, className = "" }: { lockup?: boolean; className?: string }) {
  return (
    <Image
      src={lockup ? "/brand/rvt-logo.png" : "/brand/rvt-mark.png"}
      alt={APP.org}
      width={lockup ? 4096 : 2048}
      height={lockup ? 3463 : 2048}
      className={className}
      unoptimized
    />
  );
}
