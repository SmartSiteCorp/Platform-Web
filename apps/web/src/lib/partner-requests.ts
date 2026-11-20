import { createArchitectRequest } from "@/lib/architect-requests";
import { createDroneRequest } from "@/lib/drone-requests";

export type PartnerType = "architecte" | "droniste";

export interface PartnerRequestPayload {
  readonly missionDescription: string | null;
  readonly requestedDate: string | null;
}

type PartnerRequestMutationFailure = {
  readonly message: string;
  readonly ok: false;
  readonly sessionExpired?: true;
};
type PartnerRequestMutationSuccess = {
  readonly ok: true;
  readonly status: string;
};

export type CreatePartnerRequestResult =
  | PartnerRequestMutationSuccess
  | PartnerRequestMutationFailure;

export async function createPartnerRequest(
  accessToken: string,
  siteId: string,
  partnerType: PartnerType,
  payload: PartnerRequestPayload,
): Promise<CreatePartnerRequestResult> {
  if (partnerType === "architecte") {
    const result = await createArchitectRequest(accessToken, siteId, payload);

    return result.ok
      ? { ok: true, status: result.architectRequest.status }
      : buildFailureResult(result.message, result.sessionExpired);
  }

  const result = await createDroneRequest(accessToken, siteId, payload);

  return result.ok
    ? { ok: true, status: result.droneRequest.status }
    : buildFailureResult(result.message, result.sessionExpired);
}

function buildFailureResult(
  message: string,
  sessionExpired: true | undefined,
): PartnerRequestMutationFailure {
  return sessionExpired ? { message, ok: false, sessionExpired: true } : { message, ok: false };
}
