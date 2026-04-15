const express = require('express');
const { Pool } = require('pg');
const client = require('prom-client');

const app = express();
const port = 80;

const pool = new Pool({
    user: 'postgres',
    host: 'db',
    database: 'votes',
    password: 'postgres',
});

// ============================================
// Prometheus метрики для SLO
// ============================================

// Счётчик HTTP запросов (для Traffic и Error Rate)
const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code']
});

// Гистограмма времени ответа (для Latency SLO)
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

// Middleware для сбора метрик
app.use((req, res, next) => {
    const end = httpRequestDuration.startTimer();
    res.on('finish', () => {
        httpRequestsTotal.inc({
            method: req.method,
            route: req.path,
            status_code: res.statusCode
        });
        end({ method: req.method, route: req.path });
    });
    next();
});

// Endpoint для Prometheus
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});
// ============================================

// Главная страница с результатами
app.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT vote, COUNT(id) as count FROM votes GROUP BY vote');
        let cats = 0, dogs = 0;
        result.rows.forEach(row => {
            if (row.vote === 'CATS') cats = parseInt(row.count);
            if (row.vote === 'DOGS') dogs = parseInt(row.count);
        });
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cats vs Dogs Results</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        min-height: 100vh;
                        margin: 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    .container {
                        background: rgba(255,255,255,0.1);
                        border-radius: 20px;
                        padding: 40px;
                        backdrop-filter: blur(10px);
                    }
                    h1 { font-size: 48px; margin-bottom: 20px; }
                    .results { display: flex; gap: 40px; justify-content: center; margin: 30px 0; }
                    .result { text-align: center; }
                    .result h2 { font-size: 36px; margin: 10px 0; }
                    .cats { color: #ff6b6b; }
                    .dogs { color: #4ecdc4; }
                    .total { font-size: 18px; opacity: 0.8; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Cats vs Dogs Results</h1>
                    <div class="results">
                        <div class="result">
                            <h2>🐱 CATS</h2>
                            <h2 class="cats">${cats}</h2>
                        </div>
                        <div class="result">
                            <h2>🐶 DOGS</h2>
                            <h2 class="dogs">${dogs}</h2>
                        </div>
                    </div>
                    <p class="total">Total votes: ${cats + dogs}</p>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving votes');
    }
});

app.listen(port, () => {
    console.log(`Result app listening on port ${port}`);
});