export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Get the spreadsheet ID from environment variable or default
        const spreadsheetId = process.env.GOOGLE_SHEET_ID || '1lwOFBKoFO0J7xau3Hx7swuM_52hZpS48jFVDAV81ngo';
        const apiKey = process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            throw new Error('Missing Google API Key. Set GOOGLE_API_KEY environment variable.');
        }

        // Fetch all data from single sheet
        const range = 'Sheet1!A:G'; // Read all columns
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Failed to fetch sheet data');
        }

        const data = await response.json();
        const rows = data.values || [];

        // Parse single sheet with SECTION markers
        const deals = [];
        const metrics = {};
        const bookings = [];
        const newLogos = [];
        const metricsTimeseries = [];

        let currentSection = null;
        let isFirstRowOfSection = false;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const section = row[0];

            // Skip the general header row
            if (section === 'SECTION') {
                continue;
            }

            // Skip empty rows
            if (!section || section.trim() === '') {
                currentSection = null; // Reset section on empty row
                continue;
            }

            // Check if we're starting a new section
            if ((section === 'DEALS' || section === 'METRICS' || section === 'BOOKINGS' || section === 'NEW_LOGOS' || section === 'METRICS_TIMESERIES') && section !== currentSection) {
                currentSection = section;
                isFirstRowOfSection = true;
                continue; // Skip the first row as it contains headers
            }

            // Process data based on current section
            if (currentSection === 'DEALS' && section === 'DEALS' && row.length > 1) {
                deals.push({
                    deal_name: row[1] || '',
                    amount: row[2] || '',
                    stage: row[3] || '',
                    close_date: row[4] || '',
                    probability: row[5] || '',
                    created_date: row[6] || ''
                });
            } else if (currentSection === 'METRICS' && section === 'METRICS' && row.length > 1) {
                const metric = row[1];
                const value = row[2];
                if (metric) {
                    metrics[metric.toLowerCase().replace(/\s+/g, '_')] = value;
                }
            } else if (currentSection === 'BOOKINGS' && section === 'BOOKINGS' && row.length > 1) {
                bookings.push({
                    quarter: row[1] || '',
                    new_customer: row[2] || '',
                    existing_customer: row[3] || '',
                    total: row[4] || ''
                });
            } else if (currentSection === 'NEW_LOGOS' && section === 'NEW_LOGOS' && row.length > 1) {
                newLogos.push({
                    year: row[1] || '',
                    companies: row[2] || '',
                    average_acv: row[3] || ''
                });
            } else if (currentSection === 'METRICS_TIMESERIES' && section === 'METRICS_TIMESERIES' && row.length > 1) {
                metricsTimeseries.push({
                    type: row[1] || '',
                    period: row[2] || '',
                    value: row[3] || ''
                });
            }
        }

        res.status(200).json({
            success: true,
            deals: deals,
            metrics: metrics,
            bookings: bookings,
            newLogos: newLogos,
            metricsTimeseries: metricsTimeseries,
            counts: {
                deals: deals.length,
                bookings: bookings.length,
                newLogos: newLogos.length,
                metricsTimeseries: metricsTimeseries.length
            }
        });

    } catch (error) {
        console.error('Error fetching Google Sheets data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
