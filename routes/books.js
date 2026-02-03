const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth1'); // Assumes default export

const router = express.Router();

// GET all books or filter by category/search
router.get('/', (req, res) => {
    const { category, search } = req.query;
    let query = `
        SELECT b.*, c.name AS category_name, 
               AVG(r.rating) AS average_rating,
               COUNT(r.id) AS rating_count
        FROM books b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN ratings r ON b.id = r.book_id
    `;
    let conditions = [];
    let params = [];

    if (category && category !== 'all') {
        conditions.push('c.name = ?');
        params.push(category);
    }
    if (search) {
        conditions.push('(b.title LIKE ? OR b.author LIKE ? OR c.name LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY b.id ORDER BY b.created_at DESC';

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

// GET single book
router.get('/:id', (req, res) => {
    const bookId = Number(req.params.id);
    const query = `
        SELECT b.*, c.name AS category_name,
               AVG(r.rating) AS average_rating,
               COUNT(r.id) AS rating_count
        FROM books b
        LEFT JOIN categories c ON b.category_id = c.id
        LEFT JOIN ratings r ON b.id = r.book_id
        WHERE b.id = ?
        GROUP BY b.id
    `;
    db.query(query, [bookId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Book not found' });
        }
        res.json(results[0]);
    });
});

// GET reviews for a book
router.get('/:id/reviews', (req, res) => {
    const bookId = req.params.id;
    const query = `
        SELECT r.*, u.username
        FROM ratings r
        JOIN users u ON r.user_id = u.id
        WHERE r.book_id = ?
        ORDER BY r.created_at DESC
    `;
    db.query(query, [bookId], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

// POST rating & review (with token-based auth)
router.post('/:id/rate', authenticateToken, (req, res) => {
    const bookId = req.params.id;
    const userId = req.userId; // From middleware
    const { rating, comment } = req.body;

    if (!userId) return res.status(401).json({ message: 'Unauthorized' });
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    db.query(
        'SELECT * FROM ratings WHERE user_id = ? AND book_id = ?',
        [userId, bookId],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (results.length > 0) {
                // Update existing rating
                db.query(
                    'UPDATE ratings SET rating = ?, comment = ?, updated_at = NOW() WHERE id = ?',
                    [rating, comment, results[0].id],
                    (err2) => {
                        if (err2) {
                            console.error('Database error:', err2);
                            return res.status(500).json({ message: 'Database error' });
                        }
                        res.json({ message: 'Review updated' });
                    }
                );
            } else {
                // New rating
                db.query(
                    'INSERT INTO ratings (user_id, book_id, rating, comment, created_at) VALUES (?, ?, ?, ?, NOW())',
                    [userId, bookId, rating, comment],
                    (err2) => {
                        if (err2) {
                            console.error('Database error:', err2);
                            return res.status(500).json({ message: 'Database error' });
                        }
                        res.json({ message: 'Review added' });
                    }
                );
            }
        }
    );
});

// GET user's rating for a book (with token auth)
router.get('/:id/user-rating', authenticateToken, (req, res) => {
    const bookId = req.params.id;
    const userId = req.userId;

    db.query(
        'SELECT rating FROM ratings WHERE user_id = ? AND book_id = ?',
        [userId, bookId],
        (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ rating: results.length > 0 ? results[0].rating : null });
        }
    );
});

module.exports = router;
