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
    newLogos: []
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
    // Add all other 13 charts here (velocity, logos, cumulative, renewal, burn, cac, nrr, pipeline, churn, magic, ltvcac, cash, growth)
    // Using the same structure as HubSpot version but with Google Sheets data

    // For now, using sample data - you can customize these based on your Metrics sheet
    const metrics = dashboardData.metrics;

    // Renewal Rate Gauge
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

    // Add more charts as needed...
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
