// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// -----------------
// Register a new user
// -----------------
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'Username, email, and password are required' });
        }

        // Check if user already exists
        db.query('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], async (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err });

            if (results.length > 0) {
                return res.status(400).json({ message: 'User already exists' });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user
            db.query(
                'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
                [username, email, hashedPassword, role || 'user'],
                (err, result) => {
                    if (err) return res.status(500).json({ message: 'Database error', error: err });

                    // Generate JWT token
                    const token = jwt.sign({ userId: result.insertId }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '24h' });

                    res.status(201).json({
                        message: 'User created successfully',
                        token,
                        user: {
                            id: result.insertId,
                            username,
                            email,
                            role: role || 'user'
                        }
                    });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

// -----------------
// Login
// -----------------
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

        // Find user by email
        db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error', error: err });

            if (results.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

            const user = results[0];

            // Compare password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

            // Generate JWT token
            const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '24h' });

            // Return user data without password
            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    profile_image: user.profile_image || null,
                    role: user.role
                }
            });
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
});

module.exports = router;
