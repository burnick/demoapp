import { z } from 'zod';

// OAuth Client schemas
export const CreateOAuthClientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  redirectUris: z.array(z.string().url('Invalid redirect URI')).min(1, 'At least one redirect URI is required'),
  scopes: z.array(z.string()).default(['read']),
  grantTypes: z.array(z.enum(['authorization_code', 'refresh_token', 'client_credentials'])).default(['authorization_code']),
  description: z.string().optional(),
});

export const UpdateOAuthClientSchema = CreateOAuthClientSchema.partial();

export const OAuthClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  redirectUris: z.array(z.string()),
  scopes: z.array(z.string()),
  grantTypes: z.array(z.string()),
  isActive: z.boolean(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const OAuthClientPublicSchema = OAuthClientSchema.omit({ clientSecret: true });

// OAuth Authorization schemas
export const AuthorizeSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  redirectUri: z.string().url('Invalid redirect URI'),
  scope: z.string().optional(),
  state: z.string().optional(),
  responseType: z.literal('code').default('code'),
});

export const UserConsentSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  scope: z.string().optional(),
  state: z.string().optional(),
  approved: z.boolean(),
});

export const ConsentResponseSchema = z.object({
  code: z.string().optional(),
  redirectUri: z.string().optional(),
  error: z.string().optional(),
  errorDescription: z.string().optional(),
});

// OAuth Token schemas
export const TokenExchangeSchema = z.object({
  grantType: z.enum(['authorization_code', 'refresh_token', 'client_credentials']),
  code: z.string().optional(),
  redirectUri: z.string().optional(),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().optional(),
  refreshToken: z.string().optional(),
  scope: z.string().optional(),
});

export const OAuthTokenSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number(),
  refreshToken: z.string().optional(),
  scope: z.string().optional(),
});

// Token introspection schemas
export const TokenIntrospectionSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  tokenTypeHint: z.enum(['access_token', 'refresh_token']).optional(),
});

export const TokenIntrospectionResponseSchema = z.object({
  active: z.boolean(),
  scope: z.string().optional(),
  clientId: z.string().optional(),
  username: z.string().optional(),
  tokenType: z.string().optional(),
  exp: z.number().optional(),
  iat: z.number().optional(),
  sub: z.string().optional(),
  aud: z.string().optional(),
  iss: z.string().optional(),
});

// Token revocation schema
export const TokenRevocationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  tokenTypeHint: z.enum(['access_token', 'refresh_token']).optional(),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().optional(),
});

// Third-party OAuth provider schemas
export const ThirdPartyOAuthProviderSchema = z.enum(['google', 'facebook']);

export const ThirdPartyOAuthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required'),
  error: z.string().optional(),
  errorDescription: z.string().optional(),
});

export const ThirdPartyOAuthUserInfoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  picture: z.string().url().optional(),
  provider: ThirdPartyOAuthProviderSchema,
  providerUserId: z.string(),
  emailVerified: z.boolean().default(false),
});

export const ThirdPartyOAuthAuthenticationResultSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    avatar: z.string().optional(),
    emailVerified: z.boolean(),
  }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.string(),
  }),
  isNewUser: z.boolean(),
});

// OAuth error constants
export const OAUTH_ERRORS = {
  INVALID_REQUEST: 'invalid_request',
  INVALID_CLIENT: 'invalid_client',
  INVALID_GRANT: 'invalid_grant',
  UNAUTHORIZED_CLIENT: 'unauthorized_client',
  UNSUPPORTED_GRANT_TYPE: 'unsupported_grant_type',
  INVALID_SCOPE: 'invalid_scope',
  ACCESS_DENIED: 'access_denied',
  UNSUPPORTED_RESPONSE_TYPE: 'unsupported_response_type',
  SERVER_ERROR: 'server_error',
  TEMPORARILY_UNAVAILABLE: 'temporarily_unavailable',
} as const;

// Type exports
export type CreateOAuthClient = z.infer<typeof CreateOAuthClientSchema>;
export type UpdateOAuthClient = z.infer<typeof UpdateOAuthClientSchema>;
export type OAuthClient = z.infer<typeof OAuthClientSchema>;
export type OAuthClientPublic = z.infer<typeof OAuthClientPublicSchema>;
export type Authorize = z.infer<typeof AuthorizeSchema>;
export type UserConsent = z.infer<typeof UserConsentSchema>;
export type TokenExchange = z.infer<typeof TokenExchangeSchema>;
export type OAuthToken = z.infer<typeof OAuthTokenSchema>;
export type TokenIntrospection = z.infer<typeof TokenIntrospectionSchema>;
export type TokenIntrospectionResponse = z.infer<typeof TokenIntrospectionResponseSchema>;
export type TokenRevocation = z.infer<typeof TokenRevocationSchema>;
export type ThirdPartyOAuthProvider = z.infer<typeof ThirdPartyOAuthProviderSchema>;
export type ThirdPartyOAuthCallback = z.infer<typeof ThirdPartyOAuthCallbackSchema>;
export type ThirdPartyOAuthUserInfo = z.infer<typeof ThirdPartyOAuthUserInfoSchema>;
export type ThirdPartyOAuthAuthenticationResult = z.infer<typeof ThirdPartyOAuthAuthenticationResultSchema>;