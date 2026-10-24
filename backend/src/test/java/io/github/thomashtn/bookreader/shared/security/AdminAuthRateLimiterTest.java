package io.github.thomashtn.bookreader.shared.security;

import static org.assertj.core.api.Assertions.assertThat;

import io.github.thomashtn.bookreader.shared.config.ApplicationProperties.AdminRateLimit;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.stream.IntStream;
import org.junit.jupiter.api.DisplayName;
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

    @Test
    @DisplayName("Does not lock an address out below the failure budget")
    void shouldNotLockOutBelowFailureBudget() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(3);

        rateLimiter.recordFailure(REMOTE_ADDRESS);
        rateLimiter.recordFailure(REMOTE_ADDRESS);

        assertThat(rateLimiter.isLockedOut(REMOTE_ADDRESS)).isFalse();
    }

    @Test
    @DisplayName("Locks an address out once it reaches the failure budget")
    void shouldLockOutAtFailureBudget() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(3);

        rateLimiter.recordFailure(REMOTE_ADDRESS);
        rateLimiter.recordFailure(REMOTE_ADDRESS);
        rateLimiter.recordFailure(REMOTE_ADDRESS);

        assertThat(rateLimiter.isLockedOut(REMOTE_ADDRESS)).isTrue();
    }

    @Test
    @DisplayName("Clears the failures of an address after a valid key")
    void shouldClearFailuresOnSuccess() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(3);

        rateLimiter.recordFailure(REMOTE_ADDRESS);
        rateLimiter.recordFailure(REMOTE_ADDRESS);
        rateLimiter.recordFailure(REMOTE_ADDRESS);
        rateLimiter.recordSuccess(REMOTE_ADDRESS);

        assertThat(rateLimiter.isLockedOut(REMOTE_ADDRESS)).isFalse();
    }

    @Test
    @DisplayName("Never locks an address out for another address's failures")
    void shouldTrackFailuresPerRemoteAddress() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(1);

        rateLimiter.recordFailure(REMOTE_ADDRESS);

        assertThat(rateLimiter.isLockedOut("203.0.113.99")).isFalse();
    }

    @Test
    @DisplayName("Lifts a lockout once its duration has elapsed")
    void shouldExpireLockoutAfterDuration() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(1);

        rateLimiter.recordFailure(REMOTE_ADDRESS);
        assertThat(rateLimiter.isLockedOut(REMOTE_ADDRESS)).isTrue();

        clock.advance(Duration.ofMinutes(1).plusSeconds(1));

        assertThat(rateLimiter.isLockedOut(REMOTE_ADDRESS)).isFalse();
    }

    @Test
    @DisplayName("Keeps a lockout for its whole duration, even when the budget is reached late in the window")
    void shouldLockOutForFullDurationFromLastFailure() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(2);

        rateLimiter.recordFailure(REMOTE_ADDRESS);
        clock.advance(Duration.ofSeconds(58));
        rateLimiter.recordFailure(REMOTE_ADDRESS);
        clock.advance(Duration.ofSeconds(10));

        assertThat(rateLimiter.isLockedOut(REMOTE_ADDRESS)).isTrue();

        clock.advance(Duration.ofMinutes(1));

        assertThat(rateLimiter.isLockedOut(REMOTE_ADDRESS)).isFalse();
    }

    @Test
    @DisplayName("Reclaims expired windows once many addresses are tracked, so rotating addresses cannot leak memory")
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

    @Test
    @DisplayName("Refuses and stops counting once the address is locked out")
    void shouldRefuseAttemptsWhileLockedOut() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(2);

        assertThat(rateLimiter.recordFailure(REMOTE_ADDRESS)).isTrue();
        assertThat(rateLimiter.recordFailure(REMOTE_ADDRESS)).isTrue();
        assertThat(rateLimiter.recordFailure(REMOTE_ADDRESS)).isFalse();
        assertThat(rateLimiter.recordFailure(REMOTE_ADDRESS)).isFalse();
    }

    @Test
    @DisplayName("Lets exactly the budget through when many requests arrive at once")
    void shouldNotLetParallelAttemptsExceedTheBudget() {
        AdminAuthRateLimiter rateLimiter = createRateLimiter(5);

        long allowed = IntStream.range(0, 200).parallel()
            .filter(attempt -> rateLimiter.recordFailure(REMOTE_ADDRESS))
            .count();

        assertThat(allowed).isEqualTo(5);
    }

    /**
     * Creates a rate limiter with a one-minute lockout window, using the test's mutable clock.
     *
     * @param maxFailures failed attempts allowed before a lockout
     * @return configured rate limiter
     */
    private AdminAuthRateLimiter createRateLimiter(int maxFailures) {
        return new AdminAuthRateLimiter(new AdminRateLimit(maxFailures, Duration.ofMinutes(1)), clock);
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

        /**
         * Creates a clock stopped at an instant.
         *
         * @param instant initial instant
         */
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

        /**
         * Reports UTC, like the application clock.
         *
         * @return UTC
         */
        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        /**
         * Not supported: the rate limiter only reads instants.
         *
         * @param zone requested zone
         * @return never
         */
        @Override
        public Clock withZone(ZoneId zone) {
            throw new UnsupportedOperationException("not needed by these tests");
        }

        /**
         * Returns the instant the clock was last moved to.
         *
         * @return current instant
         */
        @Override
        public Instant instant() {
            return instant;
        }
    }
}
