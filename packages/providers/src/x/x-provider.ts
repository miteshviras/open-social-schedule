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

export interface XConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

export class XProvider implements SocialProvider {
  public readonly type = 'x';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(config?: XConfig) {
    this.clientId = config?.clientId || process.env.X_CLIENT_ID || '';
    this.clientSecret = config?.clientSecret || process.env.X_CLIENT_SECRET || '';
    this.redirectUri = config?.redirectUri || process.env.X_REDIRECT_URI || 'http://localhost:3000/api/auth/x/callback';
  }

  public async validatePost(input: ProviderPostInput): Promise<ValidationResult> {
    const issues = [];
    const text = input.content?.trim() || '';

    if (text.length === 0) {
      issues.push({ field: 'content', message: 'Tweet text cannot be empty.' });
    }

    if (text.length > 280) {
      issues.push({
        field: 'content',
        message: `Tweet exceeds 280 character limit (currently ${text.length} characters).`,
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

    const payload = {
      text: input.content,
    };

    try {
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${input.credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const rateLimitRemaining = response.headers.get('x-rate-limit-remaining');

      if (!response.ok) {
        const errorBody = await response.text();
        throw new ProviderError(
          `X (Twitter) tweet creation failed: ${errorBody}`,
          response.status,
          'X_API_ERROR',
          { rateLimitRemaining }
        );
      }

      const data = await response.json() as any;
      const tweetId = data.data?.id || `tweet_${Date.now()}`;

      return {
        success: true,
        providerPostId: tweetId,
        providerPostUrl: `https://x.com/i/web/status/${tweetId}`,
      };
    } catch (err: any) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(err.message, undefined, 'NETWORK_ERROR');
    }
  }

  public async getAccount(credentials: { accessToken: string }): Promise<SocialAccountProfile> {
    try {
      const response = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderError(
          `Failed to fetch X user profile: ${errorText}`,
          response.status,
          'PROFILE_FETCH_FAILED'
        );
      }

      const data = await response.json() as any;
      const user = data.data;

      return {
        providerAccountId: user.id,
        displayName: user.name,
        username: user.username,
        avatarUrl: user.profile_image_url,
      };
    } catch (err: any) {
      if (err instanceof ProviderError) throw err;
      throw new ProviderError(err.message, undefined, 'NETWORK_ERROR');
    }
  }

  public getAuthorizationUrl(options: OAuthAuthorizationUrlOptions): string {
    const envScopes = process.env.X_SCOPES
      ? process.env.X_SCOPES.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const defaultScopes = ['tweet.read', 'tweet.write', 'users.read', 'offline.access'];
    const scopes = options.scopes && options.scopes.length > 0
      ? options.scopes
      : (envScopes && envScopes.length > 0 ? envScopes : defaultScopes);
    const redirectUri = options.redirectUri || this.redirectUri || 'http://localhost:3000/api/auth/x/callback';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: scopes.join(' '),
      state: options.state,
      code_challenge: options.codeChallenge || 'challenge',
      code_challenge_method: 'S256',
    });

    return `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  }

  public async exchangeCodeForToken(
    options: OAuthTokenExchangeOptions
  ): Promise<OAuthTokenResult> {
    const redirectUri = options.redirectUri || this.redirectUri || 'http://localhost:3000/api/auth/x/callback';

    const params = new URLSearchParams({
      code: options.code,
      grant_type: 'authorization_code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      code_verifier: options.codeVerifier || '',
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.clientSecret) {
      const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderError(
        `Failed to exchange X authorization code: ${errorText}`,
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
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.clientSecret) {
      const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    }

    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new ProviderError(
        `Failed to refresh X token: ${errorText}`,
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
