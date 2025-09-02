/**
 * Third-party OAuth provider configuration and types
 */

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  enabled: boolean;
}

export interface OAuthProviderInfo {
  name: string;
  displayName: string;
  iconUrl?: string;
}

export interface OAuthState {
  provider: string;
  redirectUrl?: string;
  timestamp: number;
  nonce: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string; // For OpenID Connect providers like Google
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export interface FacebookUserInfo {
  id: string;
  email: string;
  name: string;
  first_name: string;
  last_name: string;
  picture: {
    data: {
      height: number;
      is_silhouette: boolean;
      url: string;
      width: number;
    };
  };
}

export interface NormalizedUserInfo {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  provider: string;
  providerUserId: string;
  emailVerified: boolean;
}

export interface AuthenticationResult {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    emailVerified: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
  isNewUser: boolean;
}

export type SupportedProvider = 'google' | 'facebook';

export const OAUTH_PROVIDERS: Record<SupportedProvider, Omit<OAuthProviderConfig, 'clientId' | 'clientSecret' | 'enabled'>> = {
  google: {
    redirectUri: '/api/oauth/google/callback',
    scope: ['openid', 'email', 'profile'],
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo'
  },
  facebook: {
    redirectUri: '/api/oauth/facebook/callback',
    scope: ['email', 'public_profile'],
    authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
    userInfoUrl: 'https://graph.facebook.com/v18.0/me'
  }
};

export const PROVIDER_INFO: Record<SupportedProvider, OAuthProviderInfo> = {
  google: {
    name: 'google',
    displayName: 'Google',
    iconUrl: 'https://developers.google.com/identity/images/g-logo.png'
  },
  facebook: {
    name: 'facebook',
    displayName: 'Facebook',
    iconUrl: 'https://static.xx.fbcdn.net/rsrc.php/v3/yX/r/Kvo5FesWVKX.png'
  }
};