
const express = require("express");
const mysql = require("mysql8");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Root",
    database: "school"
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }

    console.log("Connected to MySQL");

    app.listen(3000, () => {
        console.log("Server running at http://localhost:3000");
    });
});

// GET all students
app.get("/students", (req, res) => {
    db.query("SELECT * FROM student", (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(result);
    });
});

// GET one student
app.get("/students/:sno", (req, res) => {
    db.query(
        "SELECT * FROM student WHERE student_id = ?",
        [req.params.sno],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (result.length === 0) {
                return res.status(404).json({ error: "Student not found" });
            }

            res.json(result[0]);
        }
    );
});

// CREATE student
app.post("/students", (req, res) => {
    const { sno, name, total } = req.body;

    if (sno == null || !String(name ?? "").trim() ||
        total == null || !Number.isFinite(Number(total)) ||
        Number(total) < 0) {
        return res.status(400).json({ error: "Invalid student details" });
    }

    db.query(
        "INSERT INTO student (student_id, student_name, total) VALUES (?, ?, ?)",
        [sno, String(name).trim(), Number(total)],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.status(201).json({
                message: "Student inserted",
                studentId: sno
            });
        }
    );
});

// UPDATE student
app.put("/students/:sno", (req, res) => {
    const { name, total } = req.body;

    if (!String(name ?? "").trim() ||
        total == null || !Number.isFinite(Number(total)) ||
        Number(total) < 0) {
        return res.status(400).json({ error: "Invalid student details" });
    }

    db.query(
        "UPDATE student SET student_name = ?, total = ? WHERE student_id = ?",
        [String(name).trim(), Number(total), req.params.sno],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Student not found" });
            }

            res.json({ message: "Student updated" });
        }
    );
});

// DELETE student
app.delete("/students/:sno", (req, res) => {
    db.query(
        "DELETE FROM student WHERE student_id = ?",
        [req.params.sno],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: "Student not found" });
            }

            res.json({ message: "Student deleted" });
        }
    );
});
