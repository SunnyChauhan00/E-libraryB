const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000; // You kept 3000 originally

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Serve uploaded files (PDFs/images/etc.)
app.use('/uploads', express.static('uploads'));

// Import route files
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const categoryRoutes = require('./routes/categories');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const ratingRoutes = require('./routes/ratings'); // You had this in your version

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ratings', ratingRoutes); // Retained

// Serve frontend pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/signup.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});


app.get('/book', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/book.html'));
});

app.get('/category', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/category.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);

    // Create uploads/books directory if it doesn't exist
    const uploadsDir = 'uploads/books';
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('Created uploads/books directory');
    }
});
