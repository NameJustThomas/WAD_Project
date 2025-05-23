// Main JavaScript file
document.addEventListener('DOMContentLoaded', function() {
    // Handle quantity input
    const quantityInput = document.getElementById('quantity');
    const decreaseBtn = document.getElementById('decreaseQuantity');
    const increaseBtn = document.getElementById('increaseQuantity');
    const selectedQuantitySpan = document.getElementById('selectedQuantity');

    if (quantityInput && decreaseBtn && increaseBtn) {
        let isProcessing = false;

        // Function to update quantity display
        const updateQuantityDisplay = (value) => {
            const validValue = validateQuantity(value);
            quantityInput.value = validValue;
            if (selectedQuantitySpan) {
                selectedQuantitySpan.textContent = validValue;
            }
        };

        // Function to validate quantity
        const validateQuantity = (value) => {
            const maxValue = parseInt(quantityInput.getAttribute('max'));
            if (value < 1) return 1;
            if (value > maxValue) return maxValue;
            return value;
        };

        // Decrease quantity
        decreaseBtn.addEventListener('click', function(e) {
            if (isProcessing) return;
            isProcessing = true;
            
            e.preventDefault();
            const currentValue = parseInt(quantityInput.value);
            updateQuantityDisplay(currentValue - 1);
            
            setTimeout(() => {
                isProcessing = false;
            }, 100);
        });

        // Increase quantity
        increaseBtn.addEventListener('click', function(e) {
            if (isProcessing) return;
            isProcessing = true;
            
            e.preventDefault();
            const currentValue = parseInt(quantityInput.value);
            updateQuantityDisplay(currentValue + 1);
            
            setTimeout(() => {
                isProcessing = false;
            }, 100);
        });

        // Handle manual input
        quantityInput.addEventListener('input', () => {
            const newValue = parseInt(quantityInput.value) || 1;
            updateQuantityDisplay(newValue);
        });

        // Initialize quantity display
        updateQuantityDisplay(1);
    }

    // Handle Add to Cart forms
    document.querySelectorAll('.add-to-cart-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const button = form.querySelector('.add-to-cart');
            const productId = form.dataset.productId;
            const quantity = parseInt(form.querySelector('input[name="quantity"]').value);

            if (!productId) {
                console.error('No product ID found');
                return;
            }
            
            // Store original button content
            const originalContent = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            button.classList.add('loading');

            try {
                const response = await fetch(`/cart/add/${productId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ quantity })
                });
                const data = await response.json();
                
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else if (data.success) {
                    const cartCountElement = document.querySelector('.cart-count');
                    if (cartCountElement) {
                        cartCountElement.textContent = data.cartCount;
                    }
                    showNotification('Success', data.message, 'success');
                } else {
                    showNotification('Error', data.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Error', 'Error adding product to cart', 'error');
            } finally {
                // Remove loading state
                button.classList.remove('loading');
                button.innerHTML = originalContent;
            }
        });
    });

    // Handle quantity buttons
    document.querySelectorAll('.quantity-btn').forEach(button => {
        button.addEventListener('click', () => {
            const input = button.parentElement.querySelector('.quantity-input');
            const currentValue = parseInt(input.value);
            const max = parseInt(input.max);
            
            if (button.classList.contains('minus')) {
                input.value = Math.max(1, currentValue - 1);
            } else if (button.classList.contains('plus')) {
                input.value = Math.min(max, currentValue + 1);
            }
        });
    });
});

// Notification function
function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
        <strong>${title}!</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to notification container or create one if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
} 