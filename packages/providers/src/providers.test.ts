import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ProviderRegistry,
  classifyProviderError,
  ProviderError,
  MockProvider,
  LinkedInProvider,
  XProvider,
} from './index.js';

describe('Provider Registry', () => {
  it('should list and retrieve registered social providers', () => {
    const list = ProviderRegistry.listAvailable();
    assert.ok(list.includes('linkedin'));
    assert.ok(list.includes('x'));
    assert.ok(list.includes('mock'));

    const mock = ProviderRegistry.get('mock');
    assert.equal(mock.type, 'mock');

    const linkedin = ProviderRegistry.get('linkedin');
    assert.equal(linkedin.type, 'linkedin');

    const x = ProviderRegistry.get('x');
    assert.equal(x.type, 'x');
  });

  it('should throw when an unknown provider is requested', () => {
    assert.throws(() => {
      ProviderRegistry.get('unknown_provider');
    });
  });
});

describe('Provider Error Classification', () => {
  it('should classify HTTP 429 as transient rate limit error', () => {
    const err = new ProviderError('Rate limit', 429);
    const classified = classifyProviderError(err);
    assert.equal(classified.classification, 'rate_limit');
    assert.equal(classified.isRetryable, true);
  });

  it('should classify HTTP 500 as transient provider error', () => {
    const err = new ProviderError('Internal server error', 500);
    const classified = classifyProviderError(err);
    assert.equal(classified.classification, 'transient_provider_error');
    assert.equal(classified.isRetryable, true);
  });

  it('should classify HTTP 401 as permanent authentication error', () => {
    const err = new ProviderError('Unauthorized', 401);
    const classified = classifyProviderError(err);
    assert.equal(classified.classification, 'authentication');
    assert.equal(classified.isRetryable, false);
  });

  it('should classify network timeout as transient retryable error', () => {
    const err = new Error('fetch failed: connect ETIMEDOUT 104.244.42.1:443');
    const classified = classifyProviderError(err);
    assert.equal(classified.classification, 'network_timeout');
    assert.equal(classified.isRetryable, true);
  });
});

describe('Mock Provider Adapter', () => {
  const provider = new MockProvider();

  it('should validate and publish a post successfully', async () => {
    const input = {
      targetId: 't1',
      content: 'Hello World from Open Social Scheduler!',
      credentials: {
        accessToken: 'fake_tok',
        providerAccountId: 'mock_user_123',
      },
    };

    const validation = await provider.validatePost(input);
    assert.equal(validation.isValid, true);

    const result = await provider.publishPost(input);
    assert.equal(result.success, true);
    assert.ok(result.providerPostId);
  });

  it('should reject empty post content', async () => {
    const input = {
      targetId: 't2',
      content: '   ',
      credentials: {
        accessToken: 'fake_tok',
        providerAccountId: 'mock_user_123',
      },
    };

    const validation = await provider.validatePost(input);
    assert.equal(validation.isValid, false);
    assert.equal(validation.issues.length, 1);
  });

  it('should trigger simulated errors when special markers are present', async () => {
    const input = {
      targetId: 't3',
      content: 'Testing __TRIGGER_RATE_LIMIT__',
      credentials: {
        accessToken: 'fake_tok',
        providerAccountId: 'mock_user_123',
      },
    };

    await assert.rejects(async () => {
      await provider.publishPost(input);
    }, (err: any) => err.statusCode === 429);
  });
});

describe('LinkedIn & X Post Validation Rules', () => {
  it('LinkedIn provider should reject posts exceeding 3000 characters', async () => {
    const provider = new LinkedInProvider({ clientId: 'test', clientSecret: 'test' });
    const longContent = 'A'.repeat(3001);

    const validation = await provider.validatePost({
      targetId: 't4',
      content: longContent,
      credentials: { accessToken: 'tok', providerAccountId: '123' },
    });

    assert.equal(validation.isValid, false);
    assert.ok(validation.issues[0].message.includes('3,000'));
  });

  it('X provider should reject tweets exceeding 280 characters', async () => {
    const provider = new XProvider({ clientId: 'test' });
    const longTweet = 'X'.repeat(281);

    const validation = await provider.validatePost({
      targetId: 't5',
      content: longTweet,
      credentials: { accessToken: 'tok', providerAccountId: '123' },
    });

    assert.equal(validation.isValid, false);
    assert.ok(validation.issues[0].message.includes('280'));
  });

  it('LinkedIn and X should generate valid OAuth URLs', () => {
    const li = new LinkedInProvider({ clientId: 'li_client', redirectUri: 'http://localhost/cb' });
    const liUrl = li.getAuthorizationUrl({ state: 'state123' });
    assert.ok(liUrl.startsWith('https://www.linkedin.com/oauth/v2/authorization'));
    assert.ok(liUrl.includes('client_id=li_client'));

    const x = new XProvider({ clientId: 'x_client', redirectUri: 'http://localhost/cb' });
    const xUrl = x.getAuthorizationUrl({ state: 'state456', codeChallenge: 'chal789' });
    assert.ok(xUrl.startsWith('https://twitter.com/i/oauth2/authorize'));
    assert.ok(xUrl.includes('client_id=x_client'));
    assert.ok(xUrl.includes('code_challenge=chal789'));
  });
});
