import express from "express";
import pg from "pg";
import dotenv from "dotenv";
const PORT = 3000;

dotenv.config();
const app = express();
const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
});

app.use(express.json());
// app.get("/", (req, res) => {
//   res.send("Welcome to this NodeJS and PostgreSQL lesson.");
// });

app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM athletes");
    res.status(200).json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/athletes", async (req, res) => {
  const { name, sport, age } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO athletes (name, sport, age) VALUES ($1, $2, $3) RETURNING *",
      [name, sport, age]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put("/athletes/:id", async (req, res) => {
  const { id } = req.params;
  const { name, sport, age } = req.body;
  try {
    const result = await pool.query(
      "UPDATE athletes SET name = $1, sport = $2, age = $3 WHERE id = $4 RETURNING *",
      [name, sport, age, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send("Athlete not found");
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete("/athletes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM athletes WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).send("Athlete not found");
    }
    res.send("Athlete deleted successfully");
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(3000, () => {
  console.log(`Server is running on PORT ${PORT}`);
});
