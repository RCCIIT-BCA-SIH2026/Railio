// Phone Verification Abstraction Layer
// Encapsulates Truecaller & SMS verification providers securely

import { supabase } from '../lib/supabase';

export interface PhoneVerificationResult {
  success: boolean;
  status: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  phoneNumber?: string;
  message: string;
}

export interface IPhoneVerificationProvider {
  verifyWithTruecaller(phoneNumber: string, truecallerPayload?: any): Promise<PhoneVerificationResult>;
  verifyWithSMS(phoneNumber: string, otpCode: string): Promise<PhoneVerificationResult>;
}

class PhoneVerificationProvider implements IPhoneVerificationProvider {
  /**
   * Truecaller Identity Verification Flow
   * Calls Supabase Edge Function 'verify-phone' server-side
   */
  async verifyWithTruecaller(phoneNumber: string, truecallerPayload?: any): Promise<PhoneVerificationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-phone', {
        body: {
          phone_number: phoneNumber,
          provider: 'TRUECALLER',
          payload: truecallerPayload || { truecallerToken: 'tc_token_demo_valid' },
        },
      });

      if (error) {
        return {
          success: false,
          status: 'FAILED',
          message: error.message || 'Truecaller verification failed',
        };
      }

      return {
        success: data.success,
        status: data.status || (data.success ? 'VERIFIED' : 'FAILED'),
        phoneNumber: data.phoneNumber || phoneNumber,
        message: data.message || 'Verification complete',
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        message: err.message || 'Truecaller integration error',
      };
    }
  }

  /**
   * Fallback SMS Verification Flow
   */
  async verifyWithSMS(phoneNumber: string, otpCode: string): Promise<PhoneVerificationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-phone', {
        body: {
          phone_number: phoneNumber,
          provider: 'SMS',
          payload: { otpCode },
        },
      });

      if (error) {
        return {
          success: false,
          status: 'FAILED',
          message: error.message || 'SMS OTP verification failed',
        };
      }

      return {
        success: data.success,
        status: data.status || (data.success ? 'VERIFIED' : 'FAILED'),
        phoneNumber: data.phoneNumber || phoneNumber,
        message: data.message || 'OTP Verification complete',
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'FAILED',
        message: err.message || 'SMS Verification error',
      };
    }
  }
}

export const phoneVerificationProvider = new PhoneVerificationProvider();
