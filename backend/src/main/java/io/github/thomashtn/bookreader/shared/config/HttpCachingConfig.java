package io.github.thomashtn.bookreader.shared.config;

import io.github.thomashtn.bookreader.shared.security.AdminApiKeyFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

/**
 * Adds ETags and Cache-Control to API responses so the reader's ten-second polling mostly costs a 304.
 */
@Configuration
public class HttpCachingConfig {

    /**
     * Registers the ETag filter on the API; it only acts on successful GET and HEAD responses.
     *
     * @return filter registration limited to {@code /api/*}
     */
    @Bean
    FilterRegistrationBean<ShallowEtagHeaderFilter> etagFilter() {
        ShallowEtagHeaderFilter filter = new ShallowEtagHeaderFilter();
        // Tomcat never compresses a response carrying a strong ETag.
        filter.setWriteWeakETag(true);
        FilterRegistrationBean<ShallowEtagHeaderFilter> registration = new FilterRegistrationBean<>(filter);
        registration.addUrlPatterns("/api/*");
        return registration;
    }

    /**
     * Lets the browser keep public responses and revalidate them on every poll; admin ones are never stored.
     *
     * @return filter registration limited to {@code /api/*}
     */
    @Bean
    FilterRegistrationBean<CacheControlFilter> cacheControlFilter() {
        FilterRegistrationBean<CacheControlFilter> registration =
            new FilterRegistrationBean<>(new CacheControlFilter());
        registration.addUrlPatterns("/api/*");
        return registration;
    }

    /**
     * Sets {@code no-cache} on public API responses and {@code no-store} on administrative ones.
     */
    static final class CacheControlFilter extends OncePerRequestFilter {

        /**
         * Picks the policy with the admin filter's decoded-path matching, so an encoded path such as
         * {@code /api/%61dmin/books} is never stored either.
         *
         * @param request  current HTTP request
         * @param response current HTTP response
         * @param chain    remaining filter chain
         * @throws ServletException when the chain fails
         * @throws IOException      when the chain cannot write the response
         */
        @Override
        protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain
        ) throws ServletException, IOException {
            boolean admin = AdminApiKeyFilter.isAdminRoute(request);
            response.setHeader(HttpHeaders.CACHE_CONTROL, admin ? "no-store" : "no-cache");
            chain.doFilter(request, response);
        }
    }
}
