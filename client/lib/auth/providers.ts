import { OAuth2Client } from 'google-auth-library';
import { AuthenticationError } from '../api-middleware';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface ProviderUser {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
}

/**
 * Verify Google OAuth ID Token
 */
export async function verifyGoogleToken(idToken: string): Promise<ProviderUser> {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      throw new AuthenticationError('Invalid Google token payload');
    }

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  } catch (error) {
    console.error('[Google Auth] Token verification failed:', error);
    throw new AuthenticationError('Invalid Google authentication token');
  }
}

/**
 * Verify ABHA (Ayushman Bharat Health Account) Token/OTP
 * This is a simplified integration for the hackathon
 */
export async function verifyABHAToken(abhaAddress: string, token: string): Promise<ProviderUser> {
  // In a real implementation, this would call the ABDM Gateway API
  // to verify the OTP/Token for the given ABHA address
  
  try {
    // Hackathon mockup: In production, verify against ABDM Gateway
    if (process.env.NODE_ENV === 'production' && !process.env.DEMO_AUTH_ENABLED) {
      // Stub for real ABDM Gateway call
      // const response = await fetch('https://dev.abdm.gov.in/gateway/v0.5/users/auth/on-confirm', ...)
      if (!token || token.length < 6) {
        throw new AuthenticationError('Invalid ABHA token');
      }
    }
    
    return {
      id: abhaAddress,
      name: abhaAddress.split('@')[0], // Extract name part
    };
  } catch (error) {
    console.error('[ABHA Auth] Verification failed:', error);
    throw new AuthenticationError('Invalid ABHA authentication');
  }
}
