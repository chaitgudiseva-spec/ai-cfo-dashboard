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
        const cookies = req.headers.cookie || '';
        const sessionCookie = cookies.split('; ').find(c => c.startsWith('session='));

        if (!sessionCookie) {
            res.status(200).json({ authenticated: false });
            return;
        }

        const sessionToken = sessionCookie.split('=')[1];
        const sessionData = JSON.parse(Buffer.from(sessionToken, 'base64').toString());

        // Check if session is expired
        if (Date.now() > sessionData.exp) {
            res.status(200).json({ authenticated: false });
            return;
        }

        res.status(200).json({
            authenticated: true,
            user: {
                email: sessionData.email,
                name: sessionData.name,
                picture: sessionData.picture
            }
        });

    } catch (error) {
        console.error('Session check error:', error);
        res.status(200).json({ authenticated: false });
    }
}
