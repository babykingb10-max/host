import { api } from './http-client';

export type PairingMode = 'PAIRING_CODE_SESSION_API' | 'PAIRING_CODE_SESSION_WHATSAPP' | 'QR_CODE' | 'EXTERNAL_PAIRING' | 'MANUAL_SESSION' | 'NO_PAIRING';
export type PairingStatus = 'PENDING' | 'AWAITING_DEVICE' | 'CODE_ISSUED' | 'QR_ISSUED' | 'CONNECTED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

export interface PairingSessionView {
  id: string;
  mode: PairingMode;
  status: PairingStatus;
  phoneNumber: string | null;
  pairingCode: string | null;
  qrCodeData: string | null;
  errorMessage: string | null;
  expiresAt: string;
}

export const pairingApi = {
  request: (projectId: string, phoneNumber?: string) =>
    api.post<PairingSessionView>(`/v1/projects/${projectId}/pairing/request`, { phoneNumber }),
  status: (projectId: string) => api.get<PairingSessionView | null>(`/v1/projects/${projectId}/pairing/status`),
  submitManualSession: (projectId: string, sessionId: string) =>
    api.post<{ message: string }>(`/v1/projects/${projectId}/pairing/manual-session`, { sessionId }),
  cancel: (projectId: string) => api.delete<null>(`/v1/projects/${projectId}/pairing`),
};
