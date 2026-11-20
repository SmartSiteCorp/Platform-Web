import type { Metadata } from "next";

import { RegisterPage } from "@/components/auth/register-page";

export const metadata: Metadata = {
  description: "Création d'une organisation SmartSite.",
  title: "Inscription - SmartSite",
};

export default function RegisterRoute() {
  return <RegisterPage />;
}
