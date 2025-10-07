import express from "express";
import pg from "pg";
import dotenv from "dotenv";
import { z } from "zod";
const PORT = 3000;

dotenv.config();
const app = express();
const { Pool } = pg;

const envSchema = z.object({
  DB_USER: z.string(),
  DB_HOST: z.string(),
  DB_DATABASE: z.string(),
  DB_PASSWORD: z.string(),
});

const validatedEnv = envSchema.safeParse(process.env);
if (!validatedEnv.success) {
  console.error(
    "Invalid environment variables:",
    z.treeifyError(validatedEnv.error)
  );
  process.exit(1);
}

const { DB_USER, DB_HOST, DB_DATABASE, DB_PASSWORD } = validatedEnv.data;

const pool = new Pool({
  user: DB_USER,
  host: DB_HOST,
  database: DB_DATABASE,
  password: DB_PASSWORD,
});

const playersSchema = z.object({
  name: z.string().min(2).max(50),
  title: z.string().min(1).max(50),
  genre: z.string().min(1).max(50),
  score: z.number().min(0).max(500),
});

app.use(express.json());
// app.get("/", (req, res) => {
//   res.send("Welcome to this NodeJS and PostgreSQL lesson.");
// });

app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM players");
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/players", async (req, res) => {
  const validatedPlayers = playersSchema.safeParse(req.body);
  if (!validatedPlayers.success) {
    return res.status(400).json({ error: validatedPlayers.error });
  }
  const { name, title, genre, score } = validatedPlayers.data;
  try {
    const result = await pool.query(
      "INSERT INTO players (name, title, genre, score) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, title, genre, score]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put("/players/:id", async (req, res) => {
  const { id } = req.params;
  const { name, title, score } = req.body;
  try {
    const result = await pool.query(
      "UPDATE players SET name = $1, title = $2, score = $3 WHERE id = $4 RETURNING *",
      [name, title, score, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send("Player not found");
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete("/players/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM players WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send("Player not found");
    }
    res.send("Player deleted successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 1. List all players and their scores
app.get("/players-scores", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT players.name AS player_name, games.title AS game_title, scores.score
      FROM scores
      INNER JOIN players ON scores.player_id = players.id
      INNER JOIN games ON scores.game_id = games.id;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 2. Find high scores (top 3 players, total scores, descending order)
app.get("/high-scores", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT players.name AS player_name, SUM(scores.score) AS total_score
      FROM scores
      INNER JOIN players ON scores.player_id = players.id
      GROUP BY players.id, players.name
      ORDER BY total_score DESC
      LIMIT 3;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 3. Players who didn't play any games
app.get("/inactive-players", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT players.name AS player_name
      FROM players
      LEFT OUTER JOIN scores ON players.id = scores.player_id
      WHERE scores.id IS NULL;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 4. Find popular game genres
app.get("/popular-genres", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT games.genre, COUNT(scores.id) AS play_count
      FROM scores
      INNER JOIN games ON scores.game_id = games.id
      GROUP BY games.genre
      ORDER BY play_count DESC
      LIMIT 1;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 5. Recently joined players (last 30 days)
app.get("/recent-players", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT name, join_date FROM players
      WHERE join_date >= CURRENT_DATE - INTERVAL '30 days';
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get("/favorite-games", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.name AS player_name, g.title AS game_title
      FROM (
        SELECT
          player_id,
          game_id,
          COUNT(*) AS play_count,
          ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY COUNT(*) DESC) AS rank
        FROM scores
        GROUP BY player_id, game_id
      ) AS ranked
      JOIN players p ON ranked.player_id = p.id
      JOIN games g ON ranked.game_id = g.id
      WHERE ranked.rank = 1;
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(3000, () => {
  console.log(`Server is running on PORT ${PORT}`);
});
