const express = require('express');
const mysql = require('mysql');
const app = express();
const PORT = 3000;

const db = mysql.createConnection({
  host: 'db',  // Docker Compose will set up a network alias
  user: 'myuser',
  password: 'mypassword',
  database: 'mydb'
});

app.get('/', (req, res) => {
  db.query('SELECT "Welcome to the 2-tier Dockerized App" AS message', (err, results) => {
    if (err) throw err;
    res.send(results[0].message);
  });
});

app.listen(PORT, () => {
  console.log(`Frontend running on http://localhost:${PORT}`);
});

