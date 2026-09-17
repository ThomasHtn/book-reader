package io.github.thomashtn.bookreader.shared.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

/**
 * Adds ETags to API responses so the reader's ten-second polling mostly costs a 304.
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
        FilterRegistrationBean<ShallowEtagHeaderFilter> registration =
            new FilterRegistrationBean<>(new ShallowEtagHeaderFilter());
        registration.addUrlPatterns("/api/*");
        return registration;
    }
}
