import type { Metadata } from "next";

import { SitePage } from "@/components/sites/site-page";

export const metadata: Metadata = {
  description: "Fiche chantier SmartSite — planning, documents et suivi.",
  title: "Fiche chantier - SmartSite",
};

interface SiteRouteProps {
  readonly params: Promise<{ readonly siteId: string }>;
}

export default async function SiteRoute({ params }: SiteRouteProps) {
  const { siteId } = await params;

  return <SitePage siteId={siteId} />;
}
