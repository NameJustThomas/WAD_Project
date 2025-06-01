document.addEventListener('DOMContentLoaded', function() {
    // Add to Cart buttons (assuming elsewhere)
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const form = e.target.closest('form');
            
            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { 'Accept': 'application/json' }
                });
                
                const data = await response.json();
                
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else if (data.success) {
                    const cartCountElement = document.querySelector('.cart-count');
                    if (cartCountElement) cartCountElement.textContent = data.cartCount;
                    showNotification('Success', data.message, 'success');
                } else {
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

            console.log('Action:', action, 'ProductId:', productId);

            if (!productId && action !== 'clear') {
                console.error('Missing productId for action:', action);
                return;
            }

            const container = this.closest('.cart-item');

            switch(action) {
                case 'decrease': {
                    const quantityInput = container.querySelector('.quantity-input');
                    const currentQty = parseInt(quantityInput.value);
                    if (currentQty > 1) updateQuantity(productId, currentQty - 1);
                    break;
                }
                case 'increase': {
                    const quantityInput = container.querySelector('.quantity-input');
                    const currentQty = parseInt(quantityInput.value);
                    updateQuantity(productId, currentQty + 1);
                    break;
                }
                case 'remove':
                    if (confirm('Are you sure you want to remove this item?')) removeItem(productId);
                    break;
                case 'clear':
                    if (confirm('Are you sure you want to clear your cart?')) clearCart();
                    break;
            }
        });
    });

    // Quantity input change handler
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', function() {
            const productId = this.dataset.productId;
            const quantity = parseInt(this.value);
            if (quantity >= 1) updateQuantity(productId, quantity);
        });
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

function updateQuantity(productId, quantity) {
    fetch(`/cart/update/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ quantity })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('Success', data.message, 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showNotification('Error', data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error', 'Error updating cart', 'error');
    });
}

function removeItem(productId) {
    fetch(`/cart/remove/${productId}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('Success', data.message, 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showNotification('Error', data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error', 'Error removing item from cart', 'error');
    });
}

function clearCart() {
    fetch('/cart/clear', {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showNotification('Success', data.message, 'success');
            setTimeout(() => location.reload(), 1000);
        } else {
            showNotification('Error', data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error', 'Error clearing cart', 'error');
    });
}

document.addEventListener('DOMContentLoaded', function () {
  const applyBtn = document.querySelector('.apply-btn');
  const input = document.querySelector('.promo-code-input');

  if (applyBtn && input) {
    applyBtn.addEventListener('click', async () => {
      const code = input.value.trim();
      if (!code) {
        showToast('⚠️ Please enter a coupon code.', 'danger');
        return;
      }

      applyBtn.disabled = true;
      const originalText = applyBtn.innerHTML;
      applyBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Checking...`;

      try {
        const res = await fetch('/apply-coupon', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code }),
        });

        const data = await res.json();

        if (data.success) {
          showToast(data.message, 'success');
          // Optionally store coupon data in sessionStorage/localStorage
          // localStorage.setItem('couponDiscount', data.discount);
        } else {
          showToast(data.message, 'danger');
        }
      } catch (err) {
        showToast('❌ Failed to apply coupon.', 'danger');
        console.error(err);
      } finally {
        applyBtn.disabled = false;
        applyBtn.innerHTML = originalText;
      }
    });
  }
});
