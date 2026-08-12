const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

const GUERRILLA_API = "https://api.guerrillamail.com/ajax.php";

// ===== CREATE MAILBOX =====
app.get('/api/create-mailbox', async (req, res) => {
    try {
        const response = await fetch(`${GUERRILLA_API}?f=get_email_address`);
        const data = await response.json();
        
        if (!data.email_addr) {
            return res.status(500).json({ error: 'Failed to create email' });
        }
        
        // Return all the data including sid_token
        res.json({
            email: data.email_addr,
            email_id: data.email_id || data.email_timestamp,
            sid_token: data.sid_token,
            alias: data.alias || null
        });
    } catch (error) {
        console.error('Create mailbox error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== GET MESSAGES =====
app.get('/api/messages', async (req, res) => {
    try {
        const { sid_token, email_id } = req.query;
        
        if (!sid_token || !email_id) {
            return res.status(400).json({ 
                error: 'Missing sid_token or email_id',
                required: { sid_token: 'string', email_id: 'string' }
            });
        }
        
        const response = await fetch(`${GUERRILLA_API}?f=get_email_list&offset=0&sid_token=${sid_token}&email_id=${email_id}`);
        const data = await response.json();
        
        // Return the list of messages
        res.json(data.list || []);
    } catch (error) {
        console.error('Messages error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== READ A MESSAGE =====
app.get('/api/read-message', async (req, res) => {
    try {
        const { email_id, sid_token, email } = req.query;
        
        if (!email_id || !sid_token || !email) {
            return res.status(400).json({ 
                error: 'Missing required parameters',
                required: { email_id: 'string', sid_token: 'string', email: 'string' }
            });
        }
        
        const response = await fetch(`${GUERRILLA_API}?f=fetch_email&email_id=${email_id}&sid_token=${sid_token}&email=${email}`);
        const data = await response.json();
        
        res.json(data);
    } catch (error) {
        console.error('Read message error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== ROOT ENDPOINT =====
app.get('/', (req, res) => {
    res.json({ 
        status: '✅ Backend running',
        endpoints: {
            createMailbox: '/api/create-mailbox',
            messages: '/api/messages?sid_token=YOUR_TOKEN&email_id=YOUR_ID',
            readMessage: '/api/read-message?email_id=YOUR_ID&sid_token=YOUR_TOKEN&email=EMAIL'
        }
    });
});

app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
