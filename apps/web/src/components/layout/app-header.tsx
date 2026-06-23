import { Bell, LayoutDashboard, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { SmartSiteLogo } from "@/components/brand/smartsite-logo";
import { cn } from "@/lib/utils";
import { LogoutButton } from "./logout-button";

type AppHeaderItem = "dashboard" | "organization-settings";

interface AppHeaderProps {
  readonly activeItem: AppHeaderItem;
  readonly showSettingsLink?: boolean;
}

interface HeaderNavItem {
  readonly icon: LucideIcon;
  readonly id: AppHeaderItem;
  readonly label: string;
}

const headerNavItems: readonly HeaderNavItem[] = [
  { icon: LayoutDashboard, id: "dashboard", label: "Dashboard" },
  {
    icon: Settings,
    id: "organization-settings",
    label: "Paramètres",
  },
];

export function AppHeader({ activeItem, showSettingsLink = false }: AppHeaderProps) {
  return (
    <header className="border-b border-border bg-accent text-accent-foreground">
      <div className="container flex min-h-20 flex-col justify-center gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <HeaderBrand />
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <HeaderNav activeItem={activeItem} showSettingsLink={showSettingsLink} />
          <button
            aria-label="Notifications"
            className="rounded-md border border-white/20 p-3 text-accent-foreground transition-colors hover:bg-white/10"
            type="button"
          >
            <Bell aria-hidden="true" className="h-5 w-5" />
          </button>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

function HeaderBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex items-center justify-center rounded-lg bg-white/90 p-1">
        <SmartSiteLogo className="h-12 w-12" priority />
      </div>
      <div>
        <p className="text-xl font-bold tracking-normal">SmartSite</p>
        <p className="text-sm text-accent-foreground/80">Supervision intelligente de chantier</p>
      </div>
    </div>
  );
}

function HeaderNav({
  activeItem,
  showSettingsLink,
}: {
  readonly activeItem: AppHeaderItem;
  readonly showSettingsLink: boolean;
}) {
  const visibleItems = headerNavItems.filter(
    (item) => item.id !== "organization-settings" || showSettingsLink,
  );

  return (
    <nav aria-label="Navigation principale" className="flex items-center gap-2">
      {visibleItems.map((item) => (
        <HeaderNavLink activeItem={activeItem} item={item} key={item.id} />
      ))}
    </nav>
  );
}

function HeaderNavLink({
  activeItem,
  item,
}: {
  readonly activeItem: AppHeaderItem;
  readonly item: HeaderNavItem;
}) {
  const Icon = item.icon;
  const isActive = activeItem === item.id;
  const linkContent = (
    <>
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span>{item.label}</span>
    </>
  );
  const linkClasses = cn(
    "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors",
    isActive ? "bg-white/20 text-white" : "text-accent-foreground/80 hover:bg-white/10",
  );

  if (item.id === "dashboard") {
    return (
      <Link className={linkClasses} href="/dashboard">
        {linkContent}
      </Link>
    );
  }

  return (
    <Link className={linkClasses} href="/settings/organization">
      {linkContent}
    </Link>
  );
}
