import { Injectable } from '@nestjs/common';
import { providerFetch } from '../../providers/common/provider-http';
import { AppError } from '../../common/errors/app-error';
import { ErrorCode } from '../../common/errors/error-codes';
import type { PairingAdapter, PairingRequestInput, PairingRequestResult } from './pairing.interface';

/**
 * Standard contract every external pairing service must implement:
 *   POST {serviceUrl}  { phoneNumber? }
 *   -> { pairingCode?: string, qrCodeData?: string, expiresInSeconds: number }
 * Bots configure their own serviceUrl (spec §15: "Support external
 * pairing APIs where configured") — this adapter never hardcodes which
 * service is used.
 */
@Injectable()
export class HttpPairingAdapter implements PairingAdapter {
  async requestPairing(input: PairingRequestInput): Promise<PairingRequestResult> {
    if (!input.serviceUrl) throw new AppError(ErrorCode.PROVIDER_CONFIGURATION_ERROR, 'This bot has no pairing service configured.');

    const res = await providerFetch(input.serviceUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: input.phoneNumber }),
      timeoutMs: 20_000,
    });

    const body = (await res.json()) as { pairingCode?: string; qrCodeData?: string; expiresInSeconds?: number };
    if (!body.pairingCode && !body.qrCodeData) {
      throw new AppError(ErrorCode.DEPLOYMENT_PROVIDER_UNAVAILABLE, 'The pairing service did not return a code or QR payload.');
    }
    return { pairingCode: body.pairingCode, qrCodeData: body.qrCodeData, expiresInSeconds: body.expiresInSeconds ?? 60 };
  }
}
