const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const MAIL_API = "https://api.mail.tm";

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// ===== ROOT ROUTE =====
app.get('/', (req, res) => {
    res.json({ 
        status: '✅ Backend is running!',
        message: 'BLINK Email Service',
        endpoints: {
            createMailbox: '/api/create-mailbox',
            messages: '/api/messages (requires Authorization header)',
            test: '/api/test'
        }
    });
});

// ===== TEST ROUTE =====
app.get('/api/test', (req, res) => {
    res.json({ 
        status: '✅ API test successful',
        timestamp: new Date().toISOString()
    });
});

// ===== CREATE MAILBOX =====
app.get('/api/create-mailbox', async (req, res) => {
    try {
        // 1. Get a valid domain
        const domainRes = await fetch(`${MAIL_API}/domains`);
        if (!domainRes.ok) {
            throw new Error('Failed to fetch domains from mail.tm');
        }
        const domainData = await domainRes.json();
        const domains = domainData['hydra:member'];
        
        if (!domains || domains.length === 0) {
            return res.status(500).json({ error: "No domains available from mail.tm" });
        }
        
        const domain = domains[0].domain;
        const uniqueId = Math.random().toString(36).substring(2, 10);
        const email = `user_${uniqueId}@${domain}`;
        const password = `Pass_${uniqueId}!`;

        // 2. Register the account
        const registerRes = await fetch(`${MAIL_API}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: email, password: password })
        });

        if (!registerRes.ok) {
            const errorText = await registerRes.text();
            console.error('Registration failed:', errorText);
            return res.status(400).json({ 
                error: "Failed to create account", 
                details: errorText,
                email: email
            });
        }

        // 3. Get the authentication token
        const loginRes = await fetch(`${MAIL_API}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: email, password: password })
        });

        if (!loginRes.ok) {
            const errorText = await loginRes.text();
            console.error('Login failed:', errorText);
            return res.status(400).json({ 
                error: "Failed to login", 
                details: errorText,
                email: email
            });
        }

        const loginData = await loginRes.json();
        
        res.json({ 
            email: email, 
            password: password,
            token: loginData.token, 
            accountId: loginData.id,
            domain: domain
        });
    } catch (error) {
        console.error('Create mailbox error:', error);
        res.status(500).json({ 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// ===== GET MESSAGES =====
app.get('/api/messages', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ 
                error: "Missing Authorization header",
                usage: "Authorization: Bearer YOUR_TOKEN"
            });
        }

        const messagesRes = await fetch(`${MAIL_API}/messages`, {
            method: 'GET',
            headers: { 
                'Authorization': authHeader
            }
        });

        if (!messagesRes.ok) {
            const errorText = await messagesRes.text();
            return res.status(messagesRes.status).json({ 
                error: "Failed to fetch messages", 
                details: errorText 
            });
        }

        const messagesData = await messagesRes.json();
        res.json(messagesData['hydra:member'] || []);
    } catch (error) {
        console.error('Messages error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== READ A SPECIFIC MESSAGE =====
app.get('/api/read-message/:id', async (req, res) => {
    try {
        const messageId = req.params.id;
        const authHeader = req.headers['authorization'];
        
        if (!authHeader) {
            return res.status(401).json({ error: "Missing Authorization header" });
        }

        const messageRes = await fetch(`${MAIL_API}/messages/${messageId}`, {
            method: 'GET',
            headers: { 
                'Authorization': authHeader
            }
        });

        if (!messageRes.ok) {
            const errorText = await messageRes.text();
            return res.status(messageRes.status).json({ 
                error: "Failed to fetch message", 
                details: errorText 
            });
        }

        const messageData = await messageRes.json();
        res.json(messageData);
    } catch (error) {
        console.error('Read message error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== START SERVER =====
app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
    console.log(`📍 Root: http://localhost:${PORT}/`);
    console.log(`📍 Create Mailbox: http://localhost:${PORT}/api/create-mailbox`);
    console.log(`📍 Test: http://localhost:${PORT}/api/test`);
});
