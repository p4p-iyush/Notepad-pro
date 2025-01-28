const express = require('express');
const app = express();
const path = require('path');
const port = 3000;

// Require user model
const userModel = require('./models/user');
const { request } = require('http');

// set view engine to ejs
app.set("view engine", "ejs");

// Middleware to parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Route to the editors page
app.get('/', async (req, res) => {
    let allText = await userModel.find();
    // console.log(allText);

    // Create a new variable for the current date and time
    let allTime = { Currentdate: new Date().toLocaleString() };

    // Pass both allText and allTime to the view
    res.render('index', { allText, allTime });
})


app.get('/editors', (req, res) => {
    res.render('text_editor')
})

// Route to save the content of editor
app.post('/save', async (req, res) => {
    try {
        const { title, content } = req.body;

        if (!title || !content) {
            return res.status(400).json({ error: "Title and content are required" });
        }
        let textContent = await userModel.create({ title, content });

        res.redirect('/'); // Redirect after saving
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
        res.redirect('/'); // Redirect after deleting
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
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

app.post('/update/:id', async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ error: "Content is required" });
        }

        // Find the text document by its ID and update it
        let textUpdate = await userModel.findByIdAndUpdate(req.params.id, { content }, { new: true });

        if (!textUpdate) {
            return res.status(404).json({ error: "Text not found" });
        }

        // Redirect after saving
        res.redirect('/'); 
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/view/:id',async(req,res)=>{
    try{
        const text =await userModel.findById(req.params.id);
        if(!text){
            return res.status(404).send("Text not found");
        }
        res.render('view', { text });
    }
    catch(error){
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
})




// Start the server
app.listen(port, () => {
    console.log(`Server started at http://localhost:${port}`);
});