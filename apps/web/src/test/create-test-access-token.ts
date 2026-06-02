interface TestAccessTokenHeader {
  readonly alg: "HS256";
  readonly typ: "JWT";
}

interface TestAccessTokenPayload {
  readonly exp: number;
}

export function createTestAccessToken(expirationTimeSeconds: number): string {
  return [
    encodeJwtPart({ alg: "HS256", typ: "JWT" }),
    encodeJwtPart({ exp: expirationTimeSeconds }),
    "signature",
  ].join(".");
}

function encodeJwtPart(payload: TestAccessTokenHeader | TestAccessTokenPayload): string {
  return window
    .btoa(JSON.stringify(payload))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
