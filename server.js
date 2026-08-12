// ============================================================
// BACKEND WITH EMAILNATOR API
// ============================================================

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Emailnator API
const EMAILNATOR_API = "https://www.emailnator.com";

// ===== CREATE MAILBOX =====
app.get('/api/create-mailbox', async (req, res) => {
    try {
        // Generate random email
        const randomId = Math.random().toString(36).substring(2, 12);
        const email = randomId + '@emailnator.com';
        const password = 'AutoPass' + Math.random().toString(36).substring(2, 8) + '!';
        
        console.log('📧 Created:', email);
        
        res.json({
            success: true,
            email: email,
            password: password,
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
        
        const [id] = email.split('@');
        
        // Try Emailnator
        try {
            const response = await fetch(`${EMAILNATOR_API}/message/${id}`, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Emailnator API error');
            }
            
            const data = await response.json();
            
            if (data && data.messages && data.messages.length > 0) {
                return res.json({
                    success: true,
                    messages: data.messages.map(msg => ({
                        id: msg.id,
                        from: msg.from || '',
                        subject: msg.subject || '',
                        body: msg.body || msg.text || '',
                        date: msg.date || new Date().toISOString()
                    }))
                });
            }
            
            res.json({ success: true, messages: [] });
            
        } catch (fetchError) {
            console.log('Emailnator error:', fetchError.message);
            
            // Fallback: Use 1secmail
            try {
                const response = await fetch(`https://www.1secmail.com/api/v1/messages/${id}/1secmail.net`);
                const messages = await response.json();
                
                if (messages && Array.isArray(messages) && messages.length > 0) {
                    const fullMessages = [];
                    for (const msg of messages) {
                        try {
                            const msgRes = await fetch(`https://www.1secmail.com/api/v1/message/${id}/1secmail.net/${msg.id}`);
                            const msgData = await msgRes.json();
                            fullMessages.push({
                                id: msg.id,
                                from: msgData.from || '',
                                subject: msgData.subject || '',
                                body: msgData.textBody || msgData.htmlBody || '',
                                date: msgData.date || ''
                            });
                        } catch (e) {}
                    }
                    return res.json({ success: true, messages: fullMessages });
                }
            } catch (e) {}
            
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
        
        const [id] = email.split('@');
        let attempts = 0;
        
        while (attempts < parseInt(maxAttempts)) {
            attempts++;
            console.log(`⏳ Attempt ${attempts} for ${email}`);
            
            try {
                // Try Emailnator
                const response = await fetch(`${EMAILNATOR_API}/message/${id}`, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    if (data && data.messages && data.messages.length > 0) {
                        const msg = data.messages[0];
                        return res.json({
                            success: true,
                            found: true,
                            message: {
                                id: msg.id,
                                from: msg.from || '',
                                subject: msg.subject || '',
                                body: msg.body || msg.text || '',
                                date: msg.date || new Date().toISOString()
                            }
                        });
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
        status: '✅ Backend running',
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
