import { LoginThrottle } from './loginThrottle';

describe('LoginThrottle', () => {
  it('allows attempts below the limit', () => {
    const throttle = new LoginThrottle(3, 1000);
    throttle.recordFailure('bob');
    throttle.recordFailure('bob');
    expect(throttle.check('bob')).toBe(0);
  });

  it('blocks once the limit is reached', () => {
    const throttle = new LoginThrottle(3, 1000);
    for (let i = 0; i < 3; i++) {
      throttle.recordFailure('bob', 0);
    }
    expect(throttle.check('bob', 0)).toBeGreaterThan(0);
  });

  it('releases the block once the duration passes', () => {
    const throttle = new LoginThrottle(2, 1000);
    throttle.recordFailure('bob', 0);
    throttle.recordFailure('bob', 0);
    expect(throttle.check('bob', 500)).toBe(500);
    expect(throttle.check('bob', 1001)).toBe(0);
  });

  it('clears the counter on success', () => {
    const throttle = new LoginThrottle(2, 1000);
    throttle.recordFailure('bob', 0);
    throttle.recordSuccess('bob');
    throttle.recordFailure('bob', 0);
    expect(throttle.check('bob', 0)).toBe(0);
  });

  it('tracks users independently', () => {
    const throttle = new LoginThrottle(1, 1000);
    throttle.recordFailure('bob', 0);
    expect(throttle.check('bob', 0)).toBeGreaterThan(0);
    expect(throttle.check('alice', 0)).toBe(0);
  });
});
