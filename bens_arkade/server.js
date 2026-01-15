const express = require("express");
const sqlite = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const WebSocket = require("ws");

const app = express();
const db = new sqlite.Database("bossarcade.db");

app.use(express.json());
app.use(express.static("public"));

db.run(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY,
 email TEXT,
 pass TEXT
)`);

db.run(`
CREATE TABLE IF NOT EXISTS scores(
 id INTEGER PRIMARY KEY,
 user INTEGER,
 game TEXT,
 score INTEGER
)`);

app.get("/scores/:game",(req,res)=>{
 db.all("SELECT users.email, score FROM scores JOIN users ON users.id=scores.user WHERE game=? ORDER BY score DESC LIMIT 10",
 [req.params.game],(e,rows)=>{
  res.json(rows);
 });
});

app.post("/score",(req,res)=>{
 const token = req.headers.authorization;
 if(!token) return res.sendStatus(401);

 try{
  const user = jwt.verify(token,"bosskey");
  db.run("INSERT INTO scores(user,game,score) VALUES(?,?,?)",
   [user.id, req.body.game, req.body.score]);
  res.send("OK");
 }catch{
  res.sendStatus(401);
 }
});

app.listen(3000, ()=>console.log("Boss Arcade läuft auf Port 3000"));
