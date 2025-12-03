import axios from 'axios';

export class GovBrService {
    private readonly apiUrl = process.env.GOVBR_API_URL || 'https://sso.staging.acesso.gov.br';

    /**
     * Perform Facial Recognition Check (Mocked/Stubbed)
     */
    async verifyFacial(userId: string, photoBase64: string): Promise<boolean> {
        // In production, this would call the Gov.br or Datavalid API
        console.log(`[KYC] Verifying facial for user ${userId}`);

        if (!photoBase64) throw new Error('Photo required');

        // Mock success for testing
        return true;
    }

    /**
     * Send OTP for 2FA
     */
    async sendOtp(userId: string, phone: string): Promise<string> {
        console.log(`[KYC] Sending OTP to ${phone}`);
        return '123456'; // Mock OTP
    }

    /**
     * Verify OTP
     */
    async verifyOtp(userId: string, otp: string): Promise<boolean> {
        return otp === '123456';
    }
}
