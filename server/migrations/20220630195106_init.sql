CREATE TABLE IF NOT EXISTS users (
    id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL,
    -- Will be hashed
    password TEXT NOT NULL,
    email TEXT
);

CREATE TABLE IF NOT EXISTS pastes (
    id TEXT NOT NULL PRIMARY KEY,
    author_id TEXT,
    -- Enum member { 0 -> private, 1 -> protected, 2 -> unlisted, 3 -> discoverable }
    visibility SMALLINT NOT NULL,
    -- Will be hashed
    password TEXT,
    CONSTRAINT user_fk
        FOREIGN KEY (author_id)
        REFERENCES users(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS files (
    paste_id TEXT NOT NULL,
    idx SMALLINT NOT NULL,
    content TEXT NOT NULL,
    PRIMARY KEY (paste_id, idx),
    CONSTRAINT paste_fk
        FOREIGN KEY (paste_id)
        REFERENCES pastes(id)
        ON DELETE CASCADE
);
