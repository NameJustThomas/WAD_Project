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

class ChartManager {
    static createLineChart(canvasId, data) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label,
                    data: data.values,
                    borderColor: '#17a2b8',
                    backgroundColor: 'rgba(23, 162, 184, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 15
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        right: 10,
                        bottom: 10,
                        left: 10
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(2);
                            },
                            maxTicksLimit: 5
                        },
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 6
                        }
                    }
                }
            }
        });
    }

    static createBarChart(canvasId, data) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.label,
                    data: data.values,
                    backgroundColor: '#28a745',
                    borderColor: '#28a745',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 15
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 10,
                        right: 10,
                        bottom: 10,
                        left: 10
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1,
                            maxTicksLimit: 5
                        },
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 5
                        }
                    }
                }
            }
        });
    }

    // Specific chart initializations
    static initAnalyticsCharts(data) {
        // Parse the data from the data attributes
        const salesChartData = JSON.parse(document.getElementById('analyticsData').dataset.sales);
        const productsChartData = JSON.parse(document.getElementById('analyticsData').dataset.products);

        // Initialize charts with the parsed data
        this.createLineChart('salesChart', {
            labels: salesChartData.data.labels,
            values: salesChartData.data.datasets[0].data,
            label: salesChartData.data.datasets[0].label
        });

        this.createBarChart('productsChart', {
            labels: productsChartData.data.labels,
            values: productsChartData.data.datasets[0].data,
            label: productsChartData.data.datasets[0].label
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

// Initialize charts when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const analyticsData = document.getElementById('analyticsData');
    if (analyticsData) {
        ChartManager.initAnalyticsCharts();
    }
}); 