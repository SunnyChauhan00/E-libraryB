const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth1');

const router = express.Router();

// Get all reviews for a book
router.get('/book/:bookId', async (req, res) => {
    try {
        const bookId = req.params.bookId;
        
        const query = `
            SELECT r.*, u.username, u.profile_image 
            FROM ratings r 
            JOIN users u ON r.user_id = u.id 
            WHERE r.book_id = ? 
            ORDER BY r.created_at DESC
        `;
        
        db.query(query, [bookId], (err, results) => {
            if (err) {
                console.error('Error fetching reviews:', err);
                return res.status(500).json({ message: 'Database error' });
            }
            res.json(results);
        });
    } catch (error) {
        console.error('Error in GET /ratings/book/:id:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's rating for a book
router.get('/user-rating/:bookId', authenticateToken, async (req, res) => {
    try {
        const bookId = req.params.bookId;
        const userId = req.userId;
        
        const query = 'SELECT * FROM ratings WHERE user_id = ? AND book_id = ?';
        
        db.query(query, [userId, bookId], (err, results) => {
            if (err) {
                console.error('Error fetching user rating:', err);
                return res.status(500).json({ message: 'Database error' });
            }
            
            if (results.length > 0) {
                res.json({ rating: results[0] });
            } else {
                res.json({ rating: null });
            }
        });
    } catch (error) {
        console.error('Error in GET /ratings/user-rating/:id:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add or update rating
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { bookId, rating, comment } = req.body;
        const userId = req.userId;
        
        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }
        
        // Check if user already rated this book
        const checkQuery = 'SELECT * FROM ratings WHERE user_id = ? AND book_id = ?';
        
        db.query(checkQuery, [userId, bookId], (err, results) => {
            if (err) {
                console.error('Error checking existing rating:', err);
                return res.status(500).json({ message: 'Database error' });
            }
            
            if (results.length > 0) {
                // Update existing rating
                const updateQuery = 'UPDATE ratings SET rating = ?, comment = ? WHERE id = ?';
                db.query(updateQuery, [rating, comment, results[0].id], (err) => {
                    if (err) {
                        console.error('Error updating rating:', err);
                        return res.status(500).json({ message: 'Database error' });
                    }
                    res.json({ 
                        message: 'Rating updated successfully',
                        action: 'updated' 
                    });
                });
            } else {
                // Create new rating
                const insertQuery = 'INSERT INTO ratings (user_id, book_id, rating, comment) VALUES (?, ?, ?, ?)';
                db.query(insertQuery, [userId, bookId, rating, comment], (err, result) => {
                    if (err) {
                        console.error('Error creating rating:', err);
                        return res.status(500).json({ message: 'Database error' });
                    }
                    res.json({ 
                        message: 'Rating submitted successfully',
                        action: 'created',
                        ratingId: result.insertId 
                    });
                });
            }
        });
    } catch (error) {
        console.error('Error in POST /ratings:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete rating
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const ratingId = req.params.id;
        const userId = req.userId;
        
        const query = 'DELETE FROM ratings WHERE id = ? AND user_id = ?';
        
        db.query(query, [ratingId, userId], (err, result) => {
            if (err) {
                console.error('Error deleting rating:', err);
                return res.status(500).json({ message: 'Database error' });
            }
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Rating not found or access denied' });
            }
            
            res.json({ message: 'Rating deleted successfully' });
        });
    } catch (error) {
        console.error('Error in DELETE /ratings/:id:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get average rating for a book
router.get('/average/:bookId', async (req, res) => {
    try {
        const bookId = req.params.bookId;
        
        const query = `
            SELECT 
                AVG(rating) as average_rating, 
                COUNT(*) as rating_count 
            FROM ratings 
            WHERE book_id = ?
        `;
        
        db.query(query, [bookId], (err, results) => {
            if (err) {
                console.error('Error fetching average rating:', err);
                return res.status(500).json({ message: 'Database error' });
            }
            
            res.json({
                average_rating: results[0].average_rating || 0,
                rating_count: results[0].rating_count || 0
            });
        });
    } catch (error) {
        console.error('Error in GET /ratings/average/:id:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;