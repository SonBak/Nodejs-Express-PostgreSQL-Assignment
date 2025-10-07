CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    join_date DATE DEFAULT NOW()
);

CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    title VARCHAR(50) NOT NULL,
    genre VARCHAR(50) NOT NULL
);

CREATE TABLE scores (
    id SERIAL PRIMARY KEY,
    player_id INT,
    FOREIGN KEY (player_id) REFERENCES players(id),
    game_id INT,
    FOREIGN KEY (game_id) REFERENCES games(id),
    score INT,
    date_played DATE
);