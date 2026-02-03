// backend/routes/admin.js
const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

/* ====== Middleware: Authenticate Admin ====== */
const authenticateAdmin = (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader?.split(' ')[1];

        if (!token) return res.status(401).json({ message: 'Access token required' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');

        db.query('SELECT role FROM users WHERE id = ?', [decoded.userId], (err, results) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            if (!results.length || results[0].role !== 'admin') {
                return res.status(403).json({ message: 'Admin access required' });
            }
            req.userId = decoded.userId;
            next();
        });
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

/* ====== Multer Config for PDF Upload ====== */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/books/';
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, 'book-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'), false);
        }
        cb(null, true);
    }
});

/* ====== Add New Book ====== */
router.post('/books', authenticateAdmin, upload.single('pdf'), (req, res) => {
    const { title, author, description, category_id, image_url } = req.body;
    if (!title || !author || !category_id) {
        return res.status(400).json({ message: 'Title, author, and category are required' });
    }

    let file_url = null;
    if (req.file) {
        file_url = `${req.protocol}://${req.get('host')}/uploads/books/${req.file.filename}`;
    }

    db.query(
        'INSERT INTO books (title, author, description, category_id, image_url, file_url) VALUES (?, ?, ?, ?, ?, ?)',
        [title, author, description || '', category_id, image_url || null, file_url],
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            res.status(201).json({ message: 'Book added successfully', bookId: result.insertId, file_url });
        }
    );
});

/* ====== Update Book ====== */
router.put('/books/:id', authenticateAdmin, upload.single('pdf'), (req, res) => {
    const bookId = req.params.id;
    const { title, author, description, category_id, image_url, existing_file_url } = req.body;
    if (!title || !author || !category_id) {
        return res.status(400).json({ message: 'Title, author, and category are required' });
    }

    let file_url = existing_file_url || null;
    if (req.file) {
        file_url = `${req.protocol}://${req.get('host')}/uploads/books/${req.file.filename}`;

        // Delete old file safely
        if (existing_file_url) {
            try {
                const oldFilename = existing_file_url.split('/').pop();
                const oldPath = `uploads/books/${oldFilename}`;
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            } catch (err) {
                console.error('Error deleting old file:', err);
            }
        }
    }

    db.query(
        'UPDATE books SET title=?, author=?, description=?, category_id=?, image_url=?, file_url=? WHERE id=?',
        [title, author, description || '', category_id, image_url || null, file_url, bookId],
        (err) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            res.json({ message: 'Book updated successfully', file_url });
        }
    );
});

/* ====== Delete Book ====== */
router.delete('/books/:id', authenticateAdmin, (req, res) => {
    const bookId = req.params.id;

    db.query('SELECT file_url FROM books WHERE id = ?', [bookId], (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });

        if (results.length && results[0].file_url) {
            try {
                const filename = results[0].file_url.split('/').pop();
                const filePath = `uploads/books/${filename}`;
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch (err) {
                console.error('Error deleting file:', err);
            }
        }

        db.query('DELETE FROM books WHERE id = ?', [bookId], (err) => {
            if (err) return res.status(500).json({ message: 'Database error' });
            res.json({ message: 'Book deleted successfully' });
        });
    });
});

/* ====== Get All Users ====== */
router.get('/users', authenticateAdmin, (req, res) => {
    db.query('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.json(results);
    });
});

/* ====== Add New Category ====== */
router.post('/categories', authenticateAdmin, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });

    db.query('INSERT INTO categories (name) VALUES (?)', [name], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        res.status(201).json({ message: 'Category added successfully', categoryId: result.insertId });
    });
});

module.exports = router;
