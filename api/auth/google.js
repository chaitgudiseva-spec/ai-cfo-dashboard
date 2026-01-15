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
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}/api/auth/callback`
            : 'http://localhost:3000/api/auth/callback';

        if (!clientId) {
            throw new Error('Missing Google Client ID');
        }

        // Build OAuth URL
        const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid email profile',
            access_type: 'offline',
            prompt: 'consent'
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

        res.status(200).json({
            success: true,
            authUrl: authUrl
        });

    } catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}
