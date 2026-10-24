package io.github.thomashtn.bookreader.shared.security;

import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import io.github.thomashtn.bookreader.shared.exception.ApiErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

/**
 * Authenticates administrative requests with the static key of the {@value #HEADER_NAME} header.
 *
 * <p>This filter only <em>authenticates</em>: a valid key grants {@link #ADMIN_ROLE}, and
 * {@link SecurityConfig} requires that role on {@link #ADMIN_PATH_PATTERN}. The split lets the filter
 * answer with precise problem responses (401 missing header, 403 wrong key, 429 locked-out address)
 * while Spring Security still refuses any administrative request that bypassed it.</p>
 *
 * <p>Built by {@link SecurityConfig} and never declared as a bean or a {@code @Component}: Spring Boot
 * registers every {@link jakarta.servlet.Filter} bean in the servlet container, so it would also run
 * outside the security chain, a second time on every request.</p>
 */
public class AdminApiKeyFilter extends OncePerRequestFilter {

    /**
     * Header expected on every administrative request.
     */
    public static final String HEADER_NAME = "X-Admin-Key";

    /**
     * Path pattern covering every administrative route.
     *
     * <p>Shared with {@link SecurityConfig} on purpose: the filter and the authorization rules must
     * agree on what "administrative" means, or one of them ends up guarding a different set of
     * routes than the other.</p>
     */
    public static final String ADMIN_PATH_PATTERN = "/api/admin/**";

    /**
     * Authority granted to a request carrying a valid administrator key.
     */
    public static final String ADMIN_ROLE = "ROLE_ADMIN";

    /**
     * Matches administrative routes on the decoded path, as Spring MVC resolves handlers.
     *
     * <p>Never a {@code getRequestURI().startsWith(...)} test: the request URI is still
     * percent-encoded, so {@code /api/%61dmin/books} reaches the administrative controller yet fails
     * a raw prefix comparison.</p>
     */
    private static final RequestMatcher ADMIN_ROUTES =
        PathPatternRequestMatcher.withDefaults().matcher(ADMIN_PATH_PATTERN);

    /**
     * Principal name of an authenticated administrator request.
     */
    private static final String ADMIN_PRINCIPAL = "administrator";

    /**
     * Configured administrator key.
     */
    private final String expectedApiKey;

    /**
     * Lockout applied to addresses sending wrong keys.
     */
    private final AdminAuthRateLimiter rateLimiter;

    /**
     * Mapper writing refusals in the same JSON shape as the controllers' errors.
     */
    private final ObjectMapper objectMapper;

    /**
     * Clock stamping each refusal.
     */
    private final Clock clock;

    /**
     * Creates an administrative API key filter.
     *
     * @param expectedApiKey configured key used to validate incoming requests
     * @param rateLimiter    throttle applied to repeated invalid-key attempts
     * @param objectMapper   application JSON mapper
     * @param clock          application clock
     */
    @SuppressFBWarnings(
        value = "EI_EXPOSE_REP2",
        justification = "The application ObjectMapper is a thread-safe singleton shared on purpose; "
            + "SpotBugs only deems it mutable because of its write methods."
    )
    public AdminApiKeyFilter(
        String expectedApiKey, AdminAuthRateLimiter rateLimiter, ObjectMapper objectMapper, Clock clock
    ) {
        this.expectedApiKey = expectedApiKey;
        this.rateLimiter = rateLimiter;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    /**
     * Tells whether a request targets the administrative API, matching the decoded path.
     *
     * <p>Every component that treats administrative routes apart must use this test rather than a
     * prefix comparison on the raw URI.</p>
     *
     * @param request current HTTP request
     * @return {@code true} for a route under {@link #ADMIN_PATH_PATTERN}
     */
    public static boolean isAdminRoute(HttpServletRequest request) {
        return ADMIN_ROUTES.matches(request);
    }

    /**
     * Skips every request outside the administrative API.
     *
     * @param request current HTTP request
     * @return {@code true} when the filter must be skipped
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !isAdminRoute(request);
    }

    /**
     * Skips the error dispatch, so rendering a 404 for an authenticated request never turns into a 401.
     *
     * @return always {@code true}
     */
    @Override
    protected boolean shouldNotFilterErrorDispatch() {
        return true;
    }

    /**
     * Checks the key, then the lockout: only wrong keys are counted, and a locked-out address gets 429 either way.
     *
     * @param request     current HTTP request
     * @param response    current HTTP response
     * @param filterChain remaining servlet filter chain
     * @throws ServletException when the filter chain fails
     * @throws IOException      when the error response cannot be written
     */
    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {

        String remoteAddress = request.getRemoteAddr();
        String providedApiKey = request.getHeader(HEADER_NAME);

        if (providedApiKey == null) {
            // Nothing was guessed, so nothing is counted; a locked-out address still gets its 429.
            if (rateLimiter.isLockedOut(remoteAddress)) {
                writeRateLimited(request, response);
            } else {
                writeProblemResponse(
                    request,
                    response,
                    HttpStatus.UNAUTHORIZED,
                    "ADMIN_KEY_MISSING",
                    "The X-Admin-Key header is required."
                );
            }
            return;
        }

        if (!matchesExpectedKey(providedApiKey)) {
            // Counted atomically: once the budget is spent, every guess gets the same 429.
            if (!rateLimiter.recordFailure(remoteAddress)) {
                writeRateLimited(request, response);
                return;
            }
            writeProblemResponse(
                request,
                response,
                HttpStatus.FORBIDDEN,
                "ADMIN_KEY_INVALID",
                "The administrator key is invalid."
            );
            return;
        }

        // A locked-out address is refused even with the right key, or the lockout would reveal it.
        if (rateLimiter.isLockedOut(remoteAddress)) {
            writeRateLimited(request, response);
            return;
        }

        rateLimiter.recordSuccess(remoteAddress);
        authenticateAsAdministrator();
        filterChain.doFilter(request, response);
    }

    /**
     * Answers 429 to a locked-out address.
     *
     * @param request  current HTTP request
     * @param response current HTTP response
     * @throws IOException when the response body cannot be written
     */
    private void writeRateLimited(HttpServletRequest request, HttpServletResponse response) throws IOException {
        writeProblemResponse(
            request,
            response,
            HttpStatus.TOO_MANY_REQUESTS,
            "ADMIN_KEY_RATE_LIMITED",
            "Too many invalid administrator key attempts. Try again later."
        );
    }

    /**
     * Marks the current request as coming from the administrator.
     *
     * <p>The key itself is never stored as credentials: the security context is exposed to
     * downstream components and to error reporting, and the administrator key is the single secret
     * protecting every write operation in this API.</p>
     */
    private void authenticateAsAdministrator() {
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(
            ADMIN_PRINCIPAL,
            null,
            List.of(new SimpleGrantedAuthority(ADMIN_ROLE))
        );

        SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
        securityContext.setAuthentication(authentication);
        SecurityContextHolder.setContext(securityContext);
    }

    /**
     * Compares the supplied key against the configured one in constant time.
     *
     * <p>A plain {@code equals} would return as soon as two bytes differ, letting a caller time
     * repeated requests to recover the key one character at a time.
     *
     * @param providedApiKey key supplied by the caller
     * @return {@code true} when both keys are equal
     */
    private boolean matchesExpectedKey(String providedApiKey) {
        return MessageDigest.isEqual(
            providedApiKey.getBytes(StandardCharsets.UTF_8),
            expectedApiKey.getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Answers with a problem response in the shape {@link ApiErrorResponse} gives every API error.
     *
     * @param request  current HTTP request
     * @param response current HTTP response
     * @param status   HTTP status
     * @param code     application error code
     * @param detail   caller-facing explanation
     * @throws IOException when the response body cannot be written
     */
    private void writeProblemResponse(
        HttpServletRequest request,
        HttpServletResponse response,
        HttpStatus status,
        String code,
        String detail
    ) throws IOException {
        ApiErrorResponse body = ApiErrorResponse.of(status, code, detail, request.getRequestURI(), clock.instant());
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
