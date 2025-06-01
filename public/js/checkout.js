document.addEventListener('DOMContentLoaded', function() {
    const checkoutForm = document.getElementById('checkout-form');
    if (!checkoutForm) {
        console.error('Checkout form not found');
        return;
    }

    // Handle form submission
    checkoutForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate form
        if (!this.checkValidity()) {
            e.stopPropagation();
            this.classList.add('was-validated');
            return;
        }
        
        try {
            // Get form data
            const formData = new FormData(this);
            const shippingAddress = {
                fullName: formData.get('fullName'),
                phone: formData.get('phone'),
                email: formData.get('email'),
                address: formData.get('address'),
                city: formData.get('city'),
                state: formData.get('state'),
                zipCode: formData.get('zipCode')
            };

            // Get payment method
            const paymentMethod = formData.get('payment_method');

            // Validate address
            if (!shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.email || 
                !shippingAddress.address || !shippingAddress.city || !shippingAddress.state || 
                !shippingAddress.zipCode) {
                showNotification('Error', 'Please fill in all address fields', 'error');
                return;
            }

            // Create order
            const response = await fetch('/checkout/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    shippingAddress,
                    payment_method: paymentMethod
                })
            });

            const data = await response.json();
            
            if (data.success) {
                showNotification('Success', 'Order placed successfully', 'success');
                // Redirect to account orders page after a short delay
                setTimeout(() => {
                    window.location.href = '/account/orders';
                }, 1500);
            } else {
                showNotification('Error', data.message || 'Error placing order', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error', 'Failed to place order', 'error');
        }
    });
});

function showNotification(title, message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
        <strong>${title}!</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container position-fixed top-0 end-0 p-3';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
} 