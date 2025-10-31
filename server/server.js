require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// routes
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);
const usersRouter = require('./routes/users');
app.use('/api/users', usersRouter);
const jaasRouter = require('./routes/jaas');
app.use('/api/jaas', jaasRouter);
const advisorsRouter = require('./routes/advisors');
app.use('/api/advisors', advisorsRouter);
const consultationsRouter = require('./routes/consultations');
app.use('/api', consultationsRouter);
const profileRouter = require('./routes/profile');
app.use('/api/profile', profileRouter);
const availabilityRouter = require('./routes/availability');
app.use('/api/availability', availabilityRouter);
const dashboardRouter = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRouter);

// test route
app.get('/', (req, res) => res.send('AdviSys backend is running 🚀'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
