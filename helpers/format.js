/**
 * Format Helper
 * Purpose: Utility functions for data formatting
 * Features:
 * - Price formatting
 * - Date formatting
 * - Number formatting
 * - Currency formatting
 */

const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(price);
};

module.exports = {
    formatPrice
}; 