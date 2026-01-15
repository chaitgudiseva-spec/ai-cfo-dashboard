export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { code } = req.query;

        if (!code) {
            throw new Error('No authorization code provided');
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}/api/auth/callback`
            : 'http://localhost:3000/api/auth/callback';

        if (!clientId || !clientSecret) {
            throw new Error('Missing Google OAuth credentials');
        }

        // Exchange code for tokens
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code: code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenResponse.json();

        if (!tokens.access_token) {
            throw new Error('Failed to obtain access token');
        }

        // Get user info
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });

        const userInfo = await userResponse.json();

        // Create session token (simple JWT-like token)
        const sessionToken = Buffer.from(JSON.stringify({
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        })).toString('base64');

        // Set cookie and redirect
        res.setHeader('Set-Cookie', `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`);
        res.writeHead(302, { Location: '/' });
        res.end();

    } catch (error) {
        console.error('OAuth callback error:', error);
        res.writeHead(302, { Location: '/login.html?error=auth_failed' });
        res.end();
    }
}
