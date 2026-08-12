// ============================================================
// BACKEND WITH 1SECMAIL - FIXED
// ============================================================

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1secmail API endpoints
const SECMAIL_API = "https://www.1secmail.com/api/v1";

// Fallback domains if 1secmail fails
const FALLBACK_DOMAINS = ['1secmail.net', '1secmail.com', '1secmail.org'];

// ===== CREATE MAILBOX =====
app.get('/api/create-mailbox', async (req, res) => {
    try {
        const randomId = Math.random().toString(36).substring(2, 12);
        const domain = FALLBACK_DOMAINS[0];
        const email = randomId + '@' + domain;
        const password = 'AutoPass' + Math.random().toString(36).substring(2, 8) + '!';
        
        console.log('📧 Created:', email);
        
        res.json({
            success: true,
            email: email,
            password: password,
            domain: domain,
            id: randomId
        });
    } catch (error) {
        console.error('Create error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ===== GET MESSAGES =====
app.get('/api/messages', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing email parameter' 
            });
        }
        
        const [id, domain] = email.split('@');
        
        // Try to get messages from 1secmail
        try {
            const response = await fetch(`${SECMAIL_API}/messages/${id}/${domain}`);
            const messages = await response.json();
            
            // If we got HTML back, return empty array
            if (typeof messages === 'string' && messages.includes('<!DOCTYPE')) {
                console.log('⚠️ Received HTML instead of JSON');
                return res.json({ success: true, messages: [] });
            }
            
            // Get full content for each message
            const fullMessages = [];
            if (messages && Array.isArray(messages) && messages.length > 0) {
                for (const msg of messages) {
                    try {
                        const msgRes = await fetch(`${SECMAIL_API}/message/${id}/${domain}/${msg.id}`);
                        const msgData = await msgRes.json();
                        fullMessages.push({
                            id: msg.id,
                            from: msgData.from || '',
                            subject: msgData.subject || '',
                            body: msgData.textBody || msgData.htmlBody || '',
                            date: msgData.date || ''
                        });
                    } catch (e) {
                        console.log('Error fetching message:', e);
                    }
                }
            }
            
            res.json({ success: true, messages: fullMessages });
            
        } catch (fetchError) {
            console.log('1secmail fetch error:', fetchError.message);
            res.json({ success: true, messages: [] });
        }
        
    } catch (error) {
        console.error('Messages error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// ===== WAIT FOR MESSAGE =====
app.get('/api/wait-for-message', async (req, res) => {
    try {
        const { email, maxAttempts = 20, delay = 3000 } = req.query;
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing email parameter' 
            });
        }
        
        const [id, domain] = email.split('@');
        let attempts = 0;
        
        while (attempts < parseInt(maxAttempts)) {
            attempts++;
            console.log(`⏳ Attempt ${attempts} for ${email}`);
            
            try {
                const response = await fetch(`${SECMAIL_API}/messages/${id}/${domain}`);
                const messages = await response.json();
                
                // Check if we got HTML back
                if (typeof messages === 'string' && messages.includes('<!DOCTYPE')) {
                    console.log('⚠️ Received HTML, waiting...');
                    await new Promise(r => setTimeout(r, parseInt(delay)));
                    continue;
                }
                
                if (messages && Array.isArray(messages) && messages.length > 0) {
                    try {
                        const msgRes = await fetch(`${SECMAIL_API}/message/${id}/${domain}/${messages[0].id}`);
                        const msgData = await msgRes.json();
                        
                        return res.json({
                            success: true,
                            found: true,
                            message: {
                                id: messages[0].id,
                                from: msgData.from || '',
                                subject: msgData.subject || '',
                                body: msgData.textBody || msgData.htmlBody || '',
                                date: msgData.date || ''
                            }
                        });
                    } catch (e) {
                        console.log('Error fetching message:', e);
                    }
                }
            } catch (e) {
                console.log('Error checking:', e);
            }
            
            await new Promise(r => setTimeout(r, parseInt(delay)));
        }
        
        res.json({ success: true, found: false });
        
    } catch (error) {
        console.error('Wait error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
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
