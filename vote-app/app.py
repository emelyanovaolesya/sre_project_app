from flask import Flask, request, Response
from prometheus_client import Counter, Histogram, generate_latest, REGISTRY
import time
import redis
import os

app = Flask(__name__)

# Подключение к Redis
redis_host = os.getenv('REDIS_HOST', 'redis')
redis_port = int(os.getenv('REDIS_PORT', 6379))
r = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)

# ============================================
# Prometheus метрики
# ============================================

http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
)

votes_total = Counter('votes_total', 'Total votes cast', ['option'])

@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    latency = time.time() - request.start_time
    http_request_duration_seconds.labels(
        method=request.method,
        endpoint=request.path
    ).observe(latency)
    http_requests_total.labels(
        method=request.method,
        endpoint=request.path,
        status=response.status_code
    ).inc()
    return response

@app.route('/metrics')
def metrics():
    return Response(generate_latest(REGISTRY), mimetype='text/plain')

# ============================================
# Страница голосования
# ============================================
HTML = """
<!DOCTYPE html>
<html>
<head>
    <title>Cats vs Dogs</title>
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
        h1 {
            font-size: 48px;
            margin-bottom: 40px;
        }
        .buttons {
            display: flex;
            gap: 30px;
            justify-content: center;
        }
        button {
            font-size: 32px;
            padding: 20px 40px;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:hover {
            transform: scale(1.05);
        }
        button:first-child {
            background-color: #ff6b6b;
            color: white;
        }
        button:last-child {
            background-color: #4ecdc4;
            color: white;
        }
        .tip {
            margin-top: 30px;
            font-size: 14px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Cats vs Dogs!</h1>
        <form method="POST">
            <div class="buttons">
                <button type="submit" name="vote" value="CATS">🐱 CATS</button>
                <button type="submit" name="vote" value="DOGS">🐶 DOGS</button>
            </div>
        </form>
        <p class="tip">(Tip: you can change your vote)</p>
    </div>
</body>
</html>
"""

@app.route('/', methods=['GET', 'POST'])
def vote():
    if request.method == 'POST':
        option = request.form['vote']
        r.rpush('votes', option)
        votes_total.labels(option=option).inc()
        return HTML
    return HTML

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)