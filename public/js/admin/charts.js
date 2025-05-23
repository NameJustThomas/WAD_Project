/**
 * Chart Module
 * Purpose: Handle chart initialization and configuration
 * Features:
 * - Line chart for time series data
 * - Bar chart for comparison data
 * - Consistent styling
 * - Responsive design
 */

const ChartConfig = {
    colors: {
        primary: '#17a2b8',
        secondary: '#6c757d',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545'
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top'
            }
        }
    }
};

class AdminCharts {
    static createLineChart(elementId, data, options = {}) {
        const ctx = document.getElementById(elementId).getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label || 'Data',
                    data: data.values,
                    borderColor: options.color || ChartConfig.colors.primary,
                    tension: 0.1
                }]
            },
            options: { ...ChartConfig.options, ...options }
        });
    }

    static createBarChart(elementId, data, options = {}) {
        const ctx = document.getElementById(elementId).getContext('2d');
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label || 'Data',
                    data: data.values,
                    backgroundColor: options.color || ChartConfig.colors.primary
                }]
            },
            options: { ...ChartConfig.options, ...options }
        });
    }

    // Specific chart initializations
    static initAnalyticsCharts(data) {
        this.createLineChart('salesChart', {
            labels: data.salesData.labels,
            values: data.salesData.values,
            label: 'Sales'
        });

        this.createBarChart('productsChart', {
            labels: data.productsData.labels,
            values: data.productsData.values,
            label: 'Units Sold'
        });
    }

    static initDashboardCharts(data) {
        this.createLineChart('monthlySalesChart', {
            labels: data.monthlySalesData.labels,
            values: data.monthlySalesData.values,
            label: 'Monthly Sales'
        });
    }
} 