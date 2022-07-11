ALTER TABLE pastes
ADD COLUMN views INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS stars (
    user_id TEXT,
    paste_id TEXT,
    PRIMARY KEY (user_id, paste_id),
    CONSTRAINT user_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,
    CONSTRAINT paste_fk
        FOREIGN KEY (paste_id)
        REFERENCES pastes(id)
        ON DELETE CASCADE
);