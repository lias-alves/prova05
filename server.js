const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Enable CORS and parse JSON request bodies
app.use(cors());
app.use(express.json());

// Serve static frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));
app.use('/views', express.static(path.join(__dirname, 'views')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/controllers', express.static(path.join(__dirname, 'controllers')));
app.use('/services', express.static(path.join(__dirname, 'services')));

// Explicitly serve index.html for the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Set up SQLite database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Initialize tables
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        role TEXT,
        createdAt TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        date TEXT,
        endDate TEXT,
        location TEXT,
        category TEXT,
        image TEXT,
        capacity INTEGER,
        registered INTEGER,
        instructor TEXT,
        price REAL,
        createdBy TEXT,
        createdAt TEXT
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS registrations (
        userId TEXT,
        eventId TEXT,
        registeredAt TEXT,
        PRIMARY KEY (userId, eventId)
      )`);
    });

    // Seed data if empty
    seedDatabaseIfNeeded();
  }
});

function seedDatabaseIfNeeded() {
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (row && row.count === 0) {
      console.log("Seeding users...");
      try {
        const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'models', 'users.json'), 'utf-8'));
        const stmt = db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)");
        usersData.forEach(u => {
          stmt.run(u.id, u.name, u.email, u.password, u.role, u.createdAt);
        });
        stmt.finalize();
      } catch (e) { console.error("Could not seed users", e); }
    }
  });

  db.get("SELECT COUNT(*) as count FROM events", (err, row) => {
    if (row && row.count === 0) {
      console.log("Seeding events...");
      try {
        const eventsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'models', 'events.json'), 'utf-8'));
        const stmt = db.prepare("INSERT INTO events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        eventsData.forEach(e => {
          stmt.run(e.id, e.title, e.description, e.date, e.endDate || e.date, e.location, e.category, e.image, parseInt(e.capacity), parseInt(e.registered), e.instructor, parseFloat(e.price), e.createdBy || null, e.createdAt || new Date().toISOString());
        });
        stmt.finalize();
      } catch (e) { console.error("Could not seed events", e); }
    }
  });
}

// ---------------------------------------------
// AUTH ENDPOINTS
// ---------------------------------------------

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Faltam dados de login.' });

  db.get("SELECT * FROM users WHERE email = ? COLLATE NOCASE", [email], (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro no servidor.' });
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    if (user.password !== password) return res.status(401).json({ success: false, message: 'Senha incorreta.' });

    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  });
});

app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ success: false, message: 'Preencha todos os campos.' });

  const emailLower = email.trim().toLowerCase();
  
  db.get("SELECT * FROM users WHERE email = ?", [emailLower], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro no servidor.' });
    if (row) return res.status(400).json({ success: false, message: 'Este e-mail já está cadastrado.' });

    const id = `usr-${Date.now().toString(36).toUpperCase()}`;
    const createdAt = new Date().toISOString();
    const role = 'user';

    db.run("INSERT INTO users (id, name, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)", [id, name.trim(), emailLower, password, role, createdAt], function(err) {
       if (err) return res.status(500).json({ success: false, message: 'Erro ao criar usuário.' });
       
       const safeUser = { id, name: name.trim(), email: emailLower, role, createdAt };
       res.json({ success: true, user: safeUser });
    });
  });
});

// ---------------------------------------------
// EVENTS ENDPOINTS
// ---------------------------------------------

app.get('/api/events', (req, res) => {
  const { category, search } = req.query;
  
  let query = "SELECT * FROM events";
  let params = [];
  let conditions = [];

  if (category && category !== 'todos') {
    conditions.push("category = ?");
    params.push(category);
  }

  if (search) {
    conditions.push("(title LIKE ? OR description LIKE ? OR location LIKE ?)");
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  
  query += " ORDER BY date ASC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao buscar eventos.' });
    res.json({ success: true, data: rows });
  });
});

app.get('/api/events/:id', (req, res) => {
  db.get("SELECT * FROM events WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro no servidor.' });
    if (!row) return res.status(404).json({ success: false, message: 'Evento não encontrado.' });
    res.json({ success: true, data: row });
  });
});

app.post('/api/events', (req, res) => {
  const { title, description, date, endDate, location, category, image, capacity, instructor, price, createdBy } = req.body;
  
  if (!title || title.trim().length < 5) return res.status(400).json({ success: false, message: 'O título deve ter pelo menos 5 caracteres.' });
  if (!date) return res.status(400).json({ success: false, message: 'A data do evento é obrigatória.' });
  if (new Date(date) < new Date()) return res.status(400).json({ success: false, message: 'A data do evento não pode estar no passado.' });
  if (!location || location.trim().length < 3) return res.status(400).json({ success: false, message: 'O local deve ter pelo menos 3 caracteres.' });
  if (!capacity || capacity < 1) return res.status(400).json({ success: false, message: 'A capacidade deve ser pelo menos 1.' });

  const id = `evt-${Date.now().toString(36).toUpperCase()}`;
  const createdAt = new Date().toISOString();
  
  const finalDesc = description ? description.trim() : 'Sem descrição.';
  const finalEndDate = endDate || date;
  const finalCat = category || 'academico';
  const finalImg = image && image.trim() !== '' ? image.trim() : 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';
  const finalInst = instructor ? instructor.trim() : 'A definir';
  const finalPrice = parseFloat(price) || 0;
  const finalCap = parseInt(capacity, 10);

  const sql = `INSERT INTO events (id, title, description, date, endDate, location, category, image, capacity, registered, instructor, price, createdBy, createdAt) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const params = [id, title.trim(), finalDesc, date, finalEndDate, location.trim(), finalCat, finalImg, finalCap, 0, finalInst, finalPrice, createdBy, createdAt];

  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ success: false, message: 'Erro ao criar evento.' });
    
    db.get("SELECT * FROM events WHERE id = ?", [id], (err, row) => {
       res.json({ success: true, data: row, message: 'Evento criado com sucesso! 🎉' });
    });
  });
});

app.delete('/api/events/:id', (req, res) => {
  const { userId, userRole } = req.body;
  const eventId = req.params.id;

  db.get("SELECT * FROM events WHERE id = ?", [eventId], (err, event) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro no servidor.' });
    if (!event) return res.status(404).json({ success: false, message: 'Evento não encontrado.' });

    if (userRole !== 'admin' && event.createdBy !== userId) {
      return res.status(403).json({ success: false, message: 'Sem permissão para excluir este evento.' });
    }

    db.run("DELETE FROM events WHERE id = ?", [eventId], function(err) {
      if (err) return res.status(500).json({ success: false, message: 'Erro ao excluir.' });
      res.json({ success: true, message: 'Evento excluído com sucesso.' });
    });
  });
});

// ---------------------------------------------
// REGISTRATIONS ENDPOINTS
// ---------------------------------------------

app.post('/api/events/:id/register', (req, res) => {
  const eventId = req.params.id;
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ success: false, message: 'Usuário não informado.' });

  db.get("SELECT * FROM events WHERE id = ?", [eventId], (err, event) => {
    if (err) return res.status(500).json({ success: false, message: 'Erro no servidor.' });
    if (!event) return res.status(404).json({ success: false, message: 'Evento não encontrado.' });
    
    if (event.registered >= event.capacity) {
      return res.status(400).json({ success: false, message: 'Evento lotado. Não há vagas disponíveis.' });
    }

    db.get("SELECT * FROM registrations WHERE userId = ? AND eventId = ?", [userId, eventId], (err, reg) => {
      if (err) return res.status(500).json({ success: false });
      if (reg) return res.status(400).json({ success: false, message: 'Você já está inscrito neste evento.' });

      db.run("INSERT INTO registrations (userId, eventId, registeredAt) VALUES (?, ?, ?)", [userId, eventId, new Date().toISOString()], function(err) {
        if (err) return res.status(500).json({ success: false, message: 'Erro ao realizar inscrição.' });

        db.run("UPDATE events SET registered = registered + 1 WHERE id = ?", [eventId], function(err) {
           res.json({ success: true, message: 'Inscrição realizada com sucesso! 🎉' });
        });
      });
    });
  });
});

app.get('/api/events/:id/check-registration', (req, res) => {
  const eventId = req.params.id;
  const { userId } = req.query;

  if (!userId) return res.json({ success: true, registered: false });

  db.get("SELECT * FROM registrations WHERE userId = ? AND eventId = ?", [userId, eventId], (err, row) => {
    if (err) return res.status(500).json({ success: false });
    res.json({ success: true, registered: !!row });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
