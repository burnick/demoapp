git # Third-Party OAuth Authentication

This document describes the third-party OAuth authentication system that supports Google and Facebook login.

## Overview

The OAuth service has been extended to support third-party authentication providers:
- **Google OAuth 2.0** - Gmail login with OpenID Connect
- **Facebook OAuth 2.0** - Facebook login with profile access

## Configuration

### Environment Variables

Set the following environment variables to configure OAuth providers:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Optional: Custom URLs
BASE_URL=https://your-api-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

### Getting OAuth Credentials

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Set authorized redirect URI: `https://your-api-domain.com/api/oauth/google/callback`

#### Facebook OAuth Setup
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing one
3. Add "Facebook Login" product
4. Set valid OAuth redirect URI: `https://your-api-domain.com/api/oauth/facebook/callback`

## API Endpoints

### Get Available Providers
```
GET /api/v1/thirdPartyOAuth/getProviders
```

Response:
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "name": "google",
        "displayName": "Google",
        "iconUrl": "https://developers.google.com/identity/images/g-logo.png"
      },
      {
        "name": "facebook",
        "displayName": "Facebook",
        "iconUrl": "https://static.xx.fbcdn.net/rsrc.php/v3/yX/r/Kvo5FesWVKX.png"
      }
    ]
  }
}
```

### Get Authorization URL
```
GET /api/v1/thirdPartyOAuth/getAuthUrl
```

Parameters:
- `provider`: "google" or "facebook"
- `redirectUrl` (optional): URL to redirect to after successful authentication

Response:
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
    "provider": "google"
  }
}
```

### Handle OAuth Callback
```
POST /api/v1/thirdPartyOAuth/handleCallback
```

Parameters:
- `provider`: "google" or "facebook"
- `code`: Authorization code from OAuth provider
- `state`: State parameter for CSRF protection
- `error` (optional): Error code if authentication failed
- `errorDescription` (optional): Error description

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "avatar": "https://avatar-url.com/image.jpg",
      "emailVerified": true
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresAt": "2024-01-01T12:00:00.000Z"
    },
    "isNewUser": false
  }
}
```

## Frontend Integration

### Basic Flow

1. **Get available providers**:
```javascript
const response = await fetch('/api/v1/thirdPartyOAuth/getProviders');
const { data } = await response.json();
const providers = data.providers;
```

2. **Initiate OAuth flow**:
```javascript
const response = await fetch('/api/v1/thirdPartyOAuth/getAuthUrl', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    redirectUrl: 'https://your-app.com/auth/callback'
  })
});
const { data } = await response.json();
window.location.href = data.authUrl;
```

3. **Handle callback** (on your callback page):
```javascript
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');
const provider = 'google'; // or 'facebook'

const response = await fetch('/api/v1/thirdPartyOAuth/handleCallback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider, code, state })
});

const { data } = await response.json();
// Store tokens and redirect user
localStorage.setItem('accessToken', data.tokens.accessToken);
localStorage.setItem('refreshToken', data.tokens.refreshToken);
```

## Security Features

- **CSRF Protection**: State parameter prevents cross-site request forgery
- **Secure State Storage**: In-memory state store with automatic cleanup
- **Token Expiration**: States expire after 15 minutes
- **One-time Use**: State parameters can only be used once

## User Data Handling

### Google User Data
- Email (verified status included)
- Full name, first name, last name
- Profile picture
- Google user ID

### Facebook User Data
- Email
- Full name, first name, last name
- Profile picture
- Facebook user ID

### User Creation
- New users are automatically created when they authenticate for the first time
- OAuth users don't have passwords in the system
- Email verification status is preserved from the OAuth provider

## Error Handling

Common error scenarios:
- Invalid or expired state parameter
- OAuth provider errors (user denied access, invalid credentials)
- Missing or invalid configuration
- Network errors during token exchange

All errors are logged and return appropriate HTTP status codes with descriptive error messages.

## Monitoring

Use the status endpoint to monitor OAuth service health:
```
GET /api/v1/thirdPartyOAuth/getStatus
```

This returns information about:
- Service initialization status
- Enabled providers
- State store size (for debugging