const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// MySQL Connection
const connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: ""
});

connection.connect((err) => {
    if (err) {
        console.error("❌ Database connection error:", err);
        process.exit(1);
    }
    console.log("✅ Connected to MySQL database!");
});

// Serve HTML Pages
app.get("/", (req, res) => res.redirect("/signup"));
app.get("/signup", (req, res) => res.sendFile(path.join(__dirname, "public", "signup.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/project_dashboard", (req, res) => res.sendFile(path.join(__dirname, "public", "project_dashboard.html")));
app.get("/task.html", (req, res) => res.sendFile(path.join(__dirname, "public", "task.html")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/about", (req, res) => res.sendFile(path.join(__dirname, "public", "about.html")));

// ✅ SIGNUP
app.post("/signup", (req, res) => {
    const { username, email, phone, password } = req.body;
    if (!username || !email || !phone || !password) {
        return res.status(400).json({ message: "❌ All fields are required!" });
    }

    const sql = "INSERT INTO users (username, email, phone, password) VALUES (?, ?, ?, ?)";
    connection.query(sql, [username, email, phone, password], (err) => {
        if (err) {
            console.error("⚠️ Signup Error:", err);
            return res.status(500).json({ message: "❌ Error signing up." });
        }
        console.log("✅ User signed up successfully!");
        res.redirect("/login");
    });
});

// ✅ LOGIN
app.post("/login", (req, res) => {
    const { email, pswd } = req.body;
    if (!email || !pswd) {
        return res.status(400).json({ message: "❌ Email and password are required!" });
    }

    const sql = "SELECT * FROM users WHERE email = ?";
    connection.query(sql, [email], (err, result) => {
        if (err) {
            console.error("⚠️ Login Error:", err);
            return res.status(500).json({ message: "❌ Error logging in." });
        }
        if (result.length > 0 && pswd === result[0].password) {
            console.log("✅ Login successful!");
            return res.redirect("/project_dashboard");
        }
        console.log("❌ Invalid credentials!");
        res.status(401).send("<script>alert('Invalid email or password!'); window.location.href='/login';</script>");
    });
});

// ✅ GET ALL PROJECTS
app.get("/projects", (req, res) => {
    connection.query("SELECT * FROM projects", (err, results) => {
        if (err) {
            console.error("⚠️ Fetching Projects Error:", err);
            return res.status(500).json({ message: "❌ Error fetching projects." });
        }
        res.json(results);
    });
});

// ✅ ADD NEW PROJECT
app.post("/projects", (req, res) => {
    const { name, description, status } = req.body;
    if (!name || !description || !status) {
        return res.status(400).json({ message: "❌ All fields are required!" });
    }

    const sql = "INSERT INTO projects (name, description, status) VALUES (?, ?, ?)";
    connection.query(sql, [name, description, status], (err) => {
        if (err) {
            console.error("⚠️ MySQL Insert Error:", err);
            return res.status(500).json({ message: "❌ Failed to add project." });
        }
        res.json({ message: "✅ Project added successfully!" });
    });
});

// ✅ DELETE PROJECT
app.delete("/projects/:id", (req, res) => {
    const { id } = req.params;
    connection.query("DELETE FROM projects WHERE id = ?", [id], (err) => {
        if (err) {
            console.error("⚠️ Delete Error:", err);
            return res.status(500).json({ message: "❌ Error deleting project." });
        }
        res.json({ message: "✅ Project deleted successfully!" });
    });
});

// ✅ FETCH ALL TASKS
app.get("/tasks", (req, res) => {
    connection.query("SELECT * FROM tasks", (err, results) => {
        if (err) {
            console.error("❌ Error fetching tasks:", err);
            return res.status(500).json({ error: "Error fetching tasks" });
        }
        res.json(results);
    });
});

// ✅ ADD A NEW TASK
app.post("/tasks", (req, res) => {
    const { task_name, assigned_to, status } = req.body;
    if (!task_name || !assigned_to) {
        return res.status(400).json({ error: "Task Name and Assigned To are required" });
    }

    const query = "INSERT INTO tasks (task_name, assigned_to, status) VALUES (?, ?, ?)";
    connection.query(query, [task_name, assigned_to, status], (err, result) => {
        if (err) {
            console.error("❌ Error adding task:", err);
            return res.status(500).json({ error: "Error adding task" });
        }
        res.json({ id: result.insertId, task_name, assigned_to, status });
    });
});

// ✅ DELETE A TASK
app.delete("/tasks/:id", (req, res) => {
    const taskId = req.params.id;
    connection.query("DELETE FROM tasks WHERE id = ?", [taskId], (err, result) => {
        if (err) {
            console.error("❌ Error deleting task:", err);
            return res.status(500).json({ error: "Error deleting task" });
        }
        res.json({ message: "Task deleted successfully" });
    });
});


// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
    }
});
const upload = multer({ storage });

// Upload API
app.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const filename = req.file.filename;
    const filepath = `uploads/${filename}`;

    // Use 'connection' instead of 'db'
    connection.query("INSERT INTO files (filename, filepath) VALUES (?, ?)", [filename, filepath], (err) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json({ message: "File uploaded successfully" });
    });
});

// Get Uploaded Files API
app.get("/files", (req, res) => {
    // Use 'connection' instead of 'db'
    connection.query("SELECT * FROM files", (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        res.json(results);
    });
});


// Delete File API
app.delete("/delete/:id", (req, res) => {
    const fileId = req.params.id;
    
    connection.query("SELECT * FROM files WHERE id = ?", [fileId], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ message: "File not found" });

        const filePath = results[0].filepath;
        
        // Delete from database
        connection.query("DELETE FROM files WHERE id = ?", [fileId], (err) => {
            if (err) return res.status(500).json({ message: "Database error" });

            // Delete from server
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) console.error("File deletion error:", unlinkErr);
            });

            res.json({ message: "File deleted successfully" });
        });
    });
});
// Start Server
const PORT = 8089;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
