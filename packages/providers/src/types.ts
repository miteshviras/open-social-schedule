export interface ProviderPostMedia {
  filePath: string;
  mimeType: string;
  fileName?: string;
  sizeBytes?: number;
}

export interface ProviderCredentials {
  accessToken: string;
  refreshToken?: string | null;
  providerAccountId: string;
}

export interface ProviderPostInput {
  targetId: string;
  content: string;
  media?: ProviderPostMedia[];
  credentials: ProviderCredentials;
}

export interface ValidationIssue {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface PublishResult {
  success: boolean;
  providerPostId?: string;
  providerPostUrl?: string;
  providerRequestId?: string;
  rawResponseSafe?: Record<string, any>;
}

export interface SocialAccountProfile {
  providerAccountId: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  email?: string;
}

export interface AuthRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
}

export interface OAuthAuthorizationUrlOptions {
  state: string;
  codeChallenge?: string;
  scopes?: string[];
  redirectUri?: string;
}

export interface OAuthTokenExchangeOptions {
  code: string;
  codeVerifier?: string;
  redirectUri?: string;
}

export interface OAuthTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresInSeconds?: number;
  scopes?: string[];
  profile: SocialAccountProfile;
}

export interface SocialProvider {
  readonly type: string;

  // Validation
  validatePost(input: ProviderPostInput): Promise<ValidationResult>;

  // Publishing
  publishPost(input: ProviderPostInput): Promise<PublishResult>;

  // Identity & Auth
  getAccount(credentials: { accessToken: string }): Promise<SocialAccountProfile>;
  refreshAuth?(refreshToken: string): Promise<AuthRefreshResult>;

  // OAuth flows
  getAuthorizationUrl(options: OAuthAuthorizationUrlOptions): string;
  exchangeCodeForToken(options: OAuthTokenExchangeOptions): Promise<OAuthTokenResult>;
}
