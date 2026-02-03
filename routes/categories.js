// backend/routes/categories.js
const express = require('express');
const db = require('../db');

const router = express.Router();

// Get all categories
router.get('/', (req, res) => {
    db.query('SELECT * FROM categories ORDER BY name', (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

// Get books by category
router.get('/:id/books', (req, res) => {
    const categoryId = req.params.id;
    
    const query = `
        SELECT b.*, c.name as category_name,
               AVG(r.rating) as average_rating,
               COUNT(r.id) as rating_count
        FROM books b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN ratings r ON b.id = r.book_id
        WHERE b.category_id = ?
        GROUP BY b.id
        ORDER BY b.created_at DESC
    `;
    
    db.query(query, [categoryId], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

module.exports = router;