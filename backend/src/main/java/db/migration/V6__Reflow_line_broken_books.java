package db.migration;

import io.github.thomashtn.bookreader.conversion.LineReflow;
import io.github.thomashtn.bookreader.conversion.model.Block;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.List;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Rebuilds the paragraphs of the books imported before the converter rejoined EPUBs cut at every
 * printed line; every other book is left as it is. Java rather than SQL, since it runs the converter's
 * own rule.
 */
public class V6__Reflow_line_broken_books extends BaseJavaMigration {

    /**
     * Shape of the {@code content} column.
     */
    private static final TypeReference<List<Block>> BLOCKS = new TypeReference<>() {
    };

    /**
     * Reads and writes the blocks as the entity stores them.
     */
    private final JsonMapper mapper = JsonMapper.builder().build();

    /**
     * Rewrites the content and block count of each book cut line by line.
     *
     * @param context Flyway context, holding the migration's connection and transaction
     * @throws Exception when a query fails, which rolls the whole migration back
     */
    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        try (
            Statement select = connection.createStatement();
            ResultSet rows = select.executeQuery("SELECT id, content FROM book");
            PreparedStatement update = connection.prepareStatement(
                "UPDATE book SET content = ?::jsonb, block_count = ? WHERE id = ?"
            )
        ) {
            while (rows.next()) {
                List<Block> blocks = mapper.readValue(rows.getString("content"), BLOCKS);
                List<Block> reflowed = LineReflow.reflow(blocks);
                // The same list back means the book has real paragraphs.
                if (reflowed != blocks) {
                    update.setString(1, mapper.writeValueAsString(reflowed));
                    update.setInt(2, reflowed.size());
                    update.setObject(3, rows.getObject("id"));
                    update.executeUpdate();
                }
            }
        }
    }
}
