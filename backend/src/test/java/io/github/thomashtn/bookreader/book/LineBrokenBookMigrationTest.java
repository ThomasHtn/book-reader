package io.github.thomashtn.bookreader.book;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import db.migration.V6__Reflow_line_broken_books;
import io.github.thomashtn.bookreader.book.repository.BookRepository;
import io.github.thomashtn.bookreader.support.PostgreSqlIntegrationTest;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Collections;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.api.migration.Context;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * Specifies the V6 migration: books stored cut line by line get their paragraphs back, others stay.
 */
class LineBrokenBookMigrationTest extends PostgreSqlIntegrationTest {

    /**
     * One printed line of a paragraph, long and without a sentence end.
     */
    private static final String FULL = "Il marchait le long de la rivière en regardant les bateaux";

    /**
     * Last line of a paragraph: short, ending a sentence.
     */
    private static final String LAST = "et rentra chez lui.";

    /**
     * Connections for the insertions, the migration and the checks.
     */
    @Autowired
    private DataSource dataSource;

    /**
     * Repository emptied before each test.
     */
    @Autowired
    private BookRepository repository;

    @BeforeEach
    void emptyLibrary() {
        repository.deleteAll();
    }

    @Test
    @DisplayName("Rejoins the lines of a book stored one per block, and leaves a normal book alone")
    void reflowsLineBrokenBooks() throws Exception {
        String line = "{\"kind\":\"paragraph\",\"text\":\"%s\"}";
        String paragraph = String.join(",", Collections.nCopies(3, line.formatted(FULL))) + ","
            + line.formatted(LAST);
        String broken = "[" + String.join(",", Collections.nCopies(20, paragraph)) + "]";
        String normal = "[" + String.join(",", Collections.nCopies(60, line.formatted("Une phrase entière."))) + "]";
        UUID brokenId = insert(broken, 80);
        UUID normalId = insert(normal, 60);

        try (Connection connection = dataSource.getConnection()) {
            Context context = mock(Context.class);
            when(context.getConnection()).thenReturn(connection);
            new V6__Reflow_line_broken_books().migrate(context);
        }

        assertThat(blockCount(brokenId)).isEqualTo(20);
        assertThat(firstText(brokenId)).isEqualTo(FULL + " " + FULL + " " + FULL + " " + LAST);
        assertThat(blockCount(normalId)).isEqualTo(60);
    }

    /**
     * Inserts an uploaded book with the given content.
     *
     * @param content    JSON array of blocks
     * @param blockCount number of blocks
     * @return identifier of the book
     * @throws Exception when the insertion fails
     */
    private UUID insert(String content, int blockCount) throws Exception {
        UUID id = UUID.randomUUID();
        try (
            Connection connection = dataSource.getConnection();
            PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO book (id, title, author, source, content, block_count, active, activated_at, created_at)"
                    + " VALUES (?, 'Titre', 'Auteur', 'upload', ?::jsonb, ?, true, now(), now())"
            )
        ) {
            insert.setObject(1, id);
            insert.setString(2, content);
            insert.setInt(3, blockCount);
            insert.executeUpdate();
        }
        return id;
    }

    /**
     * Reads the stored block count of a book.
     *
     * @param id book identifier
     * @return block count column
     * @throws Exception when the query fails
     */
    private int blockCount(UUID id) throws Exception {
        return Integer.parseInt(query("SELECT block_count FROM book WHERE id = ?", id));
    }

    /**
     * Reads the text of the first block of a book.
     *
     * @param id book identifier
     * @return text of the first block
     * @throws Exception when the query fails
     */
    private String firstText(UUID id) throws Exception {
        return query("SELECT content -> 0 ->> 'text' FROM book WHERE id = ?", id);
    }

    /**
     * Runs a query returning one value for a book.
     *
     * @param sql query with one parameter, the book identifier
     * @param id  book identifier
     * @return the value as text
     * @throws Exception when the query fails
     */
    private String query(String sql, UUID id) throws Exception {
        try (
            Connection connection = dataSource.getConnection();
            PreparedStatement select = connection.prepareStatement(sql)
        ) {
            select.setObject(1, id);
            try (ResultSet rows = select.executeQuery()) {
                rows.next();
                return rows.getString(1);
            }
        }
    }
}
