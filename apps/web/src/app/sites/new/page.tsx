import type { Metadata } from "next";

import { CreateSitePage } from "@/components/sites/create-site-page";

export const metadata: Metadata = {
  description: "Créer un nouveau chantier SmartSite.",
  title: "Nouveau chantier - SmartSite",
};

export default function CreateSiteRoute() {
  return <CreateSitePage />;
}
