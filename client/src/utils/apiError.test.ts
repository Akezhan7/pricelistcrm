import { buildRateLimitMessage, parseRetryAfterSeconds } from './apiError';

describe('apiError', () => {
  it('parses Retry-After seconds', () => {
    expect(parseRetryAfterSeconds('45')).toBe(45);
  });

  it('builds user-facing 429 message with retry delay', () => {
    expect(buildRateLimitMessage('30')).toBe('Слишком много запросов. Повторите через 30 секунд.');
  });

  it('falls back to backend message when retry delay is unavailable', () => {
    expect(buildRateLimitMessage(undefined, 'Слишком много запросов, попробуйте позже')).toBe(
      'Слишком много запросов, попробуйте позже'
    );
  });
});
