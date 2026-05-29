import { render, screen } from "@testing-library/react";
import { Building2 } from "lucide-react";
import { describe, expect, it } from "vitest";

import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("renders the stat label and value", () => {
    render(
      <StatCard
        stat={{
          icon: Building2,
          label: "Chantiers actifs",
          tone: "default",
          value: "4",
        }}
      />,
    );

    expect(screen.getByText("Chantiers actifs")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
