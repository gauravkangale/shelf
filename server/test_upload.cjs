require('dotenv').config({ path: './.env' });
const jwt = require('jsonwebtoken');

const token = jwt.sign({ sub: '626c2aea-eff1-4733-ba85-18e294e95a3b', email: 'test@example.com', username: 'kiaraa' }, process.env.JWT_SECRET, { expiresIn: '1h' });

const dummyImage = 'data:image/jpeg;base64,' + 'A'.repeat(500000);

fetch('http://127.0.0.1:3001/api/preferences', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({ preferences: { dashboard_image: dummyImage } })
})
.then(res => res.text().then(text => ({ status: res.status, text })))
.then(console.log)
.catch(console.error);
