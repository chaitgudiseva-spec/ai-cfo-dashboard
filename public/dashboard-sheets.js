// Color scheme
const colors = {
    primary: '#ff7a59',
    secondary: '#ff9a8d',
    teal: '#4eccc5',
    navy: '#516f90',
    yellow: '#ffd199',
    green: '#7bc96f',
    red: '#e85d75',
    lightGray: '#eaf0f6'
};

// Configuration
let config = {
    arrTarget: localStorage.getItem('arr_target') || 675000
};

// Chart instances (global so we can update them)
let charts = {};

// Store data for chat queries
let dashboardData = {
    deals: [],
    metrics: {},
    bookings: [],
    newLogos: [],
    metricsTimeseries: []
};

// Load data from Google Sheets
async function loadData() {
    try {
        console.log('Fetching data from Google Sheets...');
        const response = await fetch('/api/sheets');
        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to load data');
        }

        console.log('Data loaded successfully:', data);

        // Store data
        dashboardData.deals = data.deals || [];
        dashboardData.metrics = data.metrics || {};
        dashboardData.bookings = data.bookings || [];
        dashboardData.newLogos = data.newLogos || [];
        dashboardData.metricsTimeseries = data.metricsTimeseries || [];

        // Update all charts and metrics
        updateAllCharts();

        addMessage(`✅ Successfully loaded ${dashboardData.deals.length} deals from Google Sheets!`, 'ai');
    } catch (error) {
        console.error('Error loading data:', error);
        addMessage(`❌ Error: ${error.message}`, 'ai');
    }
}

function updateAllCharts() {
    // Update ARR gauge
    const arrValue = parseFloat(dashboardData.metrics.current_arr || 2513000);
    updateARRGauge(arrValue);

    // Initialize all other charts
    initCharts();

    // Update top deals table
    displayTopDeals(dashboardData.deals);
}

function updateARRGauge(value) {
    const valueInK = value / 1000;
    const target = config.arrTarget / 1000;

    document.getElementById('arr-value').textContent = `${valueInK.toFixed(2)}K`;

    // Update the chart
    if (charts.arr) {
        charts.arr.data.datasets[0].data = [valueInK, Math.max(0, target - valueInK)];
        charts.arr.update();
    }
}

function displayTopDeals(deals) {
    // Filter out closed/lost deals
    const openDeals = deals.filter(deal => {
        const stage = (deal.stage || '').toLowerCase();
        return !stage.includes('closedwon') && !stage.includes('closedlost');
    });

    // Sort by amount and take top 5
    const topDeals = openDeals
        .sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0))
        .slice(0, 5);

    const tbody = document.getElementById('topDealsBody');

    if (topDeals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #7c98b6;">
                    No open deals found
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = topDeals.map(deal => {
        const name = deal.deal_name || 'Untitled Deal';
        const amount = parseFloat(deal.amount || 0);
        const stage = deal.stage || 'Unknown';
        const closeDate = deal.close_date
            ? new Date(deal.close_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Not set';
        const probability = deal.probability || 'N/A';

        let stageClass = '';
        if (stage.toLowerCase().includes('qualified')) stageClass = 'qualified';
        else if (stage.toLowerCase().includes('proposal')) stageClass = 'proposal';
        else if (stage.toLowerCase().includes('negotiat')) stageClass = 'negotiation';

        return `
            <tr>
                <td class="deal-name">${name}</td>
                <td class="deal-amount">$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                <td><span class="deal-stage ${stageClass}">${stage}</span></td>
                <td>${closeDate}</td>
                <td>${probability}%</td>
            </tr>
        `;
    }).join('');
}

// Initialize all charts with data from Google Sheets
function initCharts() {
    // Row 1, Col 1: ARR Gauge
    const arrCtx = document.getElementById('arrGauge').getContext('2d');
    const arrValue = parseFloat(dashboardData.metrics.current_arr || 2513000) / 1000;
    const arrTarget = config.arrTarget / 1000;

    if (charts.arr) charts.arr.destroy();
    charts.arr = new Chart(arrCtx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [arrValue, Math.max(0, arrTarget - arrValue)],
                backgroundColor: [colors.red, colors.lightGray],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        }
    });

    // Initialize other charts (using sample/static data for now - you can customize based on your needs)
    initOtherCharts();
}

function initOtherCharts() {
    // Row 1, Col 2: ACV Bookings
    const acvCtx = document.getElementById('acvChart').getContext('2d');
    if (charts.acv) charts.acv.destroy();
    charts.acv = new Chart(acvCtx, {
        type: 'bar',
        data: {
            labels: ['Q1 24', 'Q2 24', 'Q3 24', 'Q4 24', 'Q1 25', 'Q2 25'],
            datasets: [{
                label: 'New Customer',
                data: dashboardData.bookings.map(b => parseFloat(b.new_customer || 0)),
                backgroundColor: colors.secondary,
                stack: 'stack0'
            }, {
                label: 'Existing Customer',
                data: dashboardData.bookings.map(b => parseFloat(b.existing_customer || 0)),
                backgroundColor: colors.teal,
                stack: 'stack0'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Continue with rest of charts...
    initRemainingCharts();
}

function initRemainingCharts() {
    const metrics = dashboardData.metrics;
    const timeseries = dashboardData.metricsTimeseries;

    // Helper function to get timeseries data by type
    const getTimeseriesData = (type) => {
        return timeseries.filter(t => t.type === type);
    };

    // Row 1, Col 3: Deal Velocity
    const velocityData = getTimeseriesData('Deal Velocity');
    const velocityCtx = document.getElementById('velocityChart').getContext('2d');
    if (charts.velocity) charts.velocity.destroy();
    charts.velocity = new Chart(velocityCtx, {
        type: 'bar',
        data: {
            labels: velocityData.map(d => d.period),
            datasets: [{
                data: velocityData.map(d => parseFloat(d.value)),
                backgroundColor: colors.secondary
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });

    // Row 2, Col 1: New Logos
    const logosCtx = document.getElementById('logosChart').getContext('2d');
    if (charts.logos) charts.logos.destroy();
    charts.logos = new Chart(logosCtx, {
        type: 'bar',
        data: {
            labels: dashboardData.newLogos.map(l => l.year),
            datasets: [{
                label: 'Companies',
                data: dashboardData.newLogos.map(l => parseFloat(l.companies)),
                backgroundColor: colors.secondary,
                yAxisID: 'y'
            }, {
                label: 'Avg ACV',
                data: dashboardData.newLogos.map(l => parseFloat(l.average_acv) / 1000),
                backgroundColor: colors.navy,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { type: 'linear', position: 'left' },
                y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false } }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Row 2, Col 2: Cumulative ARR
    const cumulativeData = getTimeseriesData('Cumulative ARR');
    const cumulativeCtx = document.getElementById('cumulativeChart').getContext('2d');
    if (charts.cumulative) charts.cumulative.destroy();
    charts.cumulative = new Chart(cumulativeCtx, {
        type: 'line',
        data: {
            labels: cumulativeData.map(d => d.period),
            datasets: [{
                data: cumulativeData.map(d => parseFloat(d.value)),
                borderColor: colors.secondary,
                backgroundColor: 'transparent',
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: colors.secondary
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });

    // Row 2, Col 3: Renewal Rate Gauge
    const renewalCtx = document.getElementById('renewalGauge').getContext('2d');
    const renewalRate = parseFloat(metrics.gross_renewal_rate || 92.5);
    if (charts.renewal) charts.renewal.destroy();
    charts.renewal = new Chart(renewalCtx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [renewalRate, 100 - renewalRate],
                backgroundColor: [colors.green, colors.lightGray],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });

    // Row 3, Col 1: Burn Multiple Gauge
    const burnCtx = document.getElementById('burnGauge').getContext('2d');
    const burnMultiple = parseFloat(metrics.burn_multiple || 1.2);
    if (charts.burn) charts.burn.destroy();
    charts.burn = new Chart(burnCtx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [burnMultiple, Math.max(0, 2 - burnMultiple)],
                backgroundColor: [colors.green, colors.lightGray],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });

    // Row 3, Col 2: CAC Payback
    const cacData = getTimeseriesData('CAC Payback');
    const cacCtx = document.getElementById('cacChart').getContext('2d');
    if (charts.cac) charts.cac.destroy();
    charts.cac = new Chart(cacCtx, {
        type: 'bar',
        data: {
            labels: cacData.map(d => d.period),
            datasets: [{
                data: cacData.map(d => parseFloat(d.value)),
                backgroundColor: colors.navy
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });

    // Row 3, Col 3: NRR
    const nrrData = getTimeseriesData('NRR History');
    const nrrCtx = document.getElementById('nrrChart').getContext('2d');
    if (charts.nrr) charts.nrr.destroy();
    charts.nrr = new Chart(nrrCtx, {
        type: 'line',
        data: {
            labels: nrrData.map(d => d.period),
            datasets: [{
                data: nrrData.map(d => parseFloat(d.value)),
                borderColor: colors.teal,
                backgroundColor: 'transparent',
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: colors.teal
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: false, min: 100 } },
            plugins: { legend: { display: false } }
        }
    });

    // Row 4, Col 1: Pipeline Coverage
    const pipelineData = getTimeseriesData('Pipeline Coverage');
    const pipelineCtx = document.getElementById('pipelineChart').getContext('2d');
    if (charts.pipeline) charts.pipeline.destroy();
    charts.pipeline = new Chart(pipelineCtx, {
        type: 'bar',
        data: {
            labels: pipelineData.map(d => d.period),
            datasets: [{
                data: pipelineData.map(d => parseFloat(d.value)),
                backgroundColor: colors.teal
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });

    // Row 4, Col 2: Churn Gauge
    const churnCtx = document.getElementById('churnGauge').getContext('2d');
    const churnRate = parseFloat(metrics.logo_churn_rate || 2.8);
    if (charts.churn) charts.churn.destroy();
    charts.churn = new Chart(churnCtx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [churnRate, 10 - churnRate],
                backgroundColor: [colors.green, colors.lightGray],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });

    // Row 4, Col 3: Magic Number
    const magicData = getTimeseriesData('Magic Number History');
    const magicCtx = document.getElementById('magicChart').getContext('2d');
    if (charts.magic) charts.magic.destroy();
    charts.magic = new Chart(magicCtx, {
        type: 'bar',
        data: {
            labels: magicData.map(d => d.period),
            datasets: [{
                data: magicData.map(d => parseFloat(d.value)),
                backgroundColor: colors.primary
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });

    // Row 5, Col 1: LTV:CAC Gauge
    const ltvCacCtx = document.getElementById('ltvCacGauge').getContext('2d');
    const ltvCac = parseFloat(metrics.ltv_to_cac_ratio || 4.2);
    if (charts.ltvCac) charts.ltvCac.destroy();
    charts.ltvCac = new Chart(ltvCacCtx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [ltvCac, Math.max(0, 5 - ltvCac)],
                backgroundColor: [colors.green, colors.lightGray],
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        }
    });

    // Row 5, Col 2: Cash Runway
    const cashData = getTimeseriesData('Cash Balance');
    const cashCtx = document.getElementById('cashChart').getContext('2d');
    if (charts.cash) charts.cash.destroy();
    charts.cash = new Chart(cashCtx, {
        type: 'line',
        data: {
            labels: cashData.map(d => d.period),
            datasets: [{
                label: 'Cash ($M)',
                data: cashData.map(d => parseFloat(d.value)),
                borderColor: colors.green,
                backgroundColor: 'transparent',
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: colors.green
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: false } },
            plugins: { legend: { display: false } }
        }
    });

    // Row 5, Col 3: ARR Growth Rate
    const growthData = getTimeseriesData('ARR Growth Rate');
    const growthCtx = document.getElementById('growthChart').getContext('2d');
    if (charts.growth) charts.growth.destroy();
    charts.growth = new Chart(growthCtx, {
        type: 'bar',
        data: {
            labels: growthData.map(d => d.period),
            datasets: [{
                data: growthData.map(d => parseFloat(d.value)),
                backgroundColor: colors.primary
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

// Chat Functionality
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');

function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    addMessage(message, 'user');
    chatInput.value = '';

    setTimeout(() => {
        const response = getAIResponse(message);
        addMessage(response, 'ai');
    }, 500);
}

function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.innerHTML = `<div class="message-bubble">${text}</div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getAIResponse(message) {
    const lowerMessage = message.toLowerCase();

    // Check if data is loaded
    if (dashboardData.deals.length === 0) {
        return 'Data is loading. Please wait a moment and try again.';
    }

    const deals = dashboardData.deals;
    const metrics = dashboardData.metrics;
    const openDeals = deals.filter(d => {
        const stage = (d.stage || '').toLowerCase();
        return !stage.includes('closed');
    });

    // Top deals query
    if (lowerMessage.includes('top') && lowerMessage.includes('deal')) {
        const topDeals = openDeals
            .sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0))
            .slice(0, 3);
        const dealsList = topDeals.map(d =>
            `• ${d.deal_name}: $${parseFloat(d.amount || 0).toLocaleString()} (${d.stage})`
        ).join('<br>');
        return `Your top 3 deals in pipeline:<br>${dealsList}`;
    }

    // Pipeline value query
    if (lowerMessage.includes('pipeline') && (lowerMessage.includes('value') || lowerMessage.includes('total'))) {
        const pipelineValue = openDeals.reduce((sum, d) => sum + parseFloat(d.amount || 0), 0);
        return `You have ${openDeals.length} open deals with a total pipeline value of $${pipelineValue.toLocaleString()}.`;
    }

    // ARR query
    if (lowerMessage.includes('arr')) {
        const currentARR = parseFloat(metrics.current_arr || 0);
        const target = config.arrTarget;
        const percentage = ((currentARR / target) * 100).toFixed(1);
        return `Current ARR: $${currentARR.toLocaleString()} (${percentage}% of $${target.toLocaleString()} target).`;
    }

    // Metrics queries
    if (lowerMessage.includes('renewal') || lowerMessage.includes('nrr')) {
        const grr = metrics.gross_renewal_rate || 'N/A';
        const nrr = metrics.net_revenue_retention || 'N/A';
        return `Gross Renewal Rate: ${grr}%, Net Revenue Retention: ${nrr}%`;
    }

    // Default help
    return 'I can help you with:<br>• "Top deals in pipeline"<br>• "Pipeline value"<br>• "ARR progress"<br>• "Renewal rates"<br><br>What would you like to know?';
}

chatInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    addMessage('Hello! Your dashboard is loading data from Google Sheets. Ask me anything about your metrics!', 'ai');
});
