const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const GUERRILLA_API = "https://api.guerrillamail.com/ajax.php";

app.get('/api/create-mailbox', async (req, res) => {
    try {
        const response = await fetch(`${GUERRILLA_API}?f=get_email_address`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const { sid_token, email_id } = req.query;
        if (!sid_token || !email_id) {
            return res.status(400).json({ error: 'Missing sid_token or email_id' });
        }
        const response = await fetch(`${GUERRILLA_API}?f=get_email_list&offset=0&sid_token=${sid_token}&email_id=${email_id}`);
        const data = await response.json();
        res.json(data.list || []);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/', (req, res) => {
    res.json({ status: '✅ Backend running' });
});

app.listen(PORT, () => {
    console.log(`✅ Backend running on port ${PORT}`);
});
