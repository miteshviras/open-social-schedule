export type TargetStatus =
  | 'draft'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'retryable_failure'
  | 'failed'
  | 'canceled';

export type ErrorClassification =
  | 'authentication'
  | 'validation'
  | 'rate_limit'
  | 'network_timeout'
  | 'transient_provider_error'
  | 'permanent_provider_error';

export interface ClassifiedError {
  classification: ErrorClassification;
  isRetryable: boolean;
  code: string;
  message: string;
}

export interface SafeSocialAccount {
  id: string;
  userId: string;
  provider: string;
  providerAccountId: string;
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
  status: string;
  tokenExpiresAt?: Date | null;
  scopes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostInput {
  userId: string;
  canonicalContent: string;
  targets?: Array<{
    socialAccountId: string;
    publishAtUtc: Date;
    timezone: string;
    contentOverride?: string;
  }>;
}

export interface BulkScheduleCadence {
  startDateUtc: Date;
  timezone: string;
  intervalMinutes?: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  postingTimes?: string[]; // e.g. ["09:00", "14:00", "18:00"]
}

export interface BulkTargetOverride {
  socialAccountId: string;
  provider?: string;
  contentOverride?: string;
}

export interface BulkScheduleRow {
  content: string;
  contentOverride?: string;
  socialAccountId?: string;
  socialAccountIds?: string[];
  targets?: BulkTargetOverride[];
  customPublishAtUtc?: Date;
}

export interface BulkScheduleTargetPreview {
  socialAccountId: string;
  provider: string;
  displayName: string;
  content: string;
  charCount: number;
  charLimit: number;
  isValid: boolean;
  validationError?: string;
}

export interface BulkSchedulePreviewItem {
  rowIndex: number;
  content: string;
  socialAccountId: string;
  publishAtUtc: Date;
  publishAtLocalDisplay: string;
  timezone: string;
  isValid: boolean;
  validationError?: string;
  targets?: BulkScheduleTargetPreview[];
  isAllValid?: boolean;
}

export interface BulkSchedulePreviewResult {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  items: BulkSchedulePreviewItem[];
}

export interface BulkCommitTargetItem {
  socialAccountId: string;
  contentOverride?: string;
  publishAtUtc?: Date;
  timezone?: string;
}

export interface BulkCommitItem {
  content: string;
  contentOverride?: string;
  socialAccountId?: string;
  publishAtUtc: Date;
  timezone: string;
  targets?: BulkCommitTargetItem[];
}

