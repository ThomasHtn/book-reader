package io.github.thomashtn.bookreader.catalogue.client;

import io.github.thomashtn.bookreader.catalogue.config.CatalogueProperties;
import io.github.thomashtn.bookreader.conversion.EpubRejectedException;
import io.github.thomashtn.bookreader.conversion.EpubRejectedException.Reason;
import io.github.thomashtn.bookreader.shared.exception.ResourceNotFoundException;
import io.netty.channel.ChannelOption;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import org.springframework.core.io.buffer.DataBufferLimitException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;
import reactor.netty.http.client.HttpClient;
import reactor.util.retry.Retry;

/**
 * HTTP client of the OPDS catalogue: short timeouts, one retry on transient failures.
 */
@Component
public class OpdsCatalogueClient {

    /**
     * Identifies the application to the catalogue site.
     */
    static final String USER_AGENT = "book-reader/1.0 (+https://book-reader.thomashtn.dev)";

    private static final Duration RETRY_DELAY = Duration.ofMillis(300);

    private final WebClient webClient;

    /**
     * Creates the client.
     *
     * @param builder    Spring's WebClient builder, cloned so its defaults stay untouched
     * @param properties catalogue settings
     */
    public OpdsCatalogueClient(WebClient.Builder builder, CatalogueProperties properties) {
        HttpClient httpClient = HttpClient.create()
            .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, Math.toIntExact(properties.connectTimeout().toMillis()))
            .responseTimeout(properties.readTimeout())
            // The EPUB link redirects to a static file.
            .followRedirect(true);
        this.webClient = builder.clone()
            .baseUrl(properties.baseUrl().toString())
            .defaultHeader(HttpHeaders.USER_AGENT, USER_AGENT)
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .codecs(codecs -> codecs.defaultCodecs()
                .maxInMemorySize(Math.toIntExact(properties.maxEpubSize().toBytes())))
            .build();
    }

    /**
     * Relays a search to the OpenSearch endpoint of the feed.
     *
     * @param query query as typed; accents are stripped before sending
     * @return entries offering an EPUB, first result page only
     * @throws CatalogueUnavailableException when the site does not answer
     */
    public List<OpdsEntry> search(String query) {
        String feed = withRetry(webClient.get()
            .uri(uri -> uri.path("/opds/feed.php")
                .queryParam("mode", "search")
                .queryParam("query", "{query}")
                .build(CatalogueQuery.normalize(query)))
            .retrieve()
            .bodyToMono(String.class))
            .onErrorMap(OpdsCatalogueClient::isTransportFailure, OpdsCatalogueClient::unavailable)
            .block();
        return feed == null ? List.of() : OpdsFeedParser.parse(feed);
    }

    /**
     * Downloads the EPUB of a catalogue book.
     *
     * @param bookNumber number of the book page, {@code details.php?book=<n>}
     * @return EPUB bytes
     * @throws CatalogueUnavailableException when the site does not answer
     * @throws ResourceNotFoundException     when the site has no EPUB for this book
     * @throws EpubRejectedException         when the file exceeds the size limit
     * @throws CatalogueRefusedException     when the site answers with a web page, as when it bans the address
     */
    public byte[] downloadEpub(int bookNumber) {
        byte[] epub = withRetry(webClient.get()
            .uri(uri -> uri.path("/newsendbook.php")
                .queryParam("id", bookNumber)
                .queryParam("format", "epub")
                .build())
            .exchangeToMono(OpdsCatalogueClient::readEpub))
            .onErrorMap(OpdsCatalogueClient::isTooLarge,
                error -> new EpubRejectedException(Reason.TOO_LARGE, "Catalogue EPUB exceeds the size limit"))
            .onErrorMap(OpdsCatalogueClient::isClientError,
                error -> new ResourceNotFoundException("The catalogue has no EPUB for this book."))
            .onErrorMap(OpdsCatalogueClient::isTransportFailure, OpdsCatalogueClient::unavailable)
            .block();
        return epub == null ? new byte[0] : epub;
    }

    /**
     * Reads the EPUB body, refusing the HTML warning page the site serves with a 200 once it bans an address.
     */
    private static Mono<byte[]> readEpub(ClientResponse response) {
        if (response.statusCode().isError()) {
            return response.createError();
        }
        Optional<MediaType> contentType = response.headers().contentType();
        if (contentType.isPresent() && MediaType.TEXT_HTML.isCompatibleWith(contentType.get())) {
            return response.releaseBody().then(Mono.error(new CatalogueRefusedException(contentType.get().toString())));
        }
        return response.bodyToMono(byte[].class);
    }

    private static <T> Mono<T> withRetry(Mono<T> call) {
        return call.retryWhen(Retry.fixedDelay(1, RETRY_DELAY)
            .filter(OpdsCatalogueClient::isTransient)
            .onRetryExhaustedThrow((spec, signal) -> signal.failure()));
    }

    private static boolean isTransient(Throwable error) {
        return error instanceof WebClientRequestException
            || error instanceof WebClientResponseException response && response.getStatusCode().is5xxServerError();
    }

    private static boolean isTooLarge(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof DataBufferLimitException) {
                return true;
            }
        }
        return false;
    }

    private static boolean isClientError(Throwable error) {
        return error instanceof WebClientResponseException response && response.getStatusCode().is4xxClientError();
    }

    private static boolean isTransportFailure(Throwable error) {
        return error instanceof WebClientRequestException || error instanceof WebClientResponseException;
    }

    private static Throwable unavailable(Throwable error) {
        return new CatalogueUnavailableException("Catalogue unavailable: " + error.getMessage(), error);
    }
}
