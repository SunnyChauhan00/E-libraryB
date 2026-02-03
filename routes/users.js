// backend/routes/users.js
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.userId = user.userId;
        next();
    });
};

// Get user favorites
router.get('/favorites', authenticateToken, (req, res) => {
    const userId = req.userId;
    
    const query = `
        SELECT b.*, c.name as category_name
        FROM favorites f
        JOIN books b ON f.book_id = b.id
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

// Add to favorites
router.post('/favorites', authenticateToken, (req, res) => {
    const userId = req.userId;
    const { bookId } = req.body;
    
    // Check if already favorited
    db.query(
        'SELECT * FROM favorites WHERE user_id = ? AND book_id = ?',
        [userId, bookId],
        (err, results) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            
            if (results.length > 0) {
                // Remove from favorites
                db.query(
                    'DELETE FROM favorites WHERE user_id = ? AND book_id = ?',
                    [userId, bookId],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ message: 'Database error' });
                        }
                        res.json({ message: 'Removed from favorites', isFavorite: false });
                    }
                );
            } else {
                // Add to favorites
                db.query(
                    'INSERT INTO favorites (user_id, book_id) VALUES (?, ?)',
                    [userId, bookId],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ message: 'Database error' });
                        }
                        res.json({ message: 'Added to favorites', isFavorite: true });
                    }
                );
            }
        }
    );
});

// Get reading history
router.get('/history', authenticateToken, (req, res) => {
    const userId = req.userId;
    
    const query = `
        SELECT b.*, h.last_read_page, h.updated_at, c.name as category_name
        FROM history h
        JOIN books b ON h.book_id = b.id
        LEFT JOIN categories c ON b.category_id = c.id
        WHERE h.user_id = ?
        ORDER BY h.updated_at DESC
    `;
    
    db.query(query, [userId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

// Update reading progress
router.post('/history', authenticateToken, (req, res) => {
    const userId = req.userId;
    const { bookId, lastReadPage } = req.body;
    
    db.query(
        `INSERT INTO history (user_id, book_id, last_read_page) 
         VALUES (?, ?, ?) 
         ON DUPLICATE KEY UPDATE last_read_page = ?, updated_at = CURRENT_TIMESTAMP`,
        [userId, bookId, lastReadPage, lastReadPage],
        (err) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            res.json({ message: 'Reading progress updated' });
        }
    );
});



// Check if a book is favorited by user
router.get('/favorites/check/:bookId', authenticateToken, (req, res) => {
    const userId = req.userId;
    const bookId = req.params.bookId;
    
    db.query(
        'SELECT * FROM favorites WHERE user_id = ? AND book_id = ?',
        [userId, bookId],
        (err, results) => {
            if (err) {
                console.error('Error checking favorite:', err);
                return res.status(500).json({ message: 'Database error' });
            }
            
            res.json({ isFavorite: results.length > 0 });
        }
    );
});

module.exports = router;