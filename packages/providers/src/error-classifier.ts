import { ClassifiedError, ErrorClassification } from '@open-social/core';

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly providerErrorCode?: string,
    public readonly safeDetails?: Record<string, any>
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

/**
 * Classifies an error caught during provider interaction into transient (retryable)
 * or permanent (non-retryable) categories.
 */
export function classifyProviderError(error: unknown, fallbackStatusCode?: number): ClassifiedError {
  let statusCode = fallbackStatusCode;
  let rawMessage = 'Unknown provider error occurred';
  let errorCode = 'PROVIDER_ERROR';

  if (error instanceof ProviderError) {
    statusCode = error.statusCode ?? fallbackStatusCode;
    rawMessage = error.message;
    errorCode = error.providerErrorCode ?? 'PROVIDER_ERROR';
  } else if (error instanceof Error) {
    rawMessage = error.message;
    if ('status' in error && typeof (error as any).status === 'number') {
      statusCode = (error as any).status;
    }
  }

  // Network / Timeout errors
  const lowerMsg = rawMessage.toLowerCase();
  if (
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('econnreset') ||
    lowerMsg.includes('etimedout') ||
    lowerMsg.includes('network') ||
    lowerMsg.includes('und_err_connect_timeout')
  ) {
    return {
      classification: 'network_timeout',
      isRetryable: true,
      code: 'NETWORK_TIMEOUT',
      message: 'Network connection to social provider timed out. Will retry.',
    };
  }

  if (statusCode) {
    if (statusCode === 429) {
      return {
        classification: 'rate_limit',
        isRetryable: true,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Social platform rate limit reached. Backing off and retrying.',
      };
    }

    if (statusCode >= 500 && statusCode <= 599) {
      return {
        classification: 'transient_provider_error',
        isRetryable: true,
        code: `HTTP_${statusCode}`,
        message: `Provider returned temporary server error (${statusCode}). Will retry.`,
      };
    }

    if (statusCode === 401 || statusCode === 403) {
      return {
        classification: 'authentication',
        isRetryable: false,
        code: 'AUTH_FAILED',
        message: 'Account authentication failed or permissions expired. Please reconnect your account.',
      };
    }

    if (statusCode === 400 || statusCode === 422) {
      return {
        classification: 'validation',
        isRetryable: false,
        code: 'CONTENT_VALIDATION_FAILED',
        message: `Post content rejected by provider (${rawMessage}).`,
      };
    }
  }

  // Default permanent error
  return {
    classification: 'permanent_provider_error',
    isRetryable: false,
    code: errorCode,
    message: rawMessage,
  };
}
