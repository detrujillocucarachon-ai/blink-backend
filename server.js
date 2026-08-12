const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
// You can switch to 'https://api.mail.gw' if mail.tm is having issues [citation:7]
const MAIL_API = "https://api.mail.tm";

app.use(cors());
app.use(express.json());

app.get('/api/create-mailbox', async (req, res) => {
    try {
        // 1. Get a valid domain
        const domainRes = await fetch(`${MAIL_API}/domains`);
        const domainData = await domainRes.json();
        const domain = domainData['hydra:member'][0].domain;

        // 2. Create a random email and password
        const uniqueId = Math.random().toString(36).substring(2, 10);
        const email = `user_${uniqueId}@${domain}`;
        const password = `Pass_${uniqueId}!`;

        // 3. Register the account
        const registerRes = await fetch(`${MAIL_API}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: email, password: password })
        });

        if (!registerRes.ok) {
            const errorText = await registerRes.text();
            return res.status(400).json({ error: "Failed to create account", details: errorText });
        }

        // 4. Get the authentication token
        const loginRes = await fetch(`${MAIL_API}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: email, password: password })
        });

        const loginData = await loginRes.json();
        res.json({ email: email, token: loginData.token, accountId: loginData.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const token = req.headers['authorization'];
        if (!token) {
            return res.status(401).json({ error: "Missing Authorization header" });
        }
        const messagesRes = await fetch(`${MAIL_API}/messages`, {
            method: 'GET',
            headers: { 'Authorization': token }
        });
        const messagesData = await messagesRes.json();
        res.json(messagesData['hydra:member'] || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
