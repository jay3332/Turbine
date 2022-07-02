CREATE TABLE IF NOT EXISTS tokens (
    user_id TEXT NOT NULL,
    token TEXT NOT NULL PRIMARY KEY,
    CONSTRAINT user_id_fk
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);