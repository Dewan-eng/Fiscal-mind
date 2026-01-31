const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const SECRET_KEY = "my_super_secret_key_change_later"; // In production, put this in .env

// Middleware
app.use(cors());
app.use(express.json());

// Database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- AUTHENTICATION MIDDLEWARE ---
// This function checks if the user has a valid "Badge" (Token)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401); // No token? Kick them out.

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403); // Invalid token? Kick them out.
        req.user = user; // Attach user info to the request
        next();
    });
};

// --- ROUTES ---

// 1. REGISTER (New User)
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Hash the password (Encryption)
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = await pool.query(
            'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
            [email, hashedPassword]
        );
        res.json(newUser.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ error: "Email already exists" });
        res.status(500).json({ error: "Server Error" });
    }
});

// 2. LOGIN (Get Token)
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Find user
        const users = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (users.rows.length === 0) return res.status(400).json({ error: "User not found" });

        // Check password
        const validPassword = await bcrypt.compare(password, users.rows[0].password);
        if (!validPassword) return res.status(400).json({ error: "Invalid password" });

        // Generate Token (The "Badge")
        const token = jwt.sign({ id: users.rows[0].id, email: users.rows[0].email }, SECRET_KEY);
        res.json({ token, email: users.rows[0].email });

    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// 3. GET TRANSACTIONS (Secure: Only fetch YOUR data)
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC', 
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// 4. ADD TRANSACTION (Updated with Category)
app.post('/api/transactions', authenticateToken, async (req, res) => {
    // We now extract 'category' from the request
    const { description, amount, type, category } = req.body;
    try {
        const newTx = await pool.query(
            'INSERT INTO transactions (description, amount, type, user_id, category) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [description, amount, type, req.user.id, category]
        );
        res.json(newTx.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server Error" });
    }
});

// 5. DELETE TRANSACTION (Secure: Only delete YOUR data)
app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (result.rowCount === 0) return res.status(404).json({ error: "Not found or not authorized" });
        res.json({ message: "Deleted" });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

app.listen(port, () => {
    console.log(`🔒 Secure Server running on port ${port}`);
});