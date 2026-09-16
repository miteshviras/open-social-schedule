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

export class MockProvider implements SocialProvider {
  public readonly type = 'mock';

  public async validatePost(input: ProviderPostInput): Promise<ValidationResult> {
    const issues = [];
    const text = input.content?.trim() || '';

    if (text.length === 0) {
      issues.push({ field: 'content', message: 'Mock post content cannot be empty.' });
    }

    if (text.includes('__TRIGGER_VALIDATION_ERROR__')) {
      issues.push({ field: 'content', message: 'Simulated validation error triggered.' });
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

    if (input.content.includes('__TRIGGER_RATE_LIMIT__')) {
      throw new ProviderError('Rate limit exceeded on mock platform', 429, 'RATE_LIMIT');
    }

    if (input.content.includes('__TRIGGER_TIMEOUT__')) {
      throw new ProviderError('Connection timed out to mock server', 504, 'TIMEOUT');
    }

    if (input.content.includes('__TRIGGER_AUTH_ERROR__')) {
      throw new ProviderError('Unauthorized token', 401, 'AUTH_REVOKED');
    }

    const mockId = `mock_post_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    return {
      success: true,
      providerPostId: mockId,
      providerPostUrl: `https://example.com/posts/${mockId}`,
      providerRequestId: `req_${Date.now()}`,
    };
  }

  public async getAccount(_credentials: { accessToken: string }): Promise<SocialAccountProfile> {
    return {
      providerAccountId: 'mock_user_123',
      displayName: 'Demo Creator (Mock)',
      username: 'democreator',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      email: 'demo@example.com',
    };
  }

  public getAuthorizationUrl(options: OAuthAuthorizationUrlOptions): string {
    return `http://localhost:3000/api/auth/mock/callback?code=mock_auth_code_123&state=${options.state}`;
  }

  public async exchangeCodeForToken(
    _options: OAuthTokenExchangeOptions
  ): Promise<OAuthTokenResult> {
    return {
      accessToken: 'mock_access_token_super_secret',
      refreshToken: 'mock_refresh_token_super_secret',
      expiresInSeconds: 3600,
      profile: {
        providerAccountId: 'mock_user_123',
        displayName: 'Demo Creator (Mock)',
        username: 'democreator',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      },
    };
  }

  public async refreshAuth(_refreshToken: string): Promise<AuthRefreshResult> {
    return {
      accessToken: 'mock_refreshed_access_token',
      expiresInSeconds: 3600,
    };
  }
}
