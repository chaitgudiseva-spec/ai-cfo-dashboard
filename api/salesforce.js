// Cache the access token in memory (survives across requests in the same serverless instance)
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
    // Return cached token if still valid (with 5-minute buffer)
    if (cachedToken && Date.now() < tokenExpiry - 300000) {
        return cachedToken;
    }

    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const instanceUrl = process.env.SALESFORCE_INSTANCE_URL;

    if (!clientId || !clientSecret) {
        throw new Error('Missing SALESFORCE_CLIENT_ID or SALESFORCE_CLIENT_SECRET environment variables.');
    }

    // Use OAuth 2.0 Client Credentials flow
    const tokenUrl = `${instanceUrl}/services/oauth2/token`;
    const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
    });

    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('OAuth token error:', data);
        throw new Error(data.error_description || data.error || 'Failed to obtain access token');
    }

    cachedToken = data.access_token;
    // Salesforce tokens typically last 2 hours; cache for 1.5 hours
    tokenExpiry = Date.now() + 5400000;

    return cachedToken;
}

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
        const instanceUrl = process.env.SALESFORCE_INSTANCE_URL;

        if (!instanceUrl) {
            res.status(500).json({ error: 'Missing SALESFORCE_INSTANCE_URL environment variable.' });
            return;
        }

        // Get access token via OAuth
        const accessToken = await getAccessToken();

        // Get the SOQL query from query parameters
        const soqlQuery = req.query.q;

        if (!soqlQuery) {
            res.status(400).json({ error: 'Missing q parameter (SOQL query).' });
            return;
        }

        // Build the Salesforce API URL
        const cleanInstanceUrl = instanceUrl.replace(/\/+$/, '');
        const sfUrl = `${cleanInstanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soqlQuery)}`;

        const response = await fetch(sfUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            // If token expired, clear cache and retry once
            if (response.status === 401) {
                cachedToken = null;
                tokenExpiry = 0;
                const newToken = await getAccessToken();
                const retryResponse = await fetch(sfUrl, {
                    headers: {
                        'Authorization': `Bearer ${newToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                const retryData = await retryResponse.json();
                if (!retryResponse.ok) {
                    res.status(retryResponse.status).json(retryData);
                    return;
                }
                res.status(200).json(retryData);
                return;
            }

            res.status(response.status).json(data);
            return;
        }

        res.status(200).json(data);

    } catch (error) {
        console.error('Error proxying Salesforce request:', error);
        res.status(500).json({
            error: error.message
        });
    }
}
