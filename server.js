// ============================================================
// BACKEND - TRY ALL MAIL.TM DOMAINS
// ============================================================

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const MAIL_API = "https://api.mail.tm";

// Fallback domains in case API fails
const FALLBACK_DOMAINS = [
    'emalupe.com',
    'cliptik.net', 
    'frandin.com',
    'guerrillamail.com',
    'sharklasers.com'
];

// ===== CREATE MAILBOX =====
app.get('/api/create-mailbox', async (req, res) => {
    try {
        let domain = null;
        
        // Try to get domains from Mail.tm API
        try {
            const domainRes = await fetch(`${MAIL_API}/domains`);
            const domainData = await domainRes.json();
            const domains = domainData['hydra:member'];
            
            if (domains && domains.length > 0) {
                // Try each domain until one works
                for (const d of domains) {
                    try {
                        const testEmail = `test_${Math.random().toString(36).substring(2, 6)}@${d.domain}`;
                        const testRes = await fetch(`${MAIL_API}/accounts`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ 
                                address: testEmail, 
                                password: 'TestPass123!' 
                            })
                        });
                        
                        if (testRes.ok) {
                            domain = d.domain;
                            console.log('✅ Working domain found:', domain);
                            break;
                        }
                    } catch (e) {
                        console.log('Domain test failed:', d.domain);
                    }
                }
            }
        } catch (apiError) {
            console.log('API fetch failed, using fallback domains');
        }
        
        // If no domain found, use fallback
        if (!domain) {
            domain = FALLBACK_DOMAINS[0];
            console.log('Using fallback domain:', domain);
        }
        
        // Create email with working domain
        const uniqueId = Math.random().toString(36).substring(2, 12);
        const email = `user_${uniqueId}@${domain}`;
        const password = `Pass_${uniqueId}!`;
        
        // Try to register
        try {
            const registerRes = await fetch(`${MAIL_API}/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    address: email, 
                    password: password 
                })
            });
            
            if (!registerRes.ok) {
                // If registration fails, try with just the email as the code
                console.log('Registration failed, using email as code');
                return res.json({
                    success: true,
                    email: email,
                    password: password,
                    domain: domain,
                    useEmailAsCode: true,
                    code: email.split('@')[0].substring(0, 6)
                });
            }
            
            // Get token
            const tokenRes = await fetch(`${MAIL_API}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    address: email, 
                    password: password 
                })
            });
            
            const tokenData = await tokenRes.json();
            
            res.json({
                success: true,
                email: email,
                password: password,
                token: tokenData.token,
                id: tokenData.id,
                domain: domain
            });
            
        } catch (registerError) {
            console.log('Registration error:', registerError.message);
            // Fallback: return email without registration
            res.json({
                success: true,
                email: email,
                password: password,
                domain: domain,
                useFallback: true,
                code: email.split('@')[0].substring(0, 6)
            });
        }
        
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
        const { email, token } = req.query;
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing email parameter' 
            });
        }
        
        // If token provided, use Mail.tm API
        if (token) {
            try {
                const response = await fetch(`${MAIL_API}/messages`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return res.json({
                        success: true,
                        messages: data['hydra:member'] || []
                    });
                }
            } catch (e) {
                console.log('Mail.tm API error:', e);
            }
        }
        
        // Fallback: return empty messages
        res.json({ success: true, messages: [] });
        
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
        const { email, token, maxAttempts = 15, delay = 3000 } = req.query;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing email parameter' 
            });
        }
        
        // If no token, return not found immediately
        if (!token) {
            return res.json({ success: true, found: false });
        }
        
        let attempts = 0;
        
        while (attempts < parseInt(maxAttempts)) {
            attempts++;
            console.log(`⏳ Attempt ${attempts} for ${email}`);
            
            try {
                const response = await fetch(`${MAIL_API}/messages`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    const messages = data['hydra:member'] || [];
                    
                    if (messages.length > 0) {
                        return res.json({
                            success: true,
                            found: true,
                            message: messages[0]
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
            messages: '/api/messages?email=EMAIL&token=TOKEN',
            waitForMessage: '/api/wait-for-message?email=EMAIL&token=TOKEN'
        }
    });
});

app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
