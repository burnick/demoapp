import { logger } from '../utils/logger';
import { ConfigurationError, ValidationError, AuthenticationError, NotFoundError } from '../utils/errors';
import { AuthService, type AuthTokens } from './authService';
import { UserService } from './userService';
import { 
  OAuthProviderConfig, 
  SupportedProvider, 
  OAuthState,
  NormalizedUserInfo,
  AuthenticationResult,
  OAuthTokenResponse,
  GoogleUserInfo,
  FacebookUserInfo,
  PROVIDER_INFO
} from '../types/oauth';
import { 
  parseOAuthConfig, 
  buildOAuthProviders, 
  validateOAuthConfig,
  getFrontendUrl,
  ParsedOAuthConfig
} from '../utils/oauthConfig';
import { oauthStateStore } from '../utils/oauthStateStore';

/**
 * Extended OAuth Service for handling both OAuth 2.0 server and third-party provider authentication
 */
export class OAuthService {
  private providers: Map<SupportedProvider, OAuthProviderConfig>;
  private config: ParsedOAuthConfig;
  private initialized = false;

  constructor() {
    this.providers = new Map();
    this.config = {};
    this.initialize();
  }

  /**
   * Initialize OAuth service with provider configurations
   */
  private initialize(): void {
    try {
      // Parse configuration from environment variables
      this.config = parseOAuthConfig();
      
      // Validate configuration
      validateOAuthConfig(this.config);
      
      // Build provider configurations
      this.providers = buildOAuthProviders(this.config);
      
      this.initialized = true;
      
      logger.info('OAuth service initialized successfully', {
        enabledProviders: Array.from(this.providers.keys()),
        providerCount: this.providers.size
      });
    } catch (error) {
      logger.error('Failed to initialize OAuth service', { error });
      
      // Don't throw error - allow service to start without OAuth
      // Individual methods will handle missing configuration
      this.initialized = false;
    }
  }

  /**
   * Get list of available OAuth providers
   */
  getAvailableProviders(): Array<{ name: string; displayName: string; iconUrl?: string }> {
    if (!this.initialized) {
      logger.warn('OAuth service not initialized - returning empty provider list');
      return [];
    }

    const availableProviders = Array.from(this.providers.keys())
      .filter(providerName => this.providers.get(providerName)?.enabled)
      .map(providerName => ({
        name: providerName,
        displayName: PROVIDER_INFO[providerName].displayName,
        iconUrl: PROVIDER_INFO[providerName].iconUrl
      }));

    logger.debug('Retrieved available OAuth providers', {
      count: availableProviders.length,
      providers: availableProviders.map(p => p.name)
    });

    return availableProviders;
  }

  /**
   * Generate OAuth authorization URL for a provider
   */
  getAuthorizationUrl(providerName: string, redirectUrl?: string): string {
    if (!this.initialized) {
      throw new ConfigurationError('OAuth service not initialized');
    }

    const provider = this.providers.get(providerName as SupportedProvider);
    if (!provider) {
      throw new ValidationError(`OAuth provider '${providerName}' not found or not configured`);
    }

    if (!provider.enabled) {
      throw new ValidationError(`OAuth provider '${providerName}' is disabled`);
    }

    // Generate state parameter for CSRF protection
    const state = oauthStateStore.generateState(providerName, redirectUrl);

    // Build authorization URL
    const authUrl = new URL(provider.authUrl);
    authUrl.searchParams.set('client_id', provider.clientId);
    authUrl.searchParams.set('redirect_uri', provider.redirectUri);
    authUrl.searchParams.set('scope', provider.scope.join(' '));
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    // Add provider-specific parameters
    if (providerName === 'google') {
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
    }

    const finalUrl = authUrl.toString();

    logger.info('Generated OAuth authorization URL', {
      provider: providerName,
      state,
      hasRedirectUrl: !!redirectUrl
    });

    return finalUrl;
  }

  /**
   * Handle OAuth callback and authenticate user
   */
  async handleCallback(
    providerName: string, 
    code: string, 
    state: string
  ): Promise<AuthenticationResult> {
    if (!this.initialized) {
      throw new ConfigurationError('OAuth service not initialized');
    }

    const provider = this.providers.get(providerName as SupportedProvider);
    if (!provider) {
      throw new ValidationError(`OAuth provider '${providerName}' not found or not configured`);
    }

    // Validate state parameter
    const validatedState = this.validateOAuthState(state, providerName);

    try {
      // Exchange authorization code for access token
      const tokenResponse = await this.exchangeCodeForToken(provider, code);
      
      // Get user information from provider
      const userInfo = await this.getUserInfo(provider, tokenResponse.access_token, providerName as SupportedProvider);
      
      // Find or create user in our system
      const authResult = await this.findOrCreateUser(userInfo);
      
      logger.info('OAuth authentication successful', {
        provider: providerName,
        userId: authResult.user.id,
        isNewUser: authResult.isNewUser
      });

      return authResult;
    } catch (error) {
      logger.error('OAuth callback failed', {
        provider: providerName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AuthenticationError('OAuth authentication failed');
    }
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(
    provider: OAuthProviderConfig, 
    code: string
  ): Promise<OAuthTokenResponse> {
    const tokenData = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      redirect_uri: provider.redirectUri,
      code
    });

    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenData
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Token exchange failed', {
        status: response.status,
        error: errorText
      });
      throw new AuthenticationError('Failed to exchange authorization code for token');
    }

    const tokenResponse: OAuthTokenResponse = await response.json();
    return tokenResponse;
  }

  /**
   * Get user information from OAuth provider
   */
  private async getUserInfo(
    provider: OAuthProviderConfig, 
    accessToken: string, 
    providerName: SupportedProvider
  ): Promise<NormalizedUserInfo> {
    let userInfoUrl = provider.userInfoUrl;
    
    // Add fields parameter for Facebook
    if (providerName === 'facebook') {
      userInfoUrl += '?fields=id,email,name,first_name,last_name,picture';
    }

    const response = await fetch(userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to get user info', {
        provider: providerName,
        status: response.status,
        error: errorText
      });
      throw new AuthenticationError('Failed to get user information from provider');
    }

    const rawUserInfo = await response.json();
    return this.normalizeUserInfo(rawUserInfo, providerName);
  }

  /**
   * Normalize user information from different providers
   */
  private normalizeUserInfo(rawUserInfo: any, providerName: SupportedProvider): NormalizedUserInfo {
    switch (providerName) {
      case 'google': {
        const googleUser = rawUserInfo as GoogleUserInfo;
        return {
          id: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          firstName: googleUser.given_name,
          lastName: googleUser.family_name,
          avatar: googleUser.picture,
          provider: 'google',
          providerUserId: googleUser.id,
          emailVerified: googleUser.verified_email
        };
      }
      
      case 'facebook': {
        const facebookUser = rawUserInfo as FacebookUserInfo;
        return {
          id: facebookUser.id,
          email: facebookUser.email,
          name: facebookUser.name,
          firstName: facebookUser.first_name,
          lastName: facebookUser.last_name,
          avatar: facebookUser.picture?.data?.url,
          provider: 'facebook',
          providerUserId: facebookUser.id,
          emailVerified: false // Facebook doesn't provide email verification status
        };
      }
      
      default:
        throw new ValidationError(`Unsupported provider: ${providerName}`);
    }
  }

  /**
   * Find existing user or create new user from OAuth info
   */
  private async findOrCreateUser(userInfo: NormalizedUserInfo): Promise<AuthenticationResult> {
    try {
      // Try to find existing user by email
      let user;
      let isNewUser = false;

      try {
        user = await UserService.getUserByEmail(userInfo.email);
        if (user) {
          logger.debug('Found existing user by email', { userId: user.id, email: userInfo.email });
        }
      } catch (error) {
        if (error instanceof NotFoundError) {
          // Create new user
          const newUserData = {
            email: userInfo.email,
            name: userInfo.name,
            password: '', // OAuth users don't have passwords
            confirmPassword: '' // Required by schema but not used for OAuth
          };

          // Register the user (this will create the user record)
          const registrationResult = await AuthService.register(newUserData);
          user = registrationResult.user;
          isNewUser = true;

          logger.info('Created new user from OAuth', {
            userId: user.id,
            email: userInfo.email,
            provider: userInfo.provider
          });
        } else {
          throw error;
        }
      }

      if (!user) {
        throw new AuthenticationError('Failed to create or find user');
      }

      // Generate authentication tokens
      const tokens = AuthService.generateTokens({
        id: user.id,
        email: user.email,
        name: user.name
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: userInfo.avatar,
          emailVerified: userInfo.emailVerified
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toISOString()
        },
        isNewUser
      };
    } catch (error) {
      logger.error('Failed to find or create user', {
        email: userInfo.email,
        provider: userInfo.provider,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AuthenticationError('Failed to authenticate user');
    }
  }

  /**
   * Validate OAuth state parameter
   */
  validateOAuthState(stateKey: string, expectedProvider: string): OAuthState {
    const state = oauthStateStore.validateState(stateKey);
    
    if (!state) {
      throw new ValidationError('Invalid or expired OAuth state parameter');
    }

    if (state.provider !== expectedProvider) {
      throw new ValidationError(`OAuth state provider mismatch. Expected: ${expectedProvider}, got: ${state.provider}`);
    }

    logger.debug('OAuth state validated successfully', {
      provider: state.provider,
      hasRedirectUrl: !!state.redirectUrl
    });

    return state;
  }

  /**
   * Get provider configuration
   */
  getProvider(providerName: string): OAuthProviderConfig {
    if (!this.initialized) {
      throw new ConfigurationError('OAuth service not initialized');
    }

    const provider = this.providers.get(providerName as SupportedProvider);
    if (!provider) {
      throw new ValidationError(`OAuth provider '${providerName}' not found or not configured`);
    }

    return provider;
  }

  /**
   * Check if a provider is enabled
   */
  isProviderEnabled(providerName: string): boolean {
    if (!this.initialized) {
      return false;
    }

    const provider = this.providers.get(providerName as SupportedProvider);
    return provider?.enabled ?? false;
  }

  /**
   * Get OAuth service status
   */
  getServiceStatus(): {
    initialized: boolean;
    enabledProviders: string[];
    totalProviders: number;
    stateStoreSize: number;
  } {
    return {
      initialized: this.initialized,
      enabledProviders: Array.from(this.providers.keys()),
      totalProviders: this.providers.size,
      stateStoreSize: oauthStateStore.getStateCount()
    };
  }

  /**
   * Reinitialize OAuth service (for configuration updates)
   */
  reinitialize(): void {
    logger.info('Reinitializing OAuth service');
    
    // Clear existing configuration
    this.providers.clear();
    this.config = {};
    this.initialized = false;
    
    // Reinitialize
    this.initialize();
  }

  /**
   * Get default redirect URL for successful authentication
   */
  getDefaultRedirectUrl(): string {
    return getFrontendUrl();
  }

  /**
   * Shutdown OAuth service
   */
  shutdown(): void {
    logger.info('Shutting down OAuth service');
    
    // Clear providers
    this.providers.clear();
    this.config = {};
    this.initialized = false;
    
    // State store will handle its own cleanup
    logger.info('OAuth service shutdown complete');
  }

  // OAuth 2.0 Server methods (placeholder implementations)
  // These would be implemented for full OAuth 2.0 server functionality

  async createClient(clientData: any): Promise<any> {
    throw new Error('OAuth 2.0 server functionality not implemented');
  }

  async getClient(clientId: string): Promise<any> {
    throw new Error('OAuth 2.0 server functionality not implemented');
  }

  async listClients(): Promise<any[]> {
    throw new Error('OAuth 2.0 server functionality not implemented');
  }

  async updateClient(clientId: string, updateData: any): Promise<any> {
    throw new Error('OAuth 2.0 server functionality not implemented');
  }

  async deleteClient(clientId: string): Promise<void> {
    throw new Error('OAuth 2.0 server functionality not implemented');
  }

  async generateAuthorizationCode(clientId: string, userId: string, scope?: string): Promise<string> {
    throw new Error('OAuth 2.0 server functionality not implemented');
  }

  async exchangeCodeForTokens(code: string, clientId: string, redirectUri: string): Promise<any> {
    throw new Error('OAuth 2.0 server functionality not implemented');
  }

  async refreshOAuthToken(refreshToken: string, clientId: string): Promise<any> {
    throw new Error('OAuth 2.0 server functionality not implemented');
  }

  async clientCredentialsGrant(clientId: string, clientSecret: string, scope?: string): Promise<any> {
    throw new Error('OAuth 2.0 server functionality not implemented');
  }

  async introspectToken(token: string): Promise<any> {
    throw new Error('OAuth 2.0 server functionality not implemented');
  }

  async revokeToken(token: string, clientId: string): Promise<void> {
    throw new Error('OAuth 2.0 server functionality not implemented');
  }
}

// Export singleton instance
export const oauthService = new OAuthService();