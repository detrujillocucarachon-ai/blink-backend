const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MAIL_API = "https://api.mail.tm";

app.use(cors());
app.use(express.json());

// ===== ROOT =====
app.get('/', (req, res) => {
    res.json({ 
        status: '✅ Backend running',
        endpoints: {
            createMailbox: '/api/create-mailbox',
            messages: '/api/messages',
            test: '/api/test'
        }
    });
});

// ===== TEST =====
app.get('/api/test', (req, res) => {
    res.json({ status: '✅ API working', time: new Date().toISOString() });
});

// ===== CREATE MAILBOX =====
app.get('/api/create-mailbox', async (req, res) => {
    try {
        // Get domain
        const domainRes = await fetch(`${MAIL_API}/domains`);
        const domainData = await domainRes.json();
        const domain = domainData['hydra:member'][0].domain;
        
        // Create email
        const uniqueId = Math.random().toString(36).substring(2, 10);
        const email = `user_${uniqueId}@${domain}`;
        const password = `Pass_${uniqueId}!`;
        
        // Register
        const registerRes = await fetch(`${MAIL_API}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: email, password })
        });
        
        if (!registerRes.ok) {
            return res.status(400).json({ error: 'Registration failed' });
        }
        
        // Get token
        const tokenRes = await fetch(`${MAIL_API}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: email, password })
        });
        
        const tokenData = await tokenRes.json();
        
        res.json({
            email,
            password,
            token: tokenData.token,
            id: tokenData.id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== GET MESSAGES =====
app.get('/api/messages', async (req, res) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ error: 'Missing Authorization header' });
        }
        
        const response = await fetch(`${MAIL_API}/messages`, {
            headers: { 'Authorization': token }
        });
        
        const data = await response.json();
        res.json(data['hydra:member'] || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
