import { describe, expect, it } from "vitest";

import { HealthService } from "./health.service.js";

describe("HealthService", () => {
  it("returns an operational status", () => {
    const service = new HealthService();

    const result = service.getHealth();

    expect(result.status).toBe("ok");
    expect(result.message).toBe("SmartSite API is running.");
    expect(new Date(result.timestamp).toString()).not.toBe("Invalid Date");
  });
});
