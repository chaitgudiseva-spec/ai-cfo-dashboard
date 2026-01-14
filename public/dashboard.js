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
            accessToken: localStorage.getItem('hubspot_token') || '',
            portalId: localStorage.getItem('hubspot_portal') || '',
            arrTarget: localStorage.getItem('arr_target') || 675000
        };

        // Chart instances (global so we can update them)
        let charts = {};

        // Modal functions
        function openConfigModal() {
            document.getElementById('accessToken').value = config.accessToken;
            document.getElementById('portalId').value = config.portalId;
            document.getElementById('arrTarget').value = config.arrTarget;
            document.getElementById('configModal').classList.add('active');
        }

        function closeConfigModal() {
            document.getElementById('configModal').classList.remove('active');
        }

        function saveConfig() {
            config.accessToken = document.getElementById('accessToken').value.trim();
            config.portalId = document.getElementById('portalId').value.trim();
            config.arrTarget = document.getElementById('arrTarget').value;

            console.log('Saving config with token length:', config.accessToken.length);

            if (!config.accessToken) {
                alert('Please enter a HubSpot access token');
                return;
            }

            localStorage.setItem('hubspot_token', config.accessToken);
            localStorage.setItem('hubspot_portal', config.portalId);
            localStorage.setItem('arr_target', config.arrTarget);

            closeConfigModal();
            loadHubSpotData();
        }

        // HubSpot API Functions
        // Vercel deployment URL - fetches data from HubSpot via serverless function
        const API_BASE = 'https://ai-cfo-dashboard.vercel.app/api/hubspot';

        async function fetchHubSpotDeals() {
            if (!config.accessToken) {
                console.log('No access token configured');
                return null;
            }

            try {
                console.log('Fetching deals from HubSpot...');
                const response = await fetch(`${API_BASE}/crm/v3/objects/deals?limit=100&properties=amount,dealname,dealstage,closedate,createdate,hs_deal_stage_probability`, {
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                console.log('Response status:', response.status);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('HubSpot API error:', errorData);

                    if (response.status === 401) {
                        throw new Error('Invalid or expired HubSpot token. Please create a new Private App token.');
                    } else if (response.status === 403) {
                        throw new Error('Token lacks required permissions. Add crm.objects.deals.read scope.');
                    } else {
                        throw new Error(`HubSpot API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
                    }
                }

                const data = await response.json();
                console.log('Successfully fetched', data.results?.length || 0, 'deals');
                console.log('First deal sample:', data.results?.[0]);
                return data.results || [];
            } catch (error) {
                console.error('Error fetching HubSpot deals:', error);

                // Check if it's a connection error to the proxy
                if (error.message.includes('Failed to fetch') || error.message.includes('Load failed')) {
                    addMessage(`⚠️ Cannot connect to proxy server. Check your internet connection.`, 'ai');
                } else {
                    addMessage(`❌ ${error.message}`, 'ai');
                }
                return [];
            }
        }

        async function fetchHubSpotCompanies() {
            if (!config.accessToken) return null;

            try {
                const response = await fetch(`${API_BASE}/crm/v3/objects/companies?limit=100&properties=name,createdate,lifecyclestage,hs_lead_status`, {
                    headers: {
                        'Authorization': `Bearer ${config.accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) throw new Error(`HubSpot API error: ${response.status}`);
                const data = await response.json();
                return data.results;
            } catch (error) {
                console.error('Error fetching HubSpot companies:', error);
                return null;
            }
        }

        async function loadHubSpotData() {
            addMessage('Loading data from HubSpot...', 'ai');
            console.log('Starting data load...');
            console.log('API Base:', API_BASE);
            console.log('Token configured:', config.accessToken ? 'Yes' : 'No');

            const deals = await fetchHubSpotDeals();
            console.log('Deals returned:', deals ? deals.length : 'null');
            console.log('Deals data type:', typeof deals, Array.isArray(deals));

            const companies = await fetchHubSpotCompanies();
            console.log('Companies returned:', companies ? companies.length : 'null');

            if (deals && deals.length > 0) {
                // Store data for chat queries
                hubspotData.deals = deals;

                processDealsData(deals);
                displayTopDeals(deals);
                addMessage(`✅ Successfully loaded ${deals.length} deals from HubSpot! You can now ask me questions about your data.`, 'ai');
            } else if (deals && deals.length === 0) {
                addMessage('⚠️ No deals found in HubSpot. Your deals list is empty.', 'ai');
                const tbody = document.getElementById('topDealsBody');
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 20px; color: #7c98b6;">
                            No deals in HubSpot
                        </td>
                    </tr>
                `;
            } else {
                addMessage('❌ Failed to load deals. Check the console for errors (press F12).', 'ai');
            }

            if (companies) {
                // Store data for chat queries
                hubspotData.companies = companies;
                addMessage(`✅ Loaded ${companies.length} companies from HubSpot.`, 'ai');
            }
        }

        function displayTopDeals(deals) {
            // Log deal stages to see what we're working with
            console.log('All deal stages:', deals.map(d => d.properties.dealstage));

            // Filter out closed/lost deals and sort by amount
            const openDeals = deals.filter(deal => {
                const stage = (deal.properties.dealstage || '').toLowerCase();
                return !stage.includes('closedwon') && !stage.includes('closedlost');
            });

            console.log(`Filtered ${openDeals.length} open deals from ${deals.length} total deals`);

            // Sort by amount (descending) and take top 5
            const topDeals = openDeals
                .sort((a, b) => {
                    const amountA = parseFloat(a.properties.amount || 0);
                    const amountB = parseFloat(b.properties.amount || 0);
                    return amountB - amountA;
                })
                .slice(0, 5);

            const tbody = document.getElementById('topDealsBody');

            if (topDeals.length === 0) {
                // Show ALL deals if no open deals found
                console.log('No open deals, showing all deals instead');
                const allDealsTop5 = deals
                    .sort((a, b) => parseFloat(b.properties.amount || 0) - parseFloat(a.properties.amount || 0))
                    .slice(0, 5);

                if (allDealsTop5.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; padding: 20px; color: #7c98b6;">
                                No deals found
                            </td>
                        </tr>
                    `;
                    return;
                }

                // Display all deals instead
                tbody.innerHTML = allDealsTop5.map(deal => {
                    const name = deal.properties.dealname || 'Untitled Deal';
                    const amount = parseFloat(deal.properties.amount || 0);
                    const stage = deal.properties.dealstage || 'Unknown';
                    const closeDate = deal.properties.closedate
                        ? new Date(deal.properties.closedate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Not set';
                    const probability = deal.properties.hs_deal_stage_probability
                        ? `${Math.round(deal.properties.hs_deal_stage_probability * 100)}%`
                        : 'N/A';

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
                            <td>${probability}</td>
                        </tr>
                    `;
                }).join('');
                return;
            }

            tbody.innerHTML = topDeals.map(deal => {
                const name = deal.properties.dealname || 'Untitled Deal';
                const amount = parseFloat(deal.properties.amount || 0);
                const stage = deal.properties.dealstage || 'Unknown';
                const closeDate = deal.properties.closedate
                    ? new Date(deal.properties.closedate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Not set';
                const probability = deal.properties.hs_deal_stage_probability
                    ? `${Math.round(deal.properties.hs_deal_stage_probability * 100)}%`
                    : 'N/A';

                // Determine stage class for styling
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
                        <td>${probability}</td>
                    </tr>
                `;
            }).join('');
        }

        function processDealsData(deals) {
            // Calculate total ARR from closed deals in H2 2025
            let h2ARR = 0;
            const h2Start = new Date('2025-07-01');
            const h2End = new Date('2025-12-31');

            deals.forEach(deal => {
                const closeDate = new Date(deal.properties.closedate);
                if (closeDate >= h2Start && closeDate <= h2End) {
                    h2ARR += parseFloat(deal.properties.amount || 0);
                }
            });

            // Update ARR gauge
            updateARRGauge(h2ARR);

            // You can add more data processing here for other charts
            addMessage(`H2 2025 ARR from closed deals: $${(h2ARR / 1000).toFixed(2)}K`, 'ai');
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

        // Initialize all charts
        function initCharts() {
            // Row 1, Col 1: ARR Gauge
            const arrCtx = document.getElementById('arrGauge').getContext('2d');
            charts.arr = new Chart(arrCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [241.82, 200, 233.18],
                        backgroundColor: [colors.red, colors.yellow, colors.teal],
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

            // Row 1, Col 2: ACV Bookings
            const acvCtx = document.getElementById('acvChart').getContext('2d');
            charts.acv = new Chart(acvCtx, {
                type: 'bar',
                data: {
                    labels: ['Q1 24', 'Q2 24', 'Q3 24', 'Q4 24', 'Q1 25', 'Q2 25', 'Q3 25', 'Q4 25'],
                    datasets: [{
                        label: 'New Customer',
                        data: [90, 770, 180, 145, 55, 75, 110, 60],
                        backgroundColor: colors.secondary,
                        stack: 'stack0'
                    }, {
                        label: 'Existing Customer',
                        data: [54, 187, 70, 146, 27, 55, 50, 34],
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

            // Row 1, Col 3: Deal Velocity
            const velocityCtx = document.getElementById('velocityChart').getContext('2d');
            charts.velocity = new Chart(velocityCtx, {
                type: 'bar',
                data: {
                    labels: ['2023', '2024', '2025'],
                    datasets: [{
                        data: [142, 201, 104],
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
            charts.logos = new Chart(logosCtx, {
                type: 'bar',
                data: {
                    labels: ['2022', '2023', '2024', '2025'],
                    datasets: [{
                        label: 'Companies',
                        data: [9, 24, 10, 9],
                        backgroundColor: colors.secondary,
                        yAxisID: 'y'
                    }, {
                        label: 'Avg ACV',
                        data: [66.4, 51.9, 47.9, 32.0],
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
            const cumulativeCtx = document.getElementById('cumulativeChart').getContext('2d');
            charts.cumulative = new Chart(cumulativeCtx, {
                type: 'line',
                data: {
                    labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
                    datasets: [{
                        data: [51, 239, 800, 1435, 2059, 2513],
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
            charts.renewal = new Chart(renewalCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [92.5, 7.5],
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
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });

            // Row 3, Col 1: Burn Multiple Gauge
            const burnCtx = document.getElementById('burnGauge').getContext('2d');
            charts.burn = new Chart(burnCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [1.2, 0.8],
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
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });

            // Row 3, Col 2: CAC Payback
            const cacCtx = document.getElementById('cacChart').getContext('2d');
            charts.cac = new Chart(cacCtx, {
                type: 'bar',
                data: {
                    labels: ['Q1 24', 'Q2 24', 'Q3 24', 'Q4 24', 'Q1 25', 'Q2 25'],
                    datasets: [{
                        data: [14, 12, 13, 11, 10, 9],
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
            const nrrCtx = document.getElementById('nrrChart').getContext('2d');
            charts.nrr = new Chart(nrrCtx, {
                type: 'line',
                data: {
                    labels: ['2022', '2023', '2024', '2025'],
                    datasets: [{
                        data: [108, 115, 118, 122],
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
            const pipelineCtx = document.getElementById('pipelineChart').getContext('2d');
            charts.pipeline = new Chart(pipelineCtx, {
                type: 'bar',
                data: {
                    labels: ['Q1 25', 'Q2 25', 'Q3 25', 'Q4 25'],
                    datasets: [{
                        data: [3.2, 2.8, 4.1, 3.5],
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
            charts.churn = new Chart(churnCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [2.8, 7.2],
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
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });

            // Row 4, Col 3: Magic Number
            const magicCtx = document.getElementById('magicChart').getContext('2d');
            charts.magic = new Chart(magicCtx, {
                type: 'bar',
                data: {
                    labels: ['Q1 24', 'Q2 24', 'Q3 24', 'Q4 24', 'Q1 25', 'Q2 25'],
                    datasets: [{
                        data: [0.6, 0.8, 0.9, 1.1, 1.2, 1.3],
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
            charts.ltvCac = new Chart(ltvCacCtx, {
                type: 'doughnut',
                data: {
                    datasets: [{
                        data: [4.2, 0.8],
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
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    }
                }
            });

            // Row 5, Col 2: Cash Runway
            const cashCtx = document.getElementById('cashChart').getContext('2d');
            charts.cash = new Chart(cashCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Cash ($M)',
                        data: [5.2, 5.5, 5.8, 6.1, 6.3, 6.6],
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
            const growthCtx = document.getElementById('growthChart').getContext('2d');
            charts.growth = new Chart(growthCtx, {
                type: 'bar',
                data: {
                    labels: ['2021', '2022', '2023', '2024', '2025'],
                    datasets: [{
                        data: [368, 235, 79, 43, 22],
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

        // Store HubSpot data for querying
        let hubspotData = {
            deals: [],
            companies: []
        };

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
            if (!config.accessToken || hubspotData.deals.length === 0) {
                if (lowerMessage.includes('connect') || lowerMessage.includes('setup')) {
                    return 'To connect to HubSpot, click the ⚙️ Settings button and enter your Private App access token. Create one in HubSpot Settings → Integrations → Private Apps.';
                }
                return 'Please connect to HubSpot first by clicking ⚙️ Settings and entering your access token. Then I can analyze your real-time data!';
            }

            // Analyze deals data
            const deals = hubspotData.deals;
            const openDeals = deals.filter(d => {
                const stage = (d.properties.dealstage || '').toLowerCase();
                return !stage.includes('closed') && !stage.includes('lost');
            });

            // Top deals query
            if (lowerMessage.includes('top') && (lowerMessage.includes('deal') || lowerMessage.includes('pipe'))) {
                const topDeals = openDeals
                    .sort((a, b) => parseFloat(b.properties.amount || 0) - parseFloat(a.properties.amount || 0))
                    .slice(0, 3);

                const dealsList = topDeals.map(d =>
                    `• ${d.properties.dealname}: $${parseFloat(d.properties.amount || 0).toLocaleString()} (${d.properties.dealstage})`
                ).join('<br>');

                return `Your top 3 deals in pipeline:<br>${dealsList}`;
            }

            // Pipeline value query
            if (lowerMessage.includes('pipeline') && (lowerMessage.includes('value') || lowerMessage.includes('total'))) {
                const pipelineValue = openDeals.reduce((sum, d) => sum + parseFloat(d.properties.amount || 0), 0);
                const dealCount = openDeals.length;
                return `You have ${dealCount} open deals with a total pipeline value of $${pipelineValue.toLocaleString()}. Average deal size is $${Math.round(pipelineValue / dealCount).toLocaleString()}.`;
            }

            // Deal count query
            if ((lowerMessage.includes('how many') || lowerMessage.includes('number')) && lowerMessage.includes('deal')) {
                const closedWon = deals.filter(d => (d.properties.dealstage || '').toLowerCase().includes('closedwon')).length;
                return `You have ${openDeals.length} open deals and ${closedWon} closed won deals. Total: ${deals.length} deals in HubSpot.`;
            }

            // Closed deals query
            if (lowerMessage.includes('closed') && lowerMessage.includes('deal')) {
                const closedWon = deals.filter(d => (d.properties.dealstage || '').toLowerCase().includes('closedwon'));
                const closedValue = closedWon.reduce((sum, d) => sum + parseFloat(d.properties.amount || 0), 0);
                return `You have ${closedWon.length} closed won deals totaling $${closedValue.toLocaleString()} in revenue.`;
            }

            // Average deal size
            if (lowerMessage.includes('average') && lowerMessage.includes('deal')) {
                const totalValue = openDeals.reduce((sum, d) => sum + parseFloat(d.properties.amount || 0), 0);
                const avg = totalValue / openDeals.length;
                return `Your average open deal size is $${Math.round(avg).toLocaleString()}. Pipeline total: $${totalValue.toLocaleString()}.`;
            }

            // Largest deal
            if (lowerMessage.includes('largest') || lowerMessage.includes('biggest')) {
                const largest = openDeals.sort((a, b) => parseFloat(b.properties.amount || 0) - parseFloat(a.properties.amount || 0))[0];
                if (largest) {
                    const name = largest.properties.dealname;
                    const amount = parseFloat(largest.properties.amount || 0);
                    const stage = largest.properties.dealstage;
                    return `Your largest deal is "${name}" at $${amount.toLocaleString()} in stage: ${stage}.`;
                }
            }

            // Deals by stage
            if (lowerMessage.includes('stage') || lowerMessage.includes('breakdown')) {
                const stages = {};
                openDeals.forEach(d => {
                    const stage = d.properties.dealstage || 'Unknown';
                    stages[stage] = (stages[stage] || 0) + 1;
                });
                const breakdown = Object.entries(stages)
                    .sort((a, b) => b[1] - a[1])
                    .map(([stage, count]) => `• ${stage}: ${count} deals`)
                    .join('<br>');
                return `Deals by stage:<br>${breakdown}`;
            }

            // Closing soon
            if (lowerMessage.includes('closing') || lowerMessage.includes('close date')) {
                const now = new Date();
                const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                const closingSoon = openDeals.filter(d => {
                    const closeDate = new Date(d.properties.closedate);
                    return closeDate >= now && closeDate <= next30Days;
                }).sort((a, b) => new Date(a.properties.closedate) - new Date(b.properties.closedate));

                if (closingSoon.length === 0) {
                    return 'No deals are scheduled to close in the next 30 days.';
                }

                const dealsList = closingSoon.slice(0, 5).map(d => {
                    const closeDate = new Date(d.properties.closedate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return `• ${d.properties.dealname}: $${parseFloat(d.properties.amount || 0).toLocaleString()} (${closeDate})`;
                }).join('<br>');

                return `${closingSoon.length} deals closing in next 30 days:<br>${dealsList}`;
            }

            // H2 ARR query
            if (lowerMessage.includes('h2') || lowerMessage.includes('arr')) {
                const h2Start = new Date('2025-07-01');
                const h2End = new Date('2025-12-31');
                const h2Deals = deals.filter(d => {
                    const closeDate = new Date(d.properties.closedate);
                    return closeDate >= h2Start && closeDate <= h2End;
                });
                const h2ARR = h2Deals.reduce((sum, d) => sum + parseFloat(d.properties.amount || 0), 0);
                const target = config.arrTarget;
                const percentage = ((h2ARR / target) * 100).toFixed(1);

                return `H2 2025 ARR: $${h2ARR.toLocaleString()} (${percentage}% of $${target.toLocaleString()} target). ${h2Deals.length} deals closed. You need $${(target - h2ARR).toLocaleString()} more to hit target.`;
            }

            // Default help
            return 'I can help you with:<br>• "Top deals in pipeline"<br>• "Pipeline value"<br>• "How many deals"<br>• "Closed deals"<br>• "Average deal size"<br>• "Largest deal"<br>• "Deals by stage"<br>• "Closing soon"<br>• "H2 ARR progress"<br><br>What would you like to know?';
        }

        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Initialize on load
        document.addEventListener('DOMContentLoaded', function() {
            initCharts();

            // Auto-load HubSpot data if token is configured
            if (config.accessToken) {
                console.log('Token found, loading data...');
                loadHubSpotData();
            } else {
                console.log('No token configured');
                addMessage('Click the ⚙️ Settings button to connect to HubSpot and load your real-time data!', 'ai');

                // Update deals table to show setup message
                const tbody = document.getElementById('topDealsBody');
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 20px; color: #7c98b6;">
                            Click ⚙️ Settings to configure your HubSpot token
                        </td>
                    </tr>
                `;
            }
        });
