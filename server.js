require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcryptjs');
const path = require('path');

const User = require('./models/User');
const Document = require('./models/Document');

const app = express();

// ─── DB Connection ───────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ DB Error:', err));

// ─── App Config ──────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

// ─── Global Locals ───────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user    = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error   = req.flash('error');
  next();
});

// ─── Auth Middleware ─────────────────────────────────────
function isLoggedIn(req, res, next) {
  if (req.session.user) return next();
  req.flash('error', 'Please login first');
  res.redirect('/login');
}

// ═══════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════

// GET /
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.redirect('/login');
});

// GET /register
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('register');
});

// POST /register
app.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    if (!username || !password)
      return res.render('register', { error: 'All fields required' });

    if (password !== confirmPassword)
      return res.render('register', { error: 'Passwords do not match' });

    if (password.length < 6)
      return res.render('register', { error: 'Password must be at least 6 characters' });

    const exists = await User.findOne({ username });
    if (exists)
      return res.render('register', { error: 'Username already taken' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hash });

    req.session.user = { id: user._id, username: user.username };
    req.flash('success', 'Account created!');
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('register', { error: 'Something went wrong' });
  }
});

// GET /login
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login');
});

// POST /login
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user)
      return res.render('login', { error: 'Invalid username or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.render('login', { error: 'Invalid username or password' });

    req.session.user = { id: user._id, username: user.username };
    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.render('login', { error: 'Something went wrong' });
  }
});

// GET /logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ═══════════════════════════════════════════════════════
//  DASHBOARD ROUTES
// ═══════════════════════════════════════════════════════

// GET /dashboard
app.get('/dashboard', isLoggedIn, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.session.user.id })
      .sort({ pinned: -1, updatedAt: -1 });
    res.render('dashboard', { documents });
  } catch (err) {
    console.error(err);
    res.redirect('/login');
  }
});

// POST /documents — create new document
app.post('/documents', isLoggedIn, async (req, res) => {
  try {
    const { title, visibility, tags } = req.body;
    const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const doc = await Document.create({
      userId:     req.session.user.id,
      title:      title || 'Untitled',
      visibility: visibility || 'private',
      tags:       tagList,
      blocks:     []
    });

    res.json({ success: true, id: doc._id });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
});

// DELETE /documents/:id
app.delete('/documents/:id', isLoggedIn, async (req, res) => {
  try {
    await Document.findOneAndDelete({
      _id:    req.params.id,
      userId: req.session.user.id
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
});

// ═══════════════════════════════════════════════════════
//  EDITOR ROUTES
// ═══════════════════════════════════════════════════════

// GET /editor/:id — open document editor
app.get('/editor/:id', isLoggedIn, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id:    req.params.id,
      userId: req.session.user.id
    });
    if (!doc) return res.redirect('/dashboard');
    res.render('editor', { doc });
  } catch (err) {
    console.error(err);
    res.redirect('/dashboard');
  }
});

// PUT /documents/:id — save document (blocks + meta)
app.put('/documents/:id', isLoggedIn, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id:    req.params.id,
      userId: req.session.user.id
    });
    if (!doc) return res.json({ success: false, error: 'Not found' });

    const { title, visibility, tags, blocks, pinned } = req.body;

    if (title      !== undefined) doc.title      = title;
    if (visibility !== undefined) doc.visibility = visibility;
    if (tags       !== undefined) doc.tags       = tags;
    if (blocks     !== undefined) doc.blocks     = blocks;
    if (pinned     !== undefined) doc.pinned     = pinned;

    await doc.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
});

// ─── Start Server ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);