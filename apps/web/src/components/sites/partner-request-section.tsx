"use client";

import { Handshake } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { PartnerRequestForm, type PartnerRequestSubmitter } from "./partner-request-form";

interface PartnerRequestSectionProps {
  readonly submitPartnerRequest: PartnerRequestSubmitter;
}

export function PartnerRequestSection({ submitPartnerRequest }: PartnerRequestSectionProps) {
  return (
    <Card>
      <CardHeader>
        <Badge tone="muted">Partenaires</Badge>
        <CardTitle className="mt-3 flex items-center gap-2">
          <Handshake aria-hidden="true" className="h-5 w-5 text-primary" />
          Demander un partenaire
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <PartnerRequestForm submitPartnerRequest={submitPartnerRequest} />
      </CardContent>
    </Card>
  );
}
