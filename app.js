const express = require('express');
const app = express();
const path = require('path');
const port = 3000; // Optional, not needed for Vercel

// Require user model
const userModel = require('./models/user');

// Set view engine to ejs
app.set("view engine", "ejs");

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route to the editors page
app.get('/', async (req, res) => {
    let allText = await userModel.find();
    let allTime = { Currentdate: new Date().toLocaleString() };
    res.render('index', { allText, allTime });
});

app.get('/editors', (req, res) => {
    res.render('text_editor');
});

// Route to save the content of editor
app.post('/save', async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: "Title and content are required" });
        }
        await userModel.create({ title, content });
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route to delete the content of editor
app.get('/delete/:id', async (req, res) => {
    try {
        const id = req.params.id;
        await userModel.findByIdAndDelete(id);
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route to edit content
app.get('/edit/:id', async (req, res) => {
    try {
        const text = await userModel.findById(req.params.id);
        if (!text) {
            return res.status(404).send("Text not found");
        }
        res.render('edit', { text });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});

// Route to update content
app.post('/update/:id', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: "Content is required" });
        }
        let textUpdate = await userModel.findByIdAndUpdate(req.params.id, { content }, { new: true });
        if (!textUpdate) {
            return res.status(404).json({ error: "Text not found" });
        }
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Route to view content
app.get('/view/:id', async (req, res) => {
    try {
        const text = await userModel.findById(req.params.id);
        if (!text) {
            return res.status(404).send("Text not found");
        }
        res.render('view', { text });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
});


// Start the server
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}
// Export the app as a serverless function for Vercel
module.exports = app;
