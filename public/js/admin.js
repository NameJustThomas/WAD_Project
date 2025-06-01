// Handle order status updates
document.querySelectorAll('.order-status-select').forEach(select => {
    select.addEventListener('change', async function() {
        const orderId = this.dataset.orderId;
        const newStatus = this.value;
        const originalStatus = this.dataset.originalStatus;

        try {
            const response = await fetch(`/admin/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();

            if (data.success) {
                // Update the original status
                this.dataset.originalStatus = newStatus;
                
                // Show success message
                showToast('Success', 'Order status updated successfully');
                
                // Update status badge if exists
                const statusBadge = document.querySelector(`#order-${orderId}-status`);
                if (statusBadge) {
                    statusBadge.className = `badge bg-${getStatusColor(newStatus)}`;
                    statusBadge.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                }
            } else {
                // Revert select to original value
                this.value = originalStatus;
                showToast('Error', data.message || 'Failed to update order status', true);
            }
        } catch (error) {
            // Revert select to original value
            this.value = originalStatus;
            showToast('Error', 'Failed to update order status', true);
        }
    });
});

// Helper function to get status color
function getStatusColor(status) {
    switch (status) {
        case 'completed':
            return 'success';
        case 'cancelled':
            return 'danger';
        case 'processing':
            return 'info';
        default:
            return 'warning';
    }
}

// Toast helper
function showToast(title, message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast show position-fixed bottom-0 end-0 m-3 ${isError ? 'bg-danger text-white' : ''}`;
    toast.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">${title}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">${message}</div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
} 