require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// Import Mongoose Models
const User = require('./models/user');
const UserRegistration = require('./models/registration');

// Middleware
app.set("view engine", "ejs");
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 🔐 Middleware to Verify JWT Token
const requireAuth = async (req, res, next) => {
    const token = req.cookies.token; // Read token from cookies
    if (!token) return res.status(401).json({ error: "Access Denied. No token provided." });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid Token" });
    }
};


// 📌 MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ MongoDB connected successfully'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// 🌟 Routes
// ✅ Login Page
app.get('/', (req, res) => {
    res.render('login');
});

// ✅ Login Route (JWT Auth)
const cookieParser = require('cookie-parser');
app.use(cookieParser()); // Add this middleware at the top

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: "Username and password are required" });

        const user = await UserRegistration.findOne({ name: username });
        if (!user) return res.status(400).json({ error: "Invalid username or password" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid username or password" });

        // Generate JWT Token
        const token = jwt.sign({ id: user._id, name: user.name }, JWT_SECRET, { expiresIn: "1h" });

        // Store JWT in HTTP-only cookie
        res.cookie("token", token, { httpOnly: true, secure: false, maxAge: 3600000 });

        res.redirect('/dashboard'); // Redirect after storing the token
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Registration Page
app.get('/register', (req, res) => {
    res.render('registration');
});

// ✅ Registration Route
app.post('/register', async (req, res) => {
    try {
        const { name, email, password, confirm_password } = req.body;

        if (!name || !email || !password || !confirm_password) return res.status(400).json({ error: "All fields are required" });
        if (password !== confirm_password) return res.status(400).json({ error: "Passwords do not match" });

        let existingUser = await UserRegistration.findOne({ email });
        if (existingUser) return res.status(400).json({ error: "Email already registered" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await UserRegistration.create({ name, email, password: hashedPassword });
        console.log("User created successfully:", newUser);

        res.status(201).json({ message: "Registration successful. Please login." });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Protected Dashboard Route (Requires Auth)
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        let allText = await User.find().sort({ Currentdate: -1 }).populate('user', 'name');
        res.render('index', { username: req.user.name,
                allText });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Text Editor Page
app.get('/editors', requireAuth, (req, res) => {
    res.render('text_editor');
});

// ✅ Save Text Content
app.post('/save', requireAuth, async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) return res.status(400).json({ error: "Title and content are required" });

        await User.create({ title, content, user: req.user.id });
        res.status(201).json({ message: "Content saved successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Delete Text Content
app.get('/delete/:id', requireAuth, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/edit/:id', requireAuth, async (req, res) => {
    try {
        const text = await User.findById(req.params.id);
        if (!text) return res.status(404).json({ error: "Text not found" });

        res.render('edit', { text });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// ✅ Update Text Content
app.put('/update/:id', requireAuth, async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) return res.status(400).json({ error: "Content is required" });

        let updatedText = await User.findByIdAndUpdate(req.params.id, { content }, { new: true });
        if (!updatedText) return res.status(404).json({ error: "Text not found" });

        res.json({ message: "Updated successfully", updatedText });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ View Text Content
app.get('/view/:id', requireAuth, async (req, res) => {
    try {
        const text = await User.findById(req.params.id);
        if (!text) return res.status(404).json({ error: "Text not found" });

        res.render('view', { text });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// 🌍 Start the Server
if (require.main === module) {
    app.listen(port, () => {
        console.log(`🚀 Server running at http://localhost:${port}`);
    });
}
