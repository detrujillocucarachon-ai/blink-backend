const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MAIL_API = "https://mail.tm";

app.use(cors());
app.use(express.json());

app.get('/api/create-mailbox', async (req, res) => {
    try {
        const domainRes = await fetch(`${MAIL_API}/domains`);
        const domainData = await domainRes.json();
        const domains = domainData['hydra:member'];
        if (!domains || domains.length === 0) {
            return res.status(500).json({ error: "No domains available" });
        }
        const domain = domains[0].domain;
        const uniqueId = Math.random().toString(36).substring(2, 10);
        const email = `user_${uniqueId}@${domain}`;
        const password = `Pass_${uniqueId}!`;

        const registerRes = await fetch(`${MAIL_API}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: email, password: password })
        });

        if (!registerRes.ok) {
            return res.status(400).json({ error: "Failed to create account" });
        }

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