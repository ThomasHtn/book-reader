package io.github.thomashtn.bookreader.shared.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

/**
 * Verifies the failure-counting and lockout behavior of {@link AdminAuthRateLimiter}, independent of
 * the HTTP filter that calls it.
 */
class AdminAuthRateLimiterTest {

    /**
     * Remote address used by tests that don't need more than one.
     */
    private static final String REMOTE_ADDRESS = "203.0.113.10";

    /**
     * Clock shared by every test, advanced explicitly where a test needs elapsed time.
     */
    private final MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));

    /**
     * Verifies that an address is not locked out before crossing the failure budget.
     */
    @Test
    void shouldNotLockOutBelowFailureBudget() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(3);

        rateLimiter.recordFailure(REMOTE_ADDRESS);
        rateLimiter.recordFailure(REMOTE_ADDRESS);

        assertThat(rateLimiter.isLockedOut(REMOTE_ADDRESS)).isFalse();
    }

    /**
     * Verifies that an address is locked out once it reaches the failure budget.
     */
    @Test
    void shouldLockOutAtFailureBudget() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(3);

        rateLimiter.recordFailure(REMOTE_ADDRESS);
        rateLimiter.recordFailure(REMOTE_ADDRESS);
        rateLimiter.recordFailure(REMOTE_ADDRESS);

        assertThat(rateLimiter.isLockedOut(REMOTE_ADDRESS)).isTrue();
    }

    /**
     * Verifies that a valid key clears the tracked failure count for its remote address.
     */
    @Test
    void shouldClearFailuresOnSuccess() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(3);

        rateLimiter.recordFailure(REMOTE_ADDRESS);
        rateLimiter.recordFailure(REMOTE_ADDRESS);
        rateLimiter.recordFailure(REMOTE_ADDRESS);
        rateLimiter.recordSuccess(REMOTE_ADDRESS);

        assertThat(rateLimiter.isLockedOut(REMOTE_ADDRESS)).isFalse();
    }

    /**
     * Verifies that failures tracked for one remote address never lock out a different one.
     */
    @Test
    void shouldTrackFailuresPerRemoteAddress() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(1);

        rateLimiter.recordFailure(REMOTE_ADDRESS);

        assertThat(rateLimiter.isLockedOut("203.0.113.99")).isFalse();
    }

    /**
     * Verifies that a lockout expires once the configured duration has elapsed.
     */
    @Test
    void shouldExpireLockoutAfterDuration() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(1);

        rateLimiter.recordFailure(REMOTE_ADDRESS);
        assertThat(rateLimiter.isLockedOut(REMOTE_ADDRESS)).isTrue();

        clock.advance(Duration.ofMinutes(1).plusSeconds(1));

        assertThat(rateLimiter.isLockedOut(REMOTE_ADDRESS)).isFalse();
    }

    /**
     * Verifies that expired windows are reclaimed once enough addresses are tracked.
     *
     * <p>Without the sweep, an address that fails once and never comes back is never revisited, so
     * its window stays forever and the map grows with every new source address an attacker uses.</p>
     */
    @Test
    void shouldSweepExpiredWindowsOnceEnoughAddressesAreTracked() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(3);

        for (int index = 0; index < 1_000; index++) {
            rateLimiter.recordFailure("198.51.100." + index);
        }

        assertThat(rateLimiter.trackedAddressCount()).isEqualTo(1_000);

        clock.advance(Duration.ofMinutes(1).plusSeconds(1));
        rateLimiter.recordFailure(REMOTE_ADDRESS);

        assertThat(rateLimiter.trackedAddressCount()).isEqualTo(1);
    }

    /**
     * Creates a rate limiter with a one-minute lockout window, using the test's mutable clock.
     *
     * @param maxFailures failed attempts allowed before a lockout
     * @return configured rate limiter
     */
    private AdminAuthRateLimiter createRateLimiter(int maxFailures) {
        return new AdminAuthRateLimiter(maxFailures, Duration.ofMinutes(1), clock);
    }

    /**
     * Clock whose current instant can be advanced on demand, letting tests control the passage of
     * time without sleeping.
     */
    private static final class MutableClock extends Clock {

        /**
         * Instant currently returned by the clock.
         */
        private Instant instant;

        MutableClock(Instant instant) {
            this.instant = instant;
        }

        /**
         * Moves the clock forward by a duration.
         *
         * @param duration amount of time to advance by
         */
        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            throw new UnsupportedOperationException("not needed by these tests");
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
