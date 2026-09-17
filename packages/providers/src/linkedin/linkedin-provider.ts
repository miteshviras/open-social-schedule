import {
  SocialProvider,
  ProviderPostInput,
  ValidationResult,
  PublishResult,
  SocialAccountProfile,
  AuthRefreshResult,
  OAuthAuthorizationUrlOptions,
  OAuthTokenExchangeOptions,
  OAuthTokenResult,
} from '../types.js';
import { ProviderError } from '../error-classifier.js';

export interface LinkedInConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  apiVersion?: string;
}

export class LinkedInProvider implements SocialProvider {
  public readonly type = 'linkedin';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly apiVersion: string;

  constructor(config?: LinkedInConfig) {
    this.clientId = config?.clientId || process.env.LINKEDIN_CLIENT_ID || '';
    this.clientSecret = config?.clientSecret || process.env.LINKEDIN_CLIENT_SECRET || '';
    this.redirectUri = config?.redirectUri || process.env.LINKEDIN_REDIRECT_URI || '';
    this.apiVersion = config?.apiVersion || '202401';
  }

  public async validatePost(input: ProviderPostInput): Promise<ValidationResult> {
    const issues = [];
    const text = input.content?.trim() || '';

    if (text.length === 0) {
      issues.push({ field: 'content', message: 'LinkedIn post text cannot be empty.' });
    }

    if (text.length > 3000) {
      issues.push({
        field: 'content',
        message: `LinkedIn post exceeds character limit of 3,000 (currently ${text.length}).`,
      });
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  public async publishPost(input: ProviderPostInput): Promise<PublishResult> {
    const validation = await this.validatePost(input);
    if (!validation.isValid) {
      throw new ProviderError(
        validation.issues.map((i) => i.message).join('; '),
        400,
        'VALIDATION_FAILED'
      );
    }

    const personUrn = input.credentials.providerAccountId.startsWith('urn:li:person:')
      ? input.credentials.providerAccountId
      : `urn:li:person:${input.credentials.providerAccountId}`;

    const payload = {
      author: personUrn,
      commentary: input.content,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    try {
      const response = await fetch('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.credentials.accessToken}`,
          'LinkedIn-Version': this.apiVersion,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const requestId = response.headers.get('x-li-request-id') || undefined;

      if (!response.ok) {
        const errorBody = await response.text();
        throw new ProviderError(
          `LinkedIn publish failed: ${errorBody}`,
          response.status,
          'LINKEDIN_API_ERROR',
          { requestId }
        );
      }

      // LinkedIn returns the post URN in the x-restli-id header
      const postUrn = response.headers.get('x-restli-id') || `urn:li:share:${Date.now()}`;

      return {
        success: true,
        providerPostId: postUrn,
        providerPostUrl: `https://www.linkedin.com/feed/update/${postUrn}`,
        providerRequestId: requestId,
      };
    } catch (err: any) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(err.message, undefined, 'NETWORK_ERROR');
    }
  }

  public async getAccount(credentials: { accessToken: string }): Promise<SocialAccountProfile> {
    try {
      const response = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderError(
          `Failed to fetch LinkedIn profile: ${errorText}`,
          response.status,
          'PROFILE_FETCH_FAILED'
        );
      }

      const data = await response.json() as any;
      return {
        providerAccountId: data.sub,
        displayName: data.name || `${data.given_name || ''} ${data.family_name || ''}`.trim(),
        avatarUrl: data.picture,
        email: data.email,
      };
    } catch (err: any) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(err.message, undefined, 'NETWORK_ERROR');
    }
  }

  public getAuthorizationUrl(options: OAuthAuthorizationUrlOptions): string {
    const defaultScopes = process.env.LINKEDIN_SCOPES
      ? process.env.LINKEDIN_SCOPES.split(',').map((s) => s.trim()).filter(Boolean)
      : ['openid', 'profile', 'email', 'w_member_social'];
    const scopes = options.scopes || defaultScopes;
    const redirectUri = options.redirectUri || this.redirectUri;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      state: options.state,
      scope: scopes.join(' '),
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  public async exchangeCodeForToken(
    options: OAuthTokenExchangeOptions
  ): Promise<OAuthTokenResult> {
    const redirectUri = options.redirectUri || this.redirectUri;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: options.code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
    });

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderError(
        `Failed to exchange LinkedIn authorization code: ${errorText}`,
        response.status,
        'OAUTH_EXCHANGE_FAILED'
      );
    }

    const data = await response.json() as any;
    const profile = await this.getAccount({ accessToken: data.access_token });

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresInSeconds: data.expires_in,
      profile,
    };
  }

  public async refreshAuth(refreshToken: string): Promise<AuthRefreshResult> {
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderError(
        `Failed to refresh LinkedIn token: ${errorText}`,
        response.status,
        'TOKEN_REFRESH_FAILED'
      );
    }

    const data = await response.json() as any;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresInSeconds: data.expires_in,
    };
  }
}
