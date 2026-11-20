import type { Metadata } from "next";

import { LoginPage } from "@/components/auth/login-page";

export const metadata: Metadata = {
  description: "Connexion utilisateur SmartSite.",
  title: "Connexion - SmartSite",
};

export default function LoginRoute() {
  return <LoginPage />;
}
