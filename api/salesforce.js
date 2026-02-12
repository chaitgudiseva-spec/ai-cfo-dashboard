export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Salesforce-Instance-Url');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // Get Salesforce instance URL from header or environment variable
        const instanceUrl = req.headers['x-salesforce-instance-url'] || process.env.SALESFORCE_INSTANCE_URL;
        const authHeader = req.headers['authorization'] || (process.env.SALESFORCE_ACCESS_TOKEN ? `Bearer ${process.env.SALESFORCE_ACCESS_TOKEN}` : '');

        if (!instanceUrl) {
            res.status(400).json({ error: 'Missing Salesforce instance URL. Provide X-Salesforce-Instance-Url header or set SALESFORCE_INSTANCE_URL environment variable.' });
            return;
        }

        if (!authHeader) {
            res.status(401).json({ error: 'Missing authorization. Provide Authorization header or set SALESFORCE_ACCESS_TOKEN environment variable.' });
            return;
        }

        // Get the Salesforce API path and SOQL query from query parameters
        const sfPath = req.query.path || '/services/data/v59.0/query';
        const soqlQuery = req.query.q;

        // Build the Salesforce API URL
        const cleanInstanceUrl = instanceUrl.replace(/\/+$/, '');
        let sfUrl = `${cleanInstanceUrl}${sfPath}`;

        if (soqlQuery) {
            sfUrl += `?q=${encodeURIComponent(soqlQuery)}`;
        }

        const response = await fetch(sfUrl, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
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
