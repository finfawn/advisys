require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// routes
const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);

// test route
app.get('/', (req, res) => res.send('AdviSys backend is running 🚀'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
