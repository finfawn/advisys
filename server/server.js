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
const notificationsRouter = require('./routes/notifications');
app.use('/api/notifications', notificationsRouter);

// test route
app.get('/', (req, res) => res.send('AdviSys backend is running 🚀'));

// Temporary debug: list registered routes (method and path)
// NOTE: This is for debugging and can be removed later.
app.get('/api/__routes', (req, res) => {
  try {
    const routes = [];
    const stack = app._router?.stack || [];
    for (const layer of stack) {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods)
          .filter(m => layer.route.methods[m])
          .map(m => m.toUpperCase());
        routes.push({ methods, path: layer.route.path });
      } else if (layer.name === 'router' && layer.handle?.stack) {
        const base = layer.regexp?.fast_star ? '' : (layer.regexp && layer.regexp.source ? null : null);
        for (const r of layer.handle.stack) {
          if (r.route && r.route.path) {
            const methods = Object.keys(r.route.methods)
              .filter(m => r.route.methods[m])
              .map(m => m.toUpperCase());
            // Try to infer mount path if available
            const path = r.route.path;
            routes.push({ methods, path });
          }
        }
      }
    }
    res.json(routes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to enumerate routes' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
