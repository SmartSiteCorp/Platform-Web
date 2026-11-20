import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PartnerRequestBlock } from "./site-page-role-blocks";
import { resolveSitePageServices, type SitePageServices } from "./site-page-services";

describe("PartnerRequestBlock", () => {
  it("n'affiche rien si l'utilisateur ne peut pas demander de partenaire", () => {
    render(<PartnerRequestBlock canRequestPartner={false} services={createServicesStub()} />);

    expect(screen.queryByRole("button", { name: /Demander/ })).not.toBeInTheDocument();
  });

  it("affiche le formulaire de demande de partenaire si autorise", () => {
    render(<PartnerRequestBlock canRequestPartner={true} services={createServicesStub()} />);

    expect(screen.getByRole("button", { name: "Demander un architecte" })).toBeInTheDocument();
  });
});

function createServicesStub(): SitePageServices {
  return resolveSitePageServices({
    session: null,
    siteId: "site-1",
    submitPartnerRequest: () => Promise.resolve({ ok: true, status: "pending" }),
  });
}
