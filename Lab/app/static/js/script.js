(function() {
    'use strict';

    // Form loading state
    // Show loading overlay on form submit
const form = document.getElementById('predictionForm');
const overlay = document.getElementById('loadingOverlay');

if (form) {
    form.addEventListener('submit', function(e) {
        overlay.style.display = 'flex';
    });
}

// Hide overlay when page loads (in case of back button)
window.addEventListener('pageshow', function() {
    if (overlay) overlay.style.display = 'none';
});

    // Fetch chart data and render
    async function initCharts() {
        try {
            const response = await fetch('/api/chart_data');
            const data = await response.json();
            
            // Glucose Distribution Chart (Histogram)
            const glucoseCtx = document.getElementById('glucoseChart').getContext('2d');
            new Chart(glucoseCtx, {
                type: 'bar',
                data: {
                    labels: Array.from({length: 20}, (_, i) => (i*10)+50),
                    datasets: [
                        {
                            label: 'Non-Diabetic',
                            data: histogramData(data.non_diabetic_glucose, 20, 50, 250),
                            backgroundColor: 'rgba(31, 154, 110, 0.6)',
                            borderColor: '#1f9a6e',
                            borderWidth: 1
                        },
                        {
                            label: 'Diabetic',
                            data: histogramData(data.diabetic_glucose, 20, 50, 250),
                            backgroundColor: 'rgba(197, 59, 28, 0.6)',
                            borderColor: '#c53b1c',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'top' }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Glucose (mg/dL)' } },
                        y: { title: { display: true, text: 'Frequency' } }
                    }
                }
            });

            // Age Trend Chart
            const ageCtx = document.getElementById('ageTrendChart').getContext('2d');
            new Chart(ageCtx, {
                type: 'line',
                data: {
                    labels: data.age_labels,
                    datasets: [{
                        label: 'Diabetes Prevalence (%)',
                        data: data.age_prevalence,
                        borderColor: '#2c7da0',
                        backgroundColor: 'rgba(44, 125, 160, 0.1)',
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#0b4f6c',
                        pointRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: { callbacks: { label: (ctx) => `${ctx.raw}%` } }
                    },
                    scales: {
                        y: { beginAtZero: true, title: { display: true, text: 'Prevalence (%)' } }
                    }
                }
            });

            // Feature Importance Chart
            const impCtx = document.getElementById('importanceChart').getContext('2d');
            new Chart(impCtx, {
                type: 'bar',
                data: {
                    labels: data.feature_names,
                    datasets: [{
                        label: 'Feature Importance',
                        data: data.feature_importance,
                        backgroundColor: '#2c7da0',
                        borderRadius: 8
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Importance Score' } }
                    }
                }
            });

        } catch (error) {
            console.error('Error loading chart data:', error);
        }
    }

    // Fetch yearly trends and render chart
async function initYearlyChart() {
    try {
        const response = await fetch('/api/yearly_trends');
        const data = await response.json();
        
        const ctx = document.getElementById('yearlyTrendChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.years,
                datasets: [
                    {
                        label: 'Prevalence (%)',
                        data: data.prevalence,
                        borderColor: '#c53b1c',
                        backgroundColor: 'rgba(197,59,28,0.05)',
                        yAxisID: 'y',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Model Recall',
                        data: data.recall,
                        borderColor: '#2c7da0',
                        backgroundColor: 'transparent',
                        yAxisID: 'y1',
                        tension: 0.3,
                        borderDash: [5,5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index' },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                let label = ctx.dataset.label || '';
                                let val = ctx.raw;
                                if (ctx.dataset.label.includes('Prevalence')) return `${label}: ${val}%`;
                                return `${label}: ${val.toFixed(3)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 4,
                        title: { display: true, text: 'Prevalence (%)' }
                    },
                    y1: {
                        position: 'right',
                        beginAtZero: false,
                        min: 0.6,
                        max: 0.9,
                        title: { display: true, text: 'Recall' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
        
        // Update trend indicator
        const trendSpan = document.getElementById('trendIndicator');
        const arrow = data.trend_direction === 'increasing' ? '↑' : '↓';
        const color = data.trend_direction === 'increasing' ? '#c53b1c' : '#1f9a6e';
        trendSpan.innerHTML = `<span style="color:${color};">${arrow} ${Math.abs(data.percent_change)}% change since 2000</span>`;
        
        // Fetch agent insight
        const insightRes = await fetch('/api/agent_insight');
        const insightData = await insightRes.json();
        document.querySelector('#agentInsight span').textContent = insightData.insight;
        
    } catch (error) {
        console.error('Yearly chart error:', error);
    }
}

// Call after other charts init
document.addEventListener('DOMContentLoaded', function() {
    initCharts();        // existing glucose/age/importance charts
    initYearlyChart();   // new yearly trend chart
});

    // Helper: Create histogram bins
    function histogramData(arr, bins, min, max) {
        const binWidth = (max - min) / bins;
        const counts = new Array(bins).fill(0);
        arr.forEach(val => {
            if (val >= min && val < max) {
                const idx = Math.min(Math.floor((val - min) / binWidth), bins-1);
                counts[idx]++;
            }
        });
        return counts;
    }

    initCharts();
})();