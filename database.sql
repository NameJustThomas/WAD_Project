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
    gender ENUM('men', 'women', 'kids', 'unisex') DEFAULT 'unisex',
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
    payment_method VARCHAR(50),
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

CREATE TABLE IF NOT EXISTS profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    address VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

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
INSERT INTO products (name, description, price, discount_price, stock, category_id, image_url, gender) VALUES
-- Men's Collection
('Basic White Tee', 'Classic casual cotton t-shirt', 19.99, 14.99, 100, 1, '/images/products/white_tee.jpg', 'men'),
('Hoodie Jacket', 'Oversized street-style hoodie', 44.99, 34.99, 90, 7, '/images/products/street_hoodie.jpg', 'men'),
('Formal Black Suit', 'Classic black suit for formal occasions', 199.99, 179.99, 30, 2, '/images/products/black_suit.jpg', 'men'),
('Denim Jeans', 'Classic blue denim jeans', 49.99, 39.99, 75, 1, '/images/products/denim_jeans.jpg', 'men'),
('Leather Jacket', 'Premium leather biker jacket', 149.99, NULL, 25, 7, '/images/products/leather_jacket.jpg', 'men'),
('Polo Shirt', 'Classic fit polo shirt', 29.99, 24.99, 60, 1, '/images/products/polo_shirt.jpg', 'men'),
('Winter Parka', 'Heavy-duty winter parka', 129.99, 99.99, 40, 6, '/images/products/winter_parka.jpg', 'men'),
('Casual Sneakers', 'Comfortable everyday sneakers', 79.99, 59.99, 50, 1, '/images/products/casual_sneakers.jpg', 'men'),

-- Women's Collection
('Red Party Dress', 'Stylish red dress for parties', 129.99, 99.99, 30, 3, '/images/products/party_dress.jpg', 'women'),
('Workout Leggings', 'High-waisted gym leggings', 39.99, 29.99, 70, 4, '/images/products/leggings.jpg', 'women'),
('Summer Maxi Dress', 'Floral print maxi dress', 89.99, 69.99, 45, 5, '/images/products/maxi_dress.jpg', 'women'),
('Blouse', 'Elegant silk blouse', 59.99, 49.99, 55, 2, '/images/products/blouse.jpg', 'women'),
('Pencil Skirt', 'Classic black pencil skirt', 49.99, 39.99, 40, 2, '/images/products/pencil_skirt.jpg', 'women'),
('Winter Coat', 'Warm wool winter coat', 159.99, 129.99, 35, 6, '/images/products/winter_coat.jpg', 'women'),
('Ankle Boots', 'Stylish leather ankle boots', 99.99, 79.99, 30, 7, '/images/products/ankle_boots.jpg', 'women'),
('Handbag', 'Designer leather handbag', 129.99, 99.99, 25, 1, '/images/products/handbag.jpg', 'women'),

-- Kids' Collection
('Kids T-Shirt', 'Colorful cotton t-shirt', 14.99, 12.99, 100, 1, '/images/products/kids_tshirt.jpg', 'kids'),
('Kids Jeans', 'Comfortable stretch jeans', 24.99, 19.99, 80, 1, '/images/products/kids_jeans.jpg', 'kids'),
('Kids Hoodie', 'Warm and cozy hoodie', 29.99, 24.99, 70, 7, '/images/products/kids_hoodie.jpg', 'kids'),
('Kids Dress', 'Cute floral dress', 34.99, 29.99, 60, 3, '/images/products/kids_dress.jpg', 'kids'),
('Kids Sneakers', 'Comfortable kids sneakers', 39.99, 34.99, 50, 1, '/images/products/kids_sneakers.jpg', 'kids'),
('Kids Winter Jacket', 'Warm winter jacket', 49.99, 39.99, 40, 6, '/images/products/kids_jacket.jpg', 'kids'),
('Kids Pajamas', 'Soft cotton pajamas', 19.99, 16.99, 90, 1, '/images/products/kids_pajamas.jpg', 'kids'),
('Kids Backpack', 'Colorful school backpack', 24.99, 19.99, 75, 1, '/images/products/kids_backpack.jpg', 'kids'),

-- Unisex Collection
('Black Blazer', 'Formal fitted black blazer for events', 89.99, NULL, 50, 2, '/images/products/black_blazer.jpg', 'unisex'),
('Summer Shorts', 'Lightweight summer shorts', 24.99, 19.99, 80, 5, '/images/products/summer_shorts.jpg', 'unisex'),
('Wool Sweater', 'Thick wool sweater for winter', 59.99, 49.99, 60, 6, '/images/products/wool_sweater.jpg', 'unisex'),
('Vintage Denim Jacket', 'Retro faded blue denim jacket', 74.99, NULL, 40, 8, '/images/products/denim_jacket.jpg', 'unisex'),
('Beanie Hat', 'Warm winter beanie', 19.99, 14.99, 100, 6, '/images/products/beanie.jpg', 'unisex'),
('Canvas Tote Bag', 'Eco-friendly canvas tote', 29.99, 24.99, 70, 1, '/images/products/tote_bag.jpg', 'unisex'),
('Scarf', 'Wool blend scarf', 24.99, 19.99, 85, 6, '/images/products/scarf.jpg', 'unisex'),
('Sunglasses', 'Classic aviator sunglasses', 39.99, 29.99, 65, 1, '/images/products/sunglasses.jpg', 'unisex');

-- Insert FAQs
INSERT INTO faqs (product_id, question, answer)
VALUES
(1, "Is this tee shrink-proof?", "Yes, it's pre-shrunk cotton."),
(2, "Can it be dry cleaned?", "Yes, dry cleaning is safe."),
(4, "Does it have a phone pocket?", "No, just standard leggings."),
(6, "Is this sweater itchy?", "No, it's soft wool blend."),
(8, "Is it unisex?", "Yes, the design suits all genders.");

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
