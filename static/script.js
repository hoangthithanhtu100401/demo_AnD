async function convertCurrency() {
    const amount = document.getElementById('amount').value;
    const fromCurrency = document.getElementById('from-currency').value;
    const toCurrency = document.getElementById('to-currency').value;

    if (!amount || isNaN(amount)) {
        alert('Vui lòng nhập số tiền hợp lệ!');
        return;
    }

    try {
        const response = await fetch('/convert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                from_currency: fromCurrency,
                to_currency: toCurrency
            })
        });

        const data = await response.json();
        if (data.error) {
            alert(data.error);
            return;
        }

        document.getElementById('result').value = data.result;
        document.getElementById('current-rate').textContent = 
            `1 ${fromCurrency} = ${data.rate} ${toCurrency}`;

        // Hiển thị bảng chuyển đổi nhanh
        const quickConversions = document.getElementById('quick-conversions');
        quickConversions.innerHTML = data.quick_conversions.map(conv => `
            <div class="quick-conversion-item">
                ${conv.amount} ${fromCurrency} = ${conv.result.toFixed(2)} ${toCurrency}
            </div>
        `).join('');

        document.getElementById('rate-info').style.display = 'block';
        
        // Cập nhật bảng tỷ giá với các loại tiền tệ khác
        updateAllRates(fromCurrency);

    } catch (error) {
        alert('Có lỗi xảy ra khi chuyển đổi tiền tệ!');
        console.error('Error:', error);
    }
}

async function updateAllRates(currency) {
    try {
        const response = await fetch('/get_all_rates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currency: currency
            })
        });

        const rates = await response.json();
        if (rates.error) {
            alert(rates.error);
            return;
        }

        const ratesGrid = document.getElementById('rates-grid');
        ratesGrid.innerHTML = Object.entries(rates)
            .filter(([code]) => code !== currency)
            .map(([code, rate]) => `
                <div class="rate-card">
                    <div class="rate-code">${code}</div>
                    <div class="rate-value">${rate}</div>
                    <div class="rate-text">1 ${currency} = ${rate} ${code}</div>
                </div>
            `).join('');

    } catch (error) {
        console.error('Error fetching all rates:', error);
    }
}

function swapCurrencies() {
    const fromCurrency = document.getElementById('from-currency');
    const toCurrency = document.getElementById('to-currency');
    const temp = fromCurrency.value;
    
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;
    
    // Nếu đã có kết quả, tự động chuyển đổi lại
    if (document.getElementById('result').value) {
        convertCurrency();
    }
}

// Chart variables
let comparisonChart = null;
let topCurrenciesChart = null;
let distributionChart = null;

// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', () => {
    const fromCurrency = document.getElementById('from-currency').value;
    updateAllRates(fromCurrency);
    initializeCharts();
    startRealTimeUpdates();
    
    // Add double-click to fullscreen
    document.querySelectorAll('.chart-container').forEach(container => {
        container.addEventListener('dblclick', () => {
            toggleChartFullscreen(container);
        });
    });
});

// Initialize all charts
function initializeCharts() {
    const baseCurrency = document.getElementById('base-currency-chart').value || 'USD';
    createComparisonChart(baseCurrency);
    createTopCurrenciesChart();
    createDistributionChart();
}

// Update charts when button is clicked
async function updateCharts() {
    const baseCurrency = document.getElementById('base-currency-chart').value;
    showChartLoading();
    
    try {
        await createComparisonChart(baseCurrency);
        await createTopCurrenciesChart();
        await createDistributionChart();
        hideChartLoading();
    } catch (error) {
        console.error('Error updating charts:', error);
        hideChartLoading();
    }
}

// Show loading state for charts
function showChartLoading() {
    const containers = document.querySelectorAll('.chart-container canvas');
    containers.forEach(canvas => {
        canvas.style.opacity = '0.5';
    });
}

// Hide loading state for charts
function hideChartLoading() {
    const containers = document.querySelectorAll('.chart-container canvas');
    containers.forEach(canvas => {
        canvas.style.opacity = '1';
    });
}

// Enhanced chart functionality with more features
function addChartInfoCards(containerId, data) {
    const container = document.getElementById(containerId).parentElement;
    
    // Remove existing info cards
    const existingInfo = container.querySelector('.chart-info');
    if (existingInfo) {
        existingInfo.remove();
    }
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'chart-info';
    
    if (data.type === 'comparison') {
        const highest = data.highest;
        const lowest = data.lowest;
        const average = data.average;
        
        infoDiv.innerHTML = `
            <div class="chart-info-card">
                <h3>Cao nhất</h3>
                <p>${highest.currency}: ${highest.rate.toFixed(4)}</p>
            </div>
            <div class="chart-info-card">
                <h3>Thấp nhất</h3>
                <p>${lowest.currency}: ${lowest.rate.toFixed(4)}</p>
            </div>
            <div class="chart-info-card">
                <h3>Trung bình</h3>
                <p>${average.toFixed(4)}</p>
            </div>
        `;
    } else if (data.type === 'distribution') {
        infoDiv.innerHTML = `
            <div class="chart-info-card">
                <h3>Tổng số loại tiền</h3>
                <p>${data.total} loại tiền tệ</p>
            </div>
            <div class="chart-info-card">
                <h3>Phổ biến nhất</h3>
                <p>Khoảng ${data.mostCommon}</p>
            </div>
        `;
    }
    
    container.insertBefore(infoDiv, container.querySelector('canvas'));
}

// Create comparison chart
async function createComparisonChart(baseCurrency) {
    try {
        const response = await fetch('/get_all_rates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currency: baseCurrency
            })
        });

        const rates = await response.json();
        if (rates.error) {
            console.error('Error fetching rates:', rates.error);
            return;
        }

        // Select top 10 currencies for comparison
        const currencies = Object.entries(rates)
            .filter(([code]) => code !== baseCurrency)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);

        // Calculate statistics
        const rateValues = currencies.map(([, rate]) => parseFloat(rate));
        const highest = { currency: currencies[0][0], rate: rateValues[0] };
        const lowest = { currency: currencies[currencies.length - 1][0], rate: rateValues[rateValues.length - 1] };
        const average = rateValues.reduce((sum, rate) => sum + rate, 0) / rateValues.length;

        // Add info cards
        addChartInfoCards('comparisonChart', {
            type: 'comparison',
            highest,
            lowest,
            average
        });

        const ctx = document.getElementById('comparisonChart').getContext('2d');

        // Destroy existing chart
        if (comparisonChart) {
            comparisonChart.destroy();
        }

        comparisonChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: currencies.map(([code]) => code),
                datasets: [{
                    label: `Tỷ giá so với ${baseCurrency}`,
                    data: rateValues,
                    backgroundColor: currencies.map((_, index) => {
                        const hue = (index * 360) / currencies.length;
                        return `hsla(${hue}, 70%, 60%, 0.8)`;
                    }),
                    borderColor: currencies.map((_, index) => {
                        const hue = (index * 360) / currencies.length;
                        return `hsla(${hue}, 70%, 50%, 1)`;
                    }),
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                    hoverBackgroundColor: currencies.map((_, index) => {
                        const hue = (index * 360) / currencies.length;
                        return `hsla(${hue}, 70%, 70%, 0.9)`;
                    }),
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `1 ${baseCurrency} = ${context.parsed.y.toFixed(4)} ${context.label}`;
                            },
                            afterLabel: function(context) {
                                const percentage = ((context.parsed.y / average) * 100).toFixed(1);
                                return `${percentage}% của trung bình`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(2);
                            },
                            color: '#666'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#666'
                        }
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeOutQuart',
                    onComplete: function() {
                        // Add sparkle effect after animation
                        this.ctx.save();
                        this.ctx.globalAlpha = 0.3;
                        this.ctx.fillStyle = '#FFD700';
                        // Add small sparkles on top of bars
                        this.data.datasets[0].data.forEach((value, index) => {
                            const meta = this.getDatasetMeta(0);
                            const bar = meta.data[index];
                            this.ctx.beginPath();
                            this.ctx.arc(bar.x, bar.y - 10, 3, 0, 2 * Math.PI);
                            this.ctx.fill();
                        });
                        this.ctx.restore();
                    }
                }
            }
        });

    } catch (error) {
        console.error('Error creating comparison chart:', error);
    }
}

// Create top currencies chart
async function createTopCurrenciesChart() {
    try {
        // Use USD as base for determining strongest currencies
        const response = await fetch('/get_all_rates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currency: 'USD'
            })
        });

        const rates = await response.json();
        if (rates.error) {
            console.error('Error fetching rates:', rates.error);
            return;
        }

        // Get currencies with lowest rates (strongest against USD)
        const strongestCurrencies = Object.entries(rates)
            .filter(([code]) => code !== 'USD')
            .sort(([,a], [,b]) => a - b)
            .slice(0, 10);

        const ctx = document.getElementById('topCurrenciesChart').getContext('2d');

        // Destroy existing chart
        if (topCurrenciesChart) {
            topCurrenciesChart.destroy();
        }

        topCurrenciesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: strongestCurrencies.map(([code]) => code),
                datasets: [{
                    label: 'Loại tiền mạnh nhất',
                    data: strongestCurrencies.map(([, rate]) => 1 / parseFloat(rate)),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#4BC0C0', '#FF6384'
                    ],
                    borderColor: '#fff',
                    borderWidth: 3,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const rate = strongestCurrencies[context.dataIndex][1];
                                return `${context.label}: 1 USD = ${rate} ${context.label}`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1500
                }
            }
        });

    } catch (error) {
        console.error('Error creating top currencies chart:', error);
    }
}

// Create distribution chart
async function createDistributionChart() {
    try {
        const response = await fetch('/get_all_rates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                currency: 'USD'
            })
        });

        const rates = await response.json();
        if (rates.error) {
            console.error('Error fetching rates:', rates.error);
            return;
        }

        // Create distribution ranges
        const ranges = [
            { label: '< 1', min: 0, max: 1, count: 0 },
            { label: '1-10', min: 1, max: 10, count: 0 },
            { label: '10-100', min: 10, max: 100, count: 0 },
            { label: '100-1000', min: 100, max: 1000, count: 0 },
            { label: '> 1000', min: 1000, max: Infinity, count: 0 }
        ];

        Object.values(rates).forEach(rate => {
            const numRate = parseFloat(rate);
            ranges.forEach(range => {
                if (numRate >= range.min && numRate < range.max) {
                    range.count++;
                }
            });
        });

        const ctx = document.getElementById('distributionChart').getContext('2d');

        // Destroy existing chart
        if (distributionChart) {
            distributionChart.destroy();
        }

        distributionChart = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: ranges.map(r => r.label),
                datasets: [{
                    label: 'Số lượng loại tiền',
                    data: ranges.map(r => r.count),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 205, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 205, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed} loại tiền`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        }
                    }
                },
                animation: {
                    duration: 1200,
                    easing: 'easeOutBounce'
                }
            }
        });

    } catch (error) {
        console.error('Error creating distribution chart:', error);
    }
}

// Add chart update to currency conversion
const originalConvertCurrency = convertCurrency;
convertCurrency = async function() {
    await originalConvertCurrency();
    
    // Update charts if they exist
    if (comparisonChart || topCurrenciesChart || distributionChart) {
        const baseCurrency = document.getElementById('from-currency').value;
        document.getElementById('base-currency-chart').value = baseCurrency;
        setTimeout(updateCharts, 500); // Small delay to let conversion complete
    }
};

// Add real-time chart updates
function startRealTimeUpdates() {
    setInterval(async () => {
        if (document.hasFocus()) { // Only update when tab is active
            const baseCurrency = document.getElementById('base-currency-chart').value;
            await updateCharts();
        }
    }, 60000); // Update every minute
}

// Add chart export functionality
function exportChart(chartId, filename) {
    const canvas = document.getElementById(chartId);
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = filename || 'chart.png';
    link.href = url;
    link.click();
}

// Add chart fullscreen functionality
function toggleChartFullscreen(chartContainer) {
    if (chartContainer.classList.contains('fullscreen')) {
        chartContainer.classList.remove('fullscreen');
        chartContainer.style.position = '';
        chartContainer.style.top = '';
        chartContainer.style.left = '';
        chartContainer.style.width = '';
        chartContainer.style.height = '';
        chartContainer.style.zIndex = '';
        chartContainer.style.background = '';
    } else {
        chartContainer.classList.add('fullscreen');
        chartContainer.style.position = 'fixed';
        chartContainer.style.top = '0';
        chartContainer.style.left = '0';
        chartContainer.style.width = '100vw';
        chartContainer.style.height = '100vh';
        chartContainer.style.zIndex = '9999';
        chartContainer.style.background = 'white';
    }
}

// Enhanced initialization
document.addEventListener('DOMContentLoaded', () => {
    const fromCurrency = document.getElementById('from-currency').value;
    updateAllRates(fromCurrency);
    initializeCharts();
    startRealTimeUpdates();
    
    // Add double-click to fullscreen
    document.querySelectorAll('.chart-container').forEach(container => {
        container.addEventListener('dblclick', () => {
            toggleChartFullscreen(container);
        });
    });
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
        switch(e.key) {
            case 'u':
                e.preventDefault();
                updateCharts();
                break;
            case 'e':
                e.preventDefault();
                exportChart('comparisonChart', 'currency-comparison.png');
                break;
        }
    }
    if (e.key === 'Escape') {
        document.querySelectorAll('.chart-container.fullscreen').forEach(container => {
            toggleChartFullscreen(container);
        });
    }
});