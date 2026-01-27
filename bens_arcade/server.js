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

app.post("/register", (req, res) => {
  const { email, pass } = req.body;

  app.post("/leave", (req, res) => {
  console.log("⬅ Spieler hat ein Spiel verlassen");
  res.sendStatus(200);
  res.send("Spiel verlassen");
});


  if(!email || !pass) return res.status(400).send("Email und Passwort erforderlich");

  bcrypt.hash(pass, 10, (err, hash) => {
    if(err) return res.status(500).send("Server-Fehler");

    db.run("INSERT INTO users(email, pass) VALUES(?,?)", [email, hash], (err) => {
      if(err){
        if(err.code === "SQLITE_CONSTRAINT") return res.status(400).send("Email existiert bereits");
        return res.status(500).send("Server-Fehler");
      }
      res.status(200).send("Registrierung erfolgreich");
    });
  });
});



app.post("/login", (req, res) => {
  const { email, pass } = req.body;

  db.get("SELECT * FROM users WHERE email=?", [email], (err, user) => {
    if (err) return res.status(500).send("Server-Fehler");

    if (!user) return res.status(401).send("Falsche Zugangsdaten");

    bcrypt.compare(pass, user.pass, (err, ok) => {
      if (err) return res.status(500).send("Server-Fehler");
      if (!ok) return res.status(401).send("Falsche Zugangsdaten");

      // ✅ Zugang OK
      const token = jwt.sign({ id: user.id }, "bosskey");
      res.status(200).send(token);
    });
  });
});

const http = require("http");

const server = http.createServer(app); // app = dein express()

const wss = new WebSocket.Server({ server });

let players = {};

wss.on("connection", ws => {
  console.log("🟢 Client verbunden");
  const id = Math.random().toString(36).slice(2);

  ws.on("message", msg => {
    const data = JSON.parse(msg);

    if(data.type==="join"){
      console.log("👤 JOIN:", data.name);
      players[id] = { name:data.name, x:130, y:420 };
      sendAll({type:"players",players});
    }

    if(data.type==="move" && players[id]){
      players[id].x = data.x;
      players[id].y = data.y;
      sendAll({type:"players",players});
    }

    if(data.type==="chat"){
      sendAll({type:"chat",name:players[id]?.name,text:data.text});
    }
  });

  ws.on("close",()=>{
    delete players[id];
    sendAll({type:"players",players});
  });
});

function sendAll(data){
  wss.clients.forEach(c=>{
    if(c.readyState===1){
      c.send(JSON.stringify(data));
    }
  });
}

server.listen(3000,()=>{
  console.log("🟢 Server + WebSocket auf Port 3000", "Boss Arcade läuft auf Port 3000");
});
