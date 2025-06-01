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

    // Handle quantity controls
    document.querySelectorAll('.quantity-box').forEach(box => {
        const minusBtn = box.querySelector('.minus');
        const plusBtn = box.querySelector('.plus');
        const quantityInput = box.querySelector('.quantity-input');
        const productId = minusBtn.dataset.productId;

        if (minusBtn && plusBtn && quantityInput) {
            minusBtn.addEventListener('click', () => {
                const currentQuantity = parseInt(quantityInput.value);
                if (currentQuantity > 1) {
                    updateQuantity(productId, currentQuantity - 1);
                }
            });

            plusBtn.addEventListener('click', () => {
                const currentQuantity = parseInt(quantityInput.value);
                updateQuantity(productId, currentQuantity + 1);
            });
                }
    });

    // Handle remove buttons
    document.querySelectorAll('button[data-action="remove"]').forEach(button => {
        button.addEventListener('click', () => {
            const productId = button.getAttribute('data-product-id');
            console.log('Remove button clicked, product ID:', productId);
            if (productId) {
                removeItem(productId);
            } else {
                console.error('No product ID found on remove button');
                showNotification('Error', 'Invalid product ID', 'error');
            }
        });
    });

    // Handle clear cart button
    const clearButton = document.querySelector('[data-action="clear"]');
    if (clearButton) {
        clearButton.addEventListener('click', clearCart);
    }

    // Handle coupon application
    const applyCouponBtn = document.querySelector('.apply-btn');
    const couponInput = document.querySelector('.promo-code-input');

    if (applyCouponBtn && couponInput) {
        applyCouponBtn.addEventListener('click', async () => {
            const couponCode = couponInput.value.trim();
            if (!couponCode) {
                showNotification('Error', 'Please enter a coupon code', 'error');
                return;
            }

            try {
                const response = await fetch('/cart/apply-coupon', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ couponCode })
                });

                const data = await response.json();
                
                if (data.success) {
                    showNotification('Success', data.message, 'success');
                    // Update cart totals
                    if (data.cart) {
                        updateCartTotals(data.cart);
                        
                        // Update coupon input and button state
                        couponInput.value = couponCode;
                        couponInput.disabled = true;
                        applyCouponBtn.disabled = true;
                        applyCouponBtn.textContent = 'Applied';

                        // Show discount section if it exists
                        const discountSection = document.querySelector('.discount-amount')?.closest('.d-flex');
                        if (discountSection) {
                            discountSection.style.display = 'flex';
                        }

                        // Reload page after a short delay
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    }
                } else {
                    showNotification('Error', data.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Error', 'Failed to apply coupon', 'error');
            }
        });
    }

    // Handle checkout button click
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/cart/checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Checkout response:', data);
                
                if (data.success) {
                    if (data.redirect) {
                        window.location.href = data.redirect;
                    }
                } else {
                    showNotification('Error', data.message || 'Error processing checkout', 'error');
                }
            } catch (error) {
                console.error('Checkout error:', error);
                showNotification('Error', 'Failed to process checkout. Please try again.', 'error');
            }
        });
    }
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
            // Update the quantity input
            const quantityInput = document.querySelector(`#quantity_${productId}`);
            if (quantityInput) {
                quantityInput.value = quantity;
            }
            // Update cart totals
            if (data.cart) {
                updateCartTotals(data.cart);
            }
        } else {
            showNotification('Error', data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error', 'Error updating cart', 'error');
    });
}

function updateCartTotals(cart) {
    try {
        console.log('Updating cart totals with data:', cart);
        
        // Update subtotal
        const subtotalElement = document.querySelector('.subtotal-amount');
        if (subtotalElement) {
            const subtotal = parseFloat(cart.subtotal);
            if (!isNaN(subtotal)) {
                subtotalElement.textContent = `$${subtotal.toFixed(2)}`;
            } else {
                console.error('Invalid subtotal value:', cart.subtotal);
            }
        }

        // Update shipping
        const shippingElement = document.querySelector('.shipping-amount');
        if (shippingElement) {
            const shipping = parseFloat(cart.shipping);
            if (!isNaN(shipping)) {
                shippingElement.textContent = `$${shipping.toFixed(2)}`;
            } else {
                console.error('Invalid shipping value:', cart.shipping);
            }
        }

        // Update discount if exists
        const discountElement = document.querySelector('.discount-amount');
        if (discountElement && cart.discount) {
            const discount = parseFloat(cart.discount);
            if (!isNaN(discount)) {
                discountElement.textContent = `-$${discount.toFixed(2)}`;
                const discountSection = discountElement.closest('.d-flex');
                if (discountSection) {
                    discountSection.style.display = 'flex';
                }
            } else {
                console.error('Invalid discount value:', cart.discount);
            }
        }

        // Update total
        const totalElement = document.querySelector('.total-amount');
        if (totalElement) {
            const total = parseFloat(cart.total);
            if (!isNaN(total)) {
                totalElement.textContent = `$${total.toFixed(2)}`;
            } else {
                console.error('Invalid total value:', cart.total);
            }
        }

        // Update cart count in navbar
        const cartCountElements = document.querySelectorAll('.cart-count-badge');
        if (cart.totalItems !== undefined) {
            cartCountElements.forEach(element => {
                element.textContent = cart.totalItems;
            });
        }
    } catch (error) {
        console.error('Error updating cart totals:', error);
        showNotification('Error', 'Failed to update cart totals', 'error');
    }
}

function removeItem(productId) {
    if (!productId) {
        showNotification('Error', 'Invalid product ID', 'error');
        return;
    }

    console.log('Removing product with ID:', productId);
    console.log('Cart item element:', document.querySelector(`.cart-item[data-product-id="${productId}"]`));

    fetch(`/cart/remove/${productId}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
    })
    .then(res => res.json())
    .then(data => {
        console.log('Server response:', data);
        
        if (data.success) {
            // Find the cart item directly using the data-product-id attribute
            const cartItem = document.querySelector(`.cart-item[data-product-id="${productId}"]`);
            console.log('Found cart item:', cartItem);
            
            if (cartItem) {
                // Remove the item from DOM
                cartItem.remove();
                console.log('Cart item removed from DOM');
                
                // Update cart totals if provided
                if (data.cart) {
                    console.log('Updating cart totals:', data.cart);
                    
                    // Update subtotal
                    const subtotalElement = document.querySelector('.subtotal-amount');
                    if (subtotalElement) {
                        subtotalElement.textContent = `$${data.cart.subtotal}`;
                        console.log('Updated subtotal:', data.cart.subtotal);
                    }

                    // Update total
                    const totalElement = document.querySelector('.total-amount');
                    if (totalElement) {
                        totalElement.textContent = `$${data.cart.total}`;
                        console.log('Updated total:', data.cart.total);
                    }

                    // Update cart count in navbar
                    const cartCountElements = document.querySelectorAll('.cart-count-badge');
                    cartCountElements.forEach(element => {
                        element.textContent = data.cart.totalItems;
                        console.log('Updated cart count:', data.cart.totalItems);
                    });
                }

                // Check if cart is empty
                const remainingItems = document.querySelectorAll('.cart-item');
                console.log('Remaining items:', remainingItems.length);
                
                if (remainingItems.length === 0) {
                    console.log('Cart is empty, reloading page');
                    // Reload page to show empty cart state
                    location.reload();
                }
            }

            showNotification('Success', data.message, 'success');
        } else {
            showNotification('Error', data.message || 'Error removing item from cart', 'error');
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
