/**
 * Analytics Module
 * Purpose: Handle analytics-specific functionality
 * Features:
 * - Date range selection
 * - Data filtering
 * - Chart updates
 * - Export functionality
 */

class AdminAnalytics {
    constructor() {
        this.filters = {
            startDate: '',
            endDate: '',
            category: '',
            status: ''
        };
        this.init();
    }

    init() {
        // Initialize date range picker
        this.initDateRangePicker();
        
        // Initialize event listeners
        this.initEventListeners();
        
        // Load initial data
        this.loadData();
    }

    initDateRangePicker() {
        // Set default date range (last 6 months)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6);
        
        this.filters.startDate = startDate.toISOString().split('T')[0];
        this.filters.endDate = endDate.toISOString().split('T')[0];
        
        // Update date inputs
        document.getElementById('startDate').value = this.filters.startDate;
        document.getElementById('endDate').value = this.filters.endDate;
    }

    initEventListeners() {
        // Date range change
        document.getElementById('startDate').addEventListener('change', (e) => {
            this.filters.startDate = e.target.value;
            this.loadData();
        });
        
        document.getElementById('endDate').addEventListener('change', (e) => {
            this.filters.endDate = e.target.value;
            this.loadData();
        });

        // Category filter
        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.loadData();
        });

        // Status filter
        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.loadData();
        });

        // Export buttons
        document.getElementById('exportSales').addEventListener('click', () => this.exportData('sales'));
        document.getElementById('exportProducts').addEventListener('click', () => this.exportData('products'));
    }

    async loadData() {
        try {
            const response = await fetch('/admin/analytics/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.filters)
            });

            if (!response.ok) {
                throw new Error('Failed to load analytics data');
            }

            const data = await response.json();
            
            // Update charts using the AdminCharts class
            AdminCharts.updateSalesChart(data.salesData);
            AdminCharts.updateProductsChart(data.productsData);
            
            // Update summary cards
            this.updateSummaryCards(data);
        } catch (error) {
            console.error('Error loading analytics data:', error);
            // Show error message to user
            alert('Failed to load analytics data. Please try again.');
        }
    }

    updateSummaryCards(data) {
        // Update total sales
        const totalSales = data.salesData.values.reduce((a, b) => a + b, 0);
        document.getElementById('totalSales').textContent = `$${totalSales.toFixed(2)}`;
        
        // Update total orders
        document.getElementById('totalOrders').textContent = data.totalOrders || 0;
        
        // Update average order value
        const avgOrderValue = totalSales / (data.totalOrders || 1);
        document.getElementById('avgOrderValue').textContent = `$${avgOrderValue.toFixed(2)}`;
    }

    async exportData(type) {
        try {
            const response = await fetch(`/admin/analytics/export/${type}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    filters: this.filters,
                    format: 'csv'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to export data');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}_report.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Failed to export data. Please try again.');
        }
    }
}

// Initialize analytics when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.adminAnalytics = new AdminAnalytics();
});
