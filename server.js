app.get('/api/create-mailbox', async (req, res) => {
    try {
        // Alternative API call format
        const createRes = await fetch(`${GUERRILLA_API}?f=get_email_address`);
        const data = await createRes.json();
        
        // Try a second call to get the email_id
        const emailIdRes = await fetch(`${GUERRILLA_API}?f=get_email_list&offset=0&sid_token=${data.sid_token}`);
        const emailIdData = await emailIdRes.json();
        
        res.json({ 
            email: data.email_addr,
            email_id: emailIdData.email_id || data.sid_token,
            sid_token: data.sid_token,
            list: emailIdData.list || []
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
