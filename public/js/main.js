// Main JavaScript file
document.addEventListener('DOMContentLoaded', function() {
    // Add CSS for notifications if not already added
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

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

    // Remove any existing event listeners
    const forms = document.querySelectorAll('.add-to-cart-form');
    forms.forEach(form => {
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
    });

    // Add event listeners to all add-to-cart forms
    document.querySelectorAll('.add-to-cart-form').forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Form submitted:', this);

            const productId = this.dataset.productId;
            if (!productId) {
                console.error('No product ID found');
                return;
            }
            console.log('Product ID:', productId);

            // Get quantity from input if exists, otherwise default to 1
            const quantityInput = this.querySelector('input[name="quantity"]');
            const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;
            console.log('Quantity:', quantity);

            // Get the submit button
            const submitButton = this.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            console.log('Original button text:', originalButtonText);

            // Disable button and show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

            try {
                console.log('Sending request to:', `/products/${productId}/add-to-cart`);
                const response = await fetch(`/products/${productId}/add-to-cart`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ quantity })
                });

                console.log('Response status:', response.status);
                console.log('Response ok:', response.ok);
                const data = await response.json();
                console.log('Response data:', data);

                if (response.ok) {
                    // Update cart count in navbar
                    const cartCountElements = document.querySelectorAll('.cart-count-badge');
                    if (cartCountElements.length > 0) {
                        cartCountElements.forEach(element => {
                            element.textContent = data.cartCount || '0';
                            element.style.display = 'inline';
                        });
                    } else {
                        // Create cart count element if not found
                        const cartLinks = document.querySelectorAll('.cart-link');
                        cartLinks.forEach(link => {
                            const countElement = document.createElement('span');
                            countElement.className = 'position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger cart-count-badge';
                            countElement.textContent = data.cartCount || '0';
                            link.appendChild(countElement);
                        });
                    }

                    // Show success message
                    showNotification('Product added to cart successfully!', 'success');
                } else {
                    showNotification(data.message || 'Failed to add product to cart', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('An error occurred while adding to cart', 'error');
            } finally {
                // Reset button state
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
                console.log('Reset button state');
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

    // Handle new product form submission
    document.getElementById('newProductForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const submitButton = form.querySelector('button[type="submit"]');
        
        try {
            // Show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            // Get form data
            const formData = new FormData(form);
            const productData = Object.fromEntries(formData.entries());

            // Validate required fields
            if (!productData.name || !productData.description || !productData.price || 
                !productData.stock || !productData.category_id || !productData.gender) {
                throw new Error('All fields are required');
            }

            // Send create request
            const response = await fetch('/admin/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
                // Show success message
                showNotification('Product created successfully', 'success');

                // Reload page after short delay
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                showNotification(data.message || 'Error creating product', 'error');
            }
        } catch (error) {
            console.error('Error creating product:', error);
            showNotification(error.message || 'Error creating product', 'error');
        } finally {
            // Reset button state
            submitButton.disabled = false;
            submitButton.innerHTML = 'Create Product';
        }
    });
});

// Notification function
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '1000';
    notification.style.minWidth = '200px';
    notification.style.padding = '15px';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    notification.style.animation = 'slideIn 0.5s ease-out';

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
} 