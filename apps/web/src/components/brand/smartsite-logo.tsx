import Image from "next/image";

import { cn } from "@/lib/utils";

interface SmartSiteLogoProps {
  readonly className?: string;
  readonly imageClassName?: string;
  readonly priority?: boolean;
}

export function SmartSiteLogo({
  className,
  imageClassName,
  priority = false,
}: SmartSiteLogoProps) {
  return (
    <span className={cn("relative inline-flex shrink-0 overflow-hidden", className)}>
      <Image
        alt=""
        aria-hidden="true"
        className={cn("translate-y-[6%] scale-[1.6] object-contain", imageClassName)}
        fill
        priority={priority}
        sizes="96px"
        src="/logo.png"
      />
    </span>
  );
}
