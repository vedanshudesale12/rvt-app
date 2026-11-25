import Image from "next/image";
import { APP } from "@/config/brand";

export function Logo({ lockup = false, className = "" }: { lockup?: boolean; className?: string }) {
  return (
    <Image
      src={lockup ? "/brand/rvt-logo.svg" : "/brand/rvt-mark.svg"}
      alt={APP.org}
      width={lockup ? 320 : 64}
      height={lockup ? 140 : 64}
      className={className}
      unoptimized
    />
  );
}
