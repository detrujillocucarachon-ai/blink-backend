const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Using Guerrilla Mail API (more reliable)
const GUERRILLA_API = "https://api.guerrillamail.com/ajax.php";

app.get('/api/create-mailbox', async (req, res) => {
    try {
        // Create a new email address
        const createRes = await fetch(`${GUERRILLA_API}?f=get_email_address&ip=127.0.0.1&agent=Mozilla`);
        const data = await createRes.json();
        
        if (!data.email_addr) {
            return res.status(500).json({ error: "Failed to create email" });
        }

        res.json({ 
            email: data.email_addr,
            email_id: data.email_id,
            sid_token: data.sid_token
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const emailId = req.query.email_id;
        const sidToken = req.query.sid_token;
        
        if (!emailId || !sidToken) {
            return res.status(400).json({ error: "Missing email_id or sid_token" });
        }

        const messagesRes = await fetch(`${GUERRILLA_API}?f=get_email_list&offset=0&email_id=${emailId}&sid_token=${sidToken}`);
        const messagesData = await messagesRes.json();
        
        res.json(messagesData.list || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/read-message', async (req, res) => {
    try {
        const { email_id, sid_token, email } = req.query;
        
        if (!email_id || !sid_token || !email) {
            return res.status(400).json({ error: "Missing required parameters" });
        }

        const readRes = await fetch(`${GUERRILLA_API}?f=fetch_email&email_id=${email_id}&sid_token=${sid_token}&email=${email}`);
        const readData = await readRes.json();
        
        res.json(readData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.json({ 
        status: '✅ Backend is running!',
        endpoints: {
            createMailbox: '/api/create-mailbox',
            messages: '/api/messages?email_id=YOUR_ID&sid_token=YOUR_TOKEN',
            readMessage: '/api/read-message?email_id=YOUR_ID&sid_token=YOUR_TOKEN&email=EMAIL_ADDRESS'
        }
    });
});

app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
