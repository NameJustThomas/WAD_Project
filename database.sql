/**
 * Database Schema
 * Purpose: Define database structure and initial data
 * Features:
 * - Table creation (users, products, categories, orders, etc.)
 * - Foreign key relationships
 * - Indexes for performance
 * - Initial data seeding
 * - Database constraints
 */

-- Create database
CREATE DATABASE IF NOT EXISTS onlineshop;
USE onlineshop;

-- Drop existing tables
DROP TABLE IF EXISTS product_images;
DROP TABLE IF EXISTS cart;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS faqs;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS coupons;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    reset_token VARCHAR(255),
    reset_token_expires DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table (Clothing focused)
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255) NOT NULL
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    discount_price DECIMAL(10, 2),
    stock INT NOT NULL DEFAULT 0,
    category_id INT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    shipping_address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Cart table
CREATE TABLE IF NOT EXISTS cart (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Product images table
CREATE TABLE IF NOT EXISTS product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Create feedbacks table
CREATE TABLE IF NOT EXISTS feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- FAQs table
CREATE TABLE IF NOT EXISTS faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    question VARCHAR(255) NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Coupons table
CREATE TABLE IF NOT EXISTS coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type ENUM('percent', 'fixed') NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    expires_at DATETIME,
    usage_limit INT DEFAULT NULL,
    times_used INT DEFAULT 0
);

-- Insert users
INSERT INTO users (username, email, password, role)
VALUES
('alice', 'alice@example.com', 'hashed_password1', 'user'),
('bob', 'bob@example.com', 'hashed_password2', 'user'),
('admin', 'admin@example.com', 'hashed_password_admin', 'admin');

-- Insert clothing-only categories
INSERT INTO categories (name, description, image_url) VALUES
('Casual', 'Everyday casual wear', '/images/categories/casual.jpg'),
('Formal', 'Suits and formal dresses', '/images/categories/formal.jpg'),
('Party', 'Party outfits and nightwear', '/images/categories/party.jpg'),
('Gym', 'Sports and activewear', '/images/categories/gym.jpg'),
('Summer', 'Light and breathable summer clothing', '/images/categories/summer.jpg'),
('Winter', 'Warm and cozy winter clothing', '/images/categories/winter.jpg'),
('Street', 'Trendy street fashion', '/images/categories/street.jpg'),
('Vintage', 'Retro and vintage clothing', '/images/categories/vintage.jpg');

-- Insert sample products (clothing)
INSERT INTO products (name, description, price, discount_price, stock, category_id, image_url) VALUES
('Basic White Tee', 'Classic casual cotton t-shirt', 19.99, 14.99, 100, 1, '/images/products/white_tee.jpg'),
('Black Blazer', 'Formal fitted black blazer for events', 89.99, NULL, 50, 2, '/images/products/black_blazer.jpg'),
('Red Party Dress', 'Stylish red dress for parties', 129.99, 99.99, 30, 3, '/images/products/party_dress.jpg'),
('Workout Leggings', 'High-waisted gym leggings', 39.99, 29.99, 70, 4, '/images/products/leggings.jpg'),
('Summer Shorts', 'Lightweight summer shorts', 24.99, 19.99, 80, 5, '/images/products/summer_shorts.jpg'),
('Wool Sweater', 'Thick wool sweater for winter', 59.99, 49.99, 60, 6, '/images/products/wool_sweater.jpg'),
('Hoodie Jacket', 'Oversized street-style hoodie', 44.99, 34.99, 90, 7, '/images/products/street_hoodie.jpg'),
('Vintage Denim Jacket', 'Retro faded blue denim jacket', 74.99, NULL, 40, 8, '/images/products/denim_jacket.jpg');

-- Insert sample orders
INSERT INTO orders (user_id, total_amount, status, shipping_address)
VALUES
(1, 174.97, 'shipped', '123 Maple St, Hanoi, Vietnam'),
(2, 99.99, 'processing', '456 Oak Rd, Ho Chi Minh City, Vietnam');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, quantity, price)
VALUES
(1, 1, 2, 19.99),
(1, 2, 1, 89.99),
(2, 4, 1, 39.99),
(2, 3, 1, 59.99);

-- Insert sample cart
INSERT INTO cart (user_id, product_id, quantity)
VALUES
(1, 6, 1),
(2, 5, 2);

-- Insert reviews
INSERT INTO reviews (product_id, user_id, rating, comment)
VALUES
(1, 1, 5, 'Very comfy shirt, perfect for daily wear!'),
(2, 2, 4, 'Fits well, looks sharp for office.'),
(3, 1, 5, 'Gorgeous dress! Got lots of compliments.'),
(5, 2, 4, 'Good value for summer, light and cool.'),
(8, 1, 5, 'Stylish and great quality denim.');

-- Insert FAQs
INSERT INTO faqs (product_id, question, answer)
VALUES
(1, 'Is this tee shrink-proof?', 'Yes, it’s pre-shrunk cotton.'),
(2, 'Can it be dry cleaned?', 'Yes, dry cleaning is safe.'),
(4, 'Does it have a phone pocket?', 'No, just standard leggings.'),
(6, 'Is this sweater itchy?', 'No, it’s soft wool blend.'),
(8, 'Is it unisex?', 'Yes, the design suits all genders.');

-- Insert coupons
INSERT INTO coupons (code, discount_type, discount_value, expires_at, usage_limit)
VALUES
('SALE10', 'percent', 10.00, '2025-12-31 23:59:59', 100),
('WELCOME50', 'fixed', 50.00, '2025-06-30 23:59:59', 50);

-- Insert sample feedback data
INSERT INTO feedbacks (name, rating, content) VALUES
('Alice Nguyen', 5, 'Absolutely love the product quality and delivery time!'),
('Minh Tran', 4, 'Good experience overall. Packaging could be better.'),
('Linh Hoang', 5, 'Fantastic customer service and great pricing.'),
('Duc Pham', 3, 'Average experience. Delivery was late by two days.'),
('Thu Le', 5, 'Will definitely buy again! Highly recommended.'),
('Quan Vo', 4, 'Very happy with my purchase, but the color was slightly different.'),
('My Duyen', 5, 'Excellent quality and super fast shipping.'),
('Hanh Bui', 2, 'Product arrived damaged. Awaiting support response.'),
('Trung Tuan', 5, 'Top-notch service and product. Will refer friends.'),
('Kim Chi', 4, 'Good deal for the price. Smooth transaction.');