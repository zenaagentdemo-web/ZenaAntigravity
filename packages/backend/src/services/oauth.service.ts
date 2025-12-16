import crypto from 'crypto';

/**
 * OAuth Service for Email Providers
 * Handles OAuth 2.0 flows for Gmail and Microsoft email accounts
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface OAuthProvider {
  name: string;
  authorizationUrl: string;
  tokenUrl: string;
  config: OAuthConfig;
}

/**
 * Base OAuth Service
 */
export class OAuthService {
  private providers: Map<string, OAuthProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Gmail OAuth Configuration
    this.providers.set('gmail', {
      name: 'gmail',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      config: {
        clientId: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
        scopes: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
      },
    });

    // Microsoft OAuth Configuration
    this.providers.set('microsoft', {
      name: 'microsoft',
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      config: {
        clientId: process.env.MICROSOFT_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || '',
        scopes: [
          'https://graph.microsoft.com/Mail.ReadWrite',
          'https://graph.microsoft.com/Mail.Send',
          'https://graph.microsoft.com/User.Read',
          'offline_access',
        ],
      },
    });

    // Google Calendar OAuth Configuration
    this.providers.set('google-calendar', {
      name: 'google-calendar',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      config: {
        clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '',
        redirectUri: process.env.GOOGLE_CALENDAR_REDIRECT_URI || '',
        scopes: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/calendar.events.readonly',
          'https://www.googleapis.com/auth/userinfo.email',
        ],
      },
    });

    // Microsoft Calendar OAuth Configuration
    this.providers.set('microsoft-calendar', {
      name: 'microsoft-calendar',
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      config: {
        clientId: process.env.MICROSOFT_CALENDAR_CLIENT_ID || process.env.MICROSOFT_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET || '',
        redirectUri: process.env.MICROSOFT_CALENDAR_REDIRECT_URI || '',
        scopes: [
          'https://graph.microsoft.com/Calendars.Read',
          'https://graph.microsoft.com/User.Read',
          'offline_access',
        ],
      },
    });

    // Yahoo OAuth Configuration
    // Yahoo uses specific scopes - only basic OpenID Connect scopes are supported
    // The user needs to enable "Email - Read" permissions in their Yahoo app
    this.providers.set('yahoo', {
      name: 'yahoo',
      authorizationUrl: 'https://api.login.yahoo.com/oauth2/request_auth',
      tokenUrl: 'https://api.login.yahoo.com/oauth2/get_token',
      config: {
        clientId: process.env.YAHOO_CLIENT_ID || '',
        clientSecret: process.env.YAHOO_CLIENT_SECRET || '',
        redirectUri: process.env.YAHOO_REDIRECT_URI || 'http://localhost:3000/api/accounts/email/callback',
        scopes: [
          'openid',
          'email',
          // Note: Yahoo doesn't have mail-specific OAuth scopes
          // IMAP access is granted through the "Email - Read" permission in the Yahoo app
        ],
      },
    });
  }

  /**
   * Generate OAuth authorization URL
   */
  getAuthorizationUrl(provider: string, state?: string): string {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const { authorizationUrl, config } = providerConfig;
    const stateParam = state || this.generateState();

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: stateParam,
      access_type: 'offline', // For refresh tokens
      prompt: 'consent', // Force consent to get refresh token
    });

    return `${authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    provider: string,
    code: string
  ): Promise<OAuthTokens> {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const { tokenUrl, config } = providerConfig;

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${error}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    provider: string,
    refreshToken: string
  ): Promise<OAuthTokens> {
    const providerConfig = this.providers.get(provider);
    if (!providerConfig) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const { tokenUrl, config } = providerConfig;

    const params = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${error}`);
    }

    const data = await response.json() as any;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken, // Some providers don't return new refresh token
      expiresIn: data.expires_in,
      tokenType: data.token_type,
    };
  }

  /**
   * Get user email from provider
   */
  async getUserEmail(provider: string, accessToken: string): Promise<string> {
    if (provider === 'gmail' || provider === 'google-calendar') {
      return this.getGoogleUserEmail(accessToken);
    } else if (provider === 'microsoft' || provider === 'microsoft-calendar') {
      return this.getMicrosoftUserEmail(accessToken);
    } else if (provider === 'yahoo') {
      return this.getYahooUserEmail(accessToken);
    }
    throw new Error(`Unsupported provider: ${provider}`);
  }

  private async getGoogleUserEmail(accessToken: string): Promise<string> {
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get Google user info');
    }

    const data = await response.json() as any;
    return data.email;
  }

  private async getMicrosoftUserEmail(accessToken: string): Promise<string> {
    const response = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Microsoft user info');
    }

    const data = await response.json() as any;
    return data.mail || data.userPrincipalName;
  }

  private async getYahooUserEmail(accessToken: string): Promise<string> {
    const response = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Yahoo user info');
    }

    const data = await response.json() as any;
    return data.email;
  }

  /**
   * Generate random state for CSRF protection
   */
  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate provider is supported
   */
  isProviderSupported(provider: string): boolean {
    return this.providers.has(provider);
  }
}

export const oauthService = new OAuthService();
