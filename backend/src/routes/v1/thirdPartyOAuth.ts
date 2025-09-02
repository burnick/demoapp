import { z } from 'zod';
import { router as trpcRouter, baseProcedure } from '../../trpc/router';
import { createOpenApiMeta } from '../../utils/openapi';
import { ApiResponseSchema } from '../../schemas/common';
import { oauthService } from '../../services/oauthService';
import { 
  ThirdPartyOAuthProviderSchema, 
  ThirdPartyOAuthCallbackSchema,
  ThirdPartyOAuthAuthenticationResultSchema 
} from '../../schemas/oauth';
import { ValidationError } from '../../utils/errors';

export const thirdPartyOAuthRouter = trpcRouter({
  // Get available OAuth providers
  getProviders: baseProcedure
    .meta(createOpenApiMeta({
      method: 'GET',
      path: '/v1/oauth/providers',
      summary: 'Get available OAuth providers',
      description: 'Get list of configured third-party OAuth providers (Google, Facebook)',
      tags: ['Third-Party OAuth'],
    }))
    .output(ApiResponseSchema(z.object({
      providers: z.array(z.object({
        name: z.string(),
        displayName: z.string(),
        iconUrl: z.string().optional(),
      }))
    })))
    .query(async () => {
      const providers = oauthService.getAvailableProviders();
      
      return {
        success: true,
        data: { providers },
        timestamp: new Date().toISOString(),
      };
    }),

  // Get authorization URL for a provider
  getAuthUrl: baseProcedure
    .meta(createOpenApiMeta({
      method: 'GET',
      path: '/v1/oauth/{provider}/auth',
      summary: 'Get OAuth authorization URL',
      description: 'Generate OAuth authorization URL for the specified provider',
      tags: ['Third-Party OAuth'],
    }))
    .input(z.object({
      provider: ThirdPartyOAuthProviderSchema,
      redirectUrl: z.string().url().optional(),
    }))
    .output(ApiResponseSchema(z.object({
      authUrl: z.string().url(),
      provider: z.string(),
    })))
    .query(async ({ input }) => {
      if (!oauthService.isProviderEnabled(input.provider)) {
        throw new ValidationError(`OAuth provider '${input.provider}' is not enabled`);
      }

      const authUrl = oauthService.getAuthorizationUrl(input.provider, input.redirectUrl);
      
      return {
        success: true,
        data: {
          authUrl,
          provider: input.provider,
        },
        timestamp: new Date().toISOString(),
      };
    }),

  // Handle OAuth callback
  handleCallback: baseProcedure
    .meta(createOpenApiMeta({
      method: 'POST',
      path: '/v1/oauth/{provider}/callback',
      summary: 'Handle OAuth callback',
      description: 'Process OAuth callback from third-party provider and authenticate user',
      tags: ['Third-Party OAuth'],
    }))
    .input(z.object({
      provider: ThirdPartyOAuthProviderSchema,
      code: z.string().min(1, 'Authorization code is required'),
      state: z.string().min(1, 'State parameter is required'),
      error: z.string().optional(),
      errorDescription: z.string().optional(),
    }))
    .output(ApiResponseSchema(ThirdPartyOAuthAuthenticationResultSchema))
    .mutation(async ({ input }) => {
      // Check for OAuth errors
      if (input.error) {
        throw new ValidationError(`OAuth error: ${input.error}${input.errorDescription ? ` - ${input.errorDescription}` : ''}`);
      }

      if (!oauthService.isProviderEnabled(input.provider)) {
        throw new ValidationError(`OAuth provider '${input.provider}' is not enabled`);
      }

      const result = await oauthService.handleCallback(
        input.provider,
        input.code,
        input.state
      );
      
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      };
    }),

  // Get OAuth service status (for debugging/monitoring)
  getStatus: baseProcedure
    .meta(createOpenApiMeta({
      method: 'GET',
      path: '/v1/oauth/status',
      summary: 'Get OAuth service status',
      description: 'Get current status of OAuth service and providers (for debugging)',
      tags: ['Third-Party OAuth'],
    }))
    .output(ApiResponseSchema(z.object({
      initialized: z.boolean(),
      enabledProviders: z.array(z.string()),
      totalProviders: z.number(),
      stateStoreSize: z.number(),
    })))
    .query(async () => {
      const status = oauthService.getServiceStatus();
      
      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      };
    }),
});

export const router = thirdPartyOAuthRouter;

export const meta = {
  version: 'v1',
  description: 'Third-party OAuth authentication endpoints for API version 1',
  deprecated: false,
};