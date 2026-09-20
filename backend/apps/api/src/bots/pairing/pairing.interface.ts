export interface PairingRequestInput {
  phoneNumber?: string;
  serviceUrl: string;
}

export interface PairingRequestResult {
  pairingCode?: string;
  qrCodeData?: string;
  expiresInSeconds: number;
}

export interface PairingAdapter {
  requestPairing(input: PairingRequestInput): Promise<PairingRequestResult>;
}
