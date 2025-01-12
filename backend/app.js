const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Welcome to Scrozam backend!');
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});