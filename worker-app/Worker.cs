using System;
using System.Threading;
using StackExchange.Redis;
using Npgsql;
using Prometheus;

namespace Worker
{
    class Program
    {
        // Метрика: количество обработанных голосов
        private static readonly Counter VotesProcessed = Metrics
            .CreateCounter("worker_processed_total", "Total votes processed by worker.");

        // Метрика: количество ошибок при обработке
        private static readonly Counter VotesFailed = Metrics
            .CreateCounter("worker_errors_total", "Total errors during vote processing.");

        static void Main(string[] args)
        {
            var redis = ConnectionMultiplexer.Connect("redis:6379");
            var db = redis.GetDatabase();

            var connString = "Host=db;Username=postgres;Password=postgres;Database=votes";

            // Создание таблицы, если не существует
            using (var conn = new NpgsqlConnection(connString))
            {
                conn.Open();
                new NpgsqlCommand("CREATE TABLE IF NOT EXISTS votes (id SERIAL PRIMARY KEY, vote TEXT NOT NULL)", conn).ExecuteNonQuery();
            }

            // Запускаем HTTP-сервер для Prometheus на порту 8080
            var metricServer = new KestrelMetricServer(port: 8080);
            metricServer.Start();

            Console.WriteLine("Worker started. Waiting for votes...");

            while (true)
            {
                try
                {
                    var vote = db.ListLeftPop("votes");
                    if (!vote.IsNullOrEmpty)
                    {
                        Console.WriteLine($"Processing vote: {vote}");
                        using (var conn = new NpgsqlConnection(connString))
                        {
                            conn.Open();
                            using (var cmd = new NpgsqlCommand("INSERT INTO votes (vote) VALUES (@vote)", conn))
                            {
                                cmd.Parameters.AddWithValue("vote", vote.ToString());
                                cmd.ExecuteNonQuery();
                            }
                        }
                        VotesProcessed.Inc();
                        Console.WriteLine("Vote saved");
                    }
                    else
                    {
                        Thread.Sleep(100);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error: {ex.Message}");
                    VotesFailed.Inc();
                }
            }
        }
    }
}