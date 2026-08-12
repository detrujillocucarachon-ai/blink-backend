// ============================================================
// BACKEND WITH 1SECMAIL API
// ============================================================

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1secmail API endpoints
const SECMAIL_API = "https://www.1secmail.com/api/v1";

// ===== CREATE MAILBOX =====
app.get('/api/create-mailbox', async (req, res) => {
    try {
        // Generate random email
        const randomId = Math.random().toString(36).substring(2, 12);
        const domain = '1secmail.net'; // works with 1secmail.com, 1secmail.org, 1secmail.net
        
        const email = randomId + '@' + domain;
        const password = 'AutoPass' + Math.random().toString(36).substring(2, 8) + '!';
        
        console.log('📧 Created:', email);
        
        res.json({
            email: email,
            password: password,
            domain: domain,
            id: randomId
        });
    } catch (error) {
        console.error('Create error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== GET MESSAGES =====
app.get('/api/messages', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ error: 'Missing email parameter' });
        }
        
        const [id, domain] = email.split('@');
        
        // Get message list
        const response = await fetch(`${SECMAIL_API}/messages/${id}/${domain}`);
        const messages = await response.json();
        
        console.log('📩 Messages for:', email, messages);
        
        // Get full content for each message
        const fullMessages = [];
        if (messages && messages.length > 0) {
            for (const msg of messages) {
                const msgRes = await fetch(`${SECMAIL_API}/message/${id}/${domain}/${msg.id}`);
                const msgData = await msgRes.json();
                fullMessages.push({
                    id: msg.id,
                    from: msgData.from,
                    subject: msgData.subject,
                    body: msgData.textBody || msgData.htmlBody || '',
                    date: msgData.date
                });
            }
        }
        
        res.json(fullMessages);
    } catch (error) {
        console.error('Messages error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== WAIT FOR MESSAGE (polling) =====
app.get('/api/wait-for-message', async (req, res) => {
    try {
        const { email, maxAttempts = 20, delay = 3000 } = req.query;
        if (!email) {
            return res.status(400).json({ error: 'Missing email parameter' });
        }
        
        const [id, domain] = email.split('@');
        let attempts = 0;
        
        while (attempts < parseInt(maxAttempts)) {
            attempts++;
            console.log(`⏳ Attempt ${attempts} for ${email}`);
            
            try {
                const response = await fetch(`${SECMAIL_API}/messages/${id}/${domain}`);
                const messages = await response.json();
                
                if (messages && messages.length > 0) {
                    // Get the first message
                    const msgRes = await fetch(`${SECMAIL_API}/message/${id}/${domain}/${messages[0].id}`);
                    const msgData = await msgRes.json();
                    
                    return res.json({
                        found: true,
                        message: {
                            id: messages[0].id,
                            from: msgData.from,
                            subject: msgData.subject,
                            body: msgData.textBody || msgData.htmlBody || '',
                            date: msgData.date
                        }
                    });
                }
            } catch (e) {
                console.log('Error checking:', e);
            }
            
            // Wait before next attempt
            await new Promise(r => setTimeout(r, parseInt(delay)));
        }
        
        res.json({ found: false });
    } catch (error) {
        console.error('Wait error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ROOT =====
app.get('/', (req, res) => {
    res.json({
        status: '✅ Backend running with 1secmail',
        endpoints: {
            createMailbox: '/api/create-mailbox',
            messages: '/api/messages?email=EMAIL',
            waitForMessage: '/api/wait-for-message?email=EMAIL'
        }
    });
});

app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
