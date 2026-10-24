package io.github.thomashtn.bookreader.shared.security;

import io.github.thomashtn.bookreader.shared.config.ApplicationProperties.AdminRateLimit;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Locks out, in memory, a remote address that sent too many wrong administrator keys.
 *
 * <p>Comparing the key in constant time defeats timing attacks, not fast guessing. A small failure
 * budget per address makes brute force impractical without penalizing a caregiver who mistypes the
 * key once or twice.</p>
 */
public class AdminAuthRateLimiter {

    /**
     * Number of tracked addresses beyond which expired windows are swept before a new one is added.
     *
     * <p>Far above what this application's handful of operators can produce, so a legitimate
     * mistyped key never triggers the sweep.</p>
     */
    private static final int SWEEP_THRESHOLD = 1_000;

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
     * Tracked attempt windows, keyed by remote address.
     */
    private final ConcurrentHashMap<String, AttemptWindow> windowsByRemoteAddress =
        new ConcurrentHashMap<>();

    /**
     * Creates the administrative authentication rate limiter.
     *
     * @param settings failure budget and lockout duration
     * @param clock    application clock
     */
    public AdminAuthRateLimiter(AdminRateLimit settings, Clock clock) {
        this.maxFailures = settings.maxFailures();
        this.lockoutDuration = settings.lockoutDuration();
        this.clock = clock;
    }

    /**
     * Determines whether a remote address is currently locked out, without counting anything.
     *
     * @param remoteAddress caller's remote address
     * @return {@code true} when the address has used its whole failure budget within the current window
     */
    public boolean isLockedOut(String remoteAddress) {
        AttemptWindow window = windowsByRemoteAddress.get(remoteAddress);
        return window != null && !window.isExpired(clock.instant()) && window.attempts() >= maxFailures;
    }

    /**
     * Counts a wrong key unless the address is already locked out, in one atomic step, so parallel wrong
     * keys cannot all slip under the budget. Valid keys are never counted, however many arrive at once.
     *
     * @param remoteAddress caller's remote address
     * @return {@code false} when the address was already locked out, in which case nothing is counted
     */
    public boolean recordFailure(String remoteAddress) {
        sweepExpiredWindows();

        AtomicBoolean allowed = new AtomicBoolean();
        windowsByRemoteAddress.compute(remoteAddress, (key, window) -> {
            Instant now = clock.instant();
            if (window == null || window.isExpired(now)) {
                allowed.set(true);
                return new AttemptWindow(1, now.plus(lockoutDuration));
            }
            if (window.attempts() >= maxFailures) {
                return window;
            }
            allowed.set(true);
            int attempts = window.attempts() + 1;
            // The attempt that reaches the budget restarts the window, so the lockout lasts its whole duration.
            Instant expiresAt = attempts == maxFailures ? now.plus(lockoutDuration) : window.expiresAt();
            return new AttemptWindow(attempts, expiresAt);
        });
        return allowed.get();
    }

    /**
     * Clears any tracked attempts for a remote address, following a valid-key request.
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

        Instant now = clock.instant();
        windowsByRemoteAddress.values().removeIf(window -> window.isExpired(now));
    }

    /**
     * Attempts counted for a remote address in the current window.
     *
     * @param attempts  number of wrong keys counted, until a valid key clears them
     * @param expiresAt instant after which the window no longer applies, and the lockout ends
     */
    private record AttemptWindow(int attempts, Instant expiresAt) {

        /**
         * Determines whether this window is old enough to no longer apply.
         *
         * @param now instant to compare with
         * @return {@code true} when the window has ended
         */
        boolean isExpired(Instant now) {
            return now.isAfter(expiresAt);
        }
    }
}
