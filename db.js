// backend/db.js
const mysql = require('mysql2');
require('dotenv').config();

const connection = mysql.createConnection({
    host: process.env.DB_HOST || '',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '',
    port: Number(process.env.DB_PORT),
    multipleStatements: true, // Allow multiple statements
     ssl: {
    rejectUnauthorized: false
  }
});

connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// Create tables if they don't exist
const createTables = [
    `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        profile_image VARCHAR(255) DEFAULT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(100) NOT NULL,
        description TEXT,
        category_id INT,
        image_url VARCHAR(255),
        file_url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    )`,
    
    `CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        UNIQUE KEY unique_favorite (user_id, book_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        UNIQUE KEY unique_rating (user_id, book_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        last_read_page INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        UNIQUE KEY unique_history (user_id, book_id)
    )`
];

// Execute each table creation query separately
function createTablesSequentially(index = 0) {
    if (index >= createTables.length) {
        console.log('All tables created or already exist');
        insertDefaultData();
        return;
    }
    
    connection.query(createTables[index], (err) => {
        if (err) {
            console.error(`Error creating table ${index + 1}:`, err);
        } else {
            console.log(`Table ${index + 1} created or already exists`);
        }
        createTablesSequentially(index + 1);
    });
}

function insertDefaultData() {
    // Insert default categories if they don't exist
    const defaultCategories = [
        'Fiction', 'Non-Fiction', 'Science', 'History', 
        'Biography', 'Technology', 'Fantasy', 'Mystery'
    ];
    
    defaultCategories.forEach((category, index) => {
        connection.query(
            'INSERT IGNORE INTO categories (name) VALUES (?)',
            [category],
            (err) => {
                if (err) {
                    console.error('Error inserting category:', err);
                } else if (index === defaultCategories.length - 1) {
                    console.log('Default categories inserted or already exist');
                    createAdminUser();
                }
            }
        );
    });
}

function createAdminUser() {
    const bcrypt = require('bcryptjs');
    const adminPassword = bcrypt.hashSync('admin123', 10);
    
    connection.query(
        `INSERT IGNORE INTO users (username, email, password, role) 
         VALUES (?, ?, ?, 'admin')`,
        ['admin', 'admin@elibrary.com', adminPassword],
        (err) => {
            if (err) {
                console.error('Error creating admin user:', err);
            } else {
                console.log('Admin user created or already exists');
                
                // Insert some sample books
                insertSampleBooks();
            }
        }
    );
}

function insertSampleBooks() {
    const sampleBooks = [
        {
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            description: 'A classic novel about the American Dream',
            category_id: 1, // Fiction
            image_url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80'
        },
        {
            title: 'To Kill a Mockingbird',
            author: 'Harper Lee',
            description: 'A story about racial inequality and moral growth',
            category_id: 1, // Fiction
            image_url: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80'
        },
        {
            title: 'A Brief History of Time',
            author: 'Stephen Hawking',
            description: 'Explores the nature of space, time, and the universe',
            category_id: 3, // Science
            image_url: 'https://images.unsplash.com/photo-1507146153580-69a1fe6d8aa1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80'
        }
    ];
    
    sampleBooks.forEach((book, index) => {
        connection.query(
            'INSERT IGNORE INTO books (title, author, description, category_id, image_url) VALUES (?, ?, ?, ?, ?)',
            [book.title, book.author, book.description, book.category_id, book.image_url],
            (err) => {
                if (err) {
                    console.error('Error inserting sample book:', err);
                } else if (index === sampleBooks.length - 1) {
                    console.log('Sample books inserted or already exist');
                }
            }
        );
    });
}

// Start creating tables
// createTablesSequentially();

module.exports = connection;