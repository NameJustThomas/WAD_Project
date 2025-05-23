// Handle Add to Cart functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle all Add to Cart buttons
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const form = e.target.closest('form');
            
            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                const data = await response.json();
                
                if (data.redirect) {
                    // Redirect to login page if not authenticated
                    window.location.href = data.redirect;
                } else if (data.success) {
                    // Update cart count in navbar
                    const cartCountElement = document.querySelector('.cart-count');
                    if (cartCountElement) {
                        cartCountElement.textContent = data.cartCount;
                    }
                    
                    // Show success message
                    showNotification('Success', data.message, 'success');
                } else {
                    // Show error message
                    showNotification('Error', data.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Error', 'Failed to add item to cart', 'error');
            }
        });
    });

    // Handle quantity buttons and inputs
    document.querySelectorAll('[data-action]').forEach(element => {
        element.addEventListener('click', function() {
            const action = this.dataset.action;
            const productId = this.dataset.productId;

            switch(action) {
                case 'decrease':
                    const currentQty = parseInt(this.parentElement.querySelector('.quantity-input').value);
                    if (currentQty > 1) {
                        updateQuantity(productId, currentQty - 1);
                    }
                    break;
                case 'increase':
                    const currentQty2 = parseInt(this.parentElement.querySelector('.quantity-input').value);
                    updateQuantity(productId, currentQty2 + 1);
                    break;
                case 'remove':
                    if (confirm('Are you sure you want to remove this item?')) {
                        removeItem(productId);
                    }
                    break;
                case 'clear':
                    if (confirm('Are you sure you want to clear your cart?')) {
                        clearCart();
                    }
                    break;
            }
        });
    });

    // Handle quantity input changes
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', function() {
            const productId = this.dataset.productId;
            const quantity = parseInt(this.value);
            if (quantity >= 1) {
                updateQuantity(productId, quantity);
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

// Update quantity
function updateQuantity(productId, quantity) {
    fetch(`/cart/update/${productId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({ quantity })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Success', data.message, 'success');
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            showNotification('Error', data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error', 'Error updating cart', 'error');
    });
}

// Remove item
function removeItem(productId) {
    fetch(`/cart/remove/${productId}`, {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Success', data.message, 'success');
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            showNotification('Error', data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error', 'Error removing item from cart', 'error');
    });
}

// Clear cart
function clearCart() {
    fetch('/cart/clear', {
        method: 'DELETE',
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Success', data.message, 'success');
            setTimeout(() => {
                location.reload();
            }, 1000);
        } else {
            showNotification('Error', data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error', 'Error clearing cart', 'error');
    });
} 