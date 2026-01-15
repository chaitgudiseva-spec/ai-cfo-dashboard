export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // Clear session cookie
    res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');

    if (req.method === 'POST') {
        res.status(200).json({ success: true });
    } else {
        res.writeHead(302, { Location: '/login.html' });
        res.end();
    }
}
