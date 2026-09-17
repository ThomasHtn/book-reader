package io.github.thomashtn.bookreader.shared.config;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Throttles repeated failed {@code X-Admin-Key} attempts per remote address.
 *
 * <p>The admin key is a single shared secret compared in constant time by {@link AdminApiKeyFilter},
 * which defeats timing attacks but not a caller simply guessing values fast enough. This tracks
 * invalid-key failures per remote address in memory and locks an address out for a short window once
 * it crosses a small budget — enough to make brute-forcing impractical without penalizing an operator
 * who mistypes the key once or twice.
 */
@Component
public class AdminAuthRateLimiter {

    /**
     * Failed attempts allowed for one remote address before it is locked out.
     */
    private final int maxFailures;

    /**
     * Duration a remote address stays locked out once it crosses {@link #maxFailures}, and the
     * duration after which an address's failure count resets.
     */
    private final Duration lockoutDuration;

    /**
     * Clock used to time attempt windows.
     */
    private final Clock clock;

    /**
     * Number of tracked addresses beyond which expired windows are swept before a new one is added.
     *
     * <p>Far above what this application's handful of operators can produce, so a legitimate
     * mistyped key never triggers the sweep.</p>
     */
    private static final int SWEEP_THRESHOLD = 1_000;

    /**
     * Tracked failure windows, keyed by remote address.
     */
    private final ConcurrentHashMap<String, AttemptWindow> windowsByRemoteAddress =
        new ConcurrentHashMap<>();

    /**
     * Creates the administrative authentication rate limiter.
     *
     * @param maxFailures     failed attempts allowed before a remote address is locked out
     * @param lockoutDuration duration a remote address stays locked out, and the window a failure
     *                        count resets after
     * @param clock           application clock
     */
    public AdminAuthRateLimiter(
        @Value("${app.admin-rate-limit.max-failures}") int maxFailures,
        @Value("${app.admin-rate-limit.lockout-duration}") Duration lockoutDuration,
        Clock clock
    ) {
        this.maxFailures = maxFailures;
        this.lockoutDuration = lockoutDuration;
        this.clock = clock;
    }

    /**
     * Determines whether a remote address is currently locked out.
     *
     * @param remoteAddress caller's remote address
     * @return {@code true} when the address has crossed the failure budget within the current window
     */
    public boolean isLockedOut(String remoteAddress) {
        AttemptWindow window = windowsByRemoteAddress.get(remoteAddress);

        if (window == null) {
            return false;
        }

        if (window.isExpired(clock, lockoutDuration)) {
            windowsByRemoteAddress.remove(remoteAddress, window);
            return false;
        }

        return window.failureCount() >= maxFailures;
    }

    /**
     * Records an invalid-key attempt from a remote address.
     *
     * @param remoteAddress caller's remote address
     */
    public void recordFailure(String remoteAddress) {
        sweepExpiredWindows();

        windowsByRemoteAddress.compute(
            remoteAddress,
            (key, existing) -> existing == null || existing.isExpired(clock, lockoutDuration)
                ? new AttemptWindow(1, clock.instant())
                : existing.increment()
        );
    }

    /**
     * Clears any tracked failures for a remote address, following a valid-key request.
     *
     * @param remoteAddress caller's remote address
     */
    public void recordSuccess(String remoteAddress) {
        windowsByRemoteAddress.remove(remoteAddress);
    }

    /**
     * Number of remote addresses currently tracked.
     *
     * <p>Package-private and used only by tests: sweeping reclaims memory, which no response or
     * lockout decision reveals, so this is the only way to assert it actually happens.</p>
     *
     * @return count of tracked failure windows
     */
    int trackedAddressCount() {
        return windowsByRemoteAddress.size();
    }

    /**
     * Drops windows that have outlived their lockout, once enough addresses are tracked.
     *
     * <p>A window is otherwise only discarded when its own address is seen again, so addresses that
     * fail once and never return stay in the map for good. The keys come from unauthenticated
     * callers, which makes that a slow leak an attacker can drive by rotating source addresses.
     * Sweeping keeps the map proportional to the addresses currently failing rather than to every
     * address that ever failed.</p>
     */
    private void sweepExpiredWindows() {
        if (windowsByRemoteAddress.size() < SWEEP_THRESHOLD) {
            return;
        }

        windowsByRemoteAddress.values()
            .removeIf(window -> window.isExpired(clock, lockoutDuration));
    }

    /**
     * Failure count accumulated by a remote address since its first recent failure.
     *
     * @param failureCount   number of invalid-key attempts recorded in this window
     * @param firstFailureAt instant the window started at
     */
    private record AttemptWindow(int failureCount, Instant firstFailureAt) {

        /**
         * Returns a window with one additional failure, keeping the original start instant.
         *
         * @return incremented attempt window
         */
        AttemptWindow increment() {
            return new AttemptWindow(failureCount + 1, firstFailureAt);
        }

        /**
         * Determines whether this window is old enough to no longer apply.
         *
         * @param currentClock  application clock
         * @param windowMaxAge  configured window duration
         * @return {@code true} when the window started more than {@code windowMaxAge} ago
         */
        boolean isExpired(Clock currentClock, Duration windowMaxAge) {
            return currentClock.instant().isAfter(firstFailureAt.plus(windowMaxAge));
        }
    }
}
