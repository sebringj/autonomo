using System.Net;
using System.Text;
using System.Text.Json;

namespace Autonomo;

/// <summary>
/// Configuration for the Autonomo transport
/// </summary>
public class TransportConfig
{
    public int Port { get; init; } = 8080;
    public string Host { get; init; } = "127.0.0.1";
    public bool Cors { get; init; } = true;
    public Action<string>? OnStart { get; init; }
    public Action<string, string?, string?>? OnCommand { get; init; }
}

/// <summary>
/// Running transport instance
/// </summary>
public class TransportInstance : IDisposable
{
    public string Url { get; }
    private readonly HttpListener _listener;
    private readonly CancellationTokenSource _cts;
    private readonly Task _task;

    internal TransportInstance(string url, HttpListener listener, CancellationTokenSource cts, Task task)
    {
        Url = url;
        _listener = listener;
        _cts = cts;
        _task = task;
    }

    public void Stop()
    {
        _cts.Cancel();
        _listener.Stop();
    }

    public void Dispose()
    {
        Stop();
        _listener.Close();
        _cts.Dispose();
    }
}

/// <summary>
/// HTTP request/response handling
/// </summary>
public class RequestResult
{
    public int Status { get; init; }
    public object Body { get; init; } = null!;
}

/// <summary>
/// HTTP transport for AI communication
/// </summary>
public static class Transport
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    /// <summary>
    /// Handle an incoming HTTP request
    /// </summary>
    public static RequestResult HandleRequest(string method, string path, Dictionary<string, object>? body = null)
    {
        // Health check
        if (method == "GET" && path == "/health")
        {
            return new RequestResult
            {
                Status = 200,
                Body = new { status = "ok", timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }
            };
        }

        // Get current state
        if (method == "GET" && path == "/state")
        {
            return new RequestResult
            {
                Status = 200,
                Body = StateManager.Instance.GetState().ToDictionary()
            };
        }

        // Execute command
        if (method == "POST" && path == "/command")
        {
            if (body == null)
            {
                return new RequestResult
                {
                    Status = 400,
                    Body = new { error = "Missing request body" }
                };
            }

            var command = body.TryGetValue("command", out var c) ? c?.ToString() : null;
            var target = body.TryGetValue("target", out var t) ? t?.ToString() : null;
            var value = body.TryGetValue("value", out var v) ? v?.ToString() : null;

            if (command == null)
            {
                return new RequestResult
                {
                    Status = 400,
                    Body = new { error = "Missing command field" }
                };
            }

            var result = Commands.Execute(command, target, value);
            return new RequestResult
            {
                Status = result.Success ? 200 : 400,
                Body = result.ToDictionary()
            };
        }

        // Not found
        return new RequestResult
        {
            Status = 404,
            Body = new { error = "Not found" }
        };
    }

    /// <summary>
    /// Create and start HTTP transport
    /// </summary>
    public static TransportInstance CreateHttpTransport(TransportConfig config)
    {
        var url = $"http://{config.Host}:{config.Port}/";
        var listener = new HttpListener();
        listener.Prefixes.Add(url);
        listener.Start();

        var cts = new CancellationTokenSource();
        var task = Task.Run(async () =>
        {
            while (!cts.IsCancellationRequested)
            {
                try
                {
                    var context = await listener.GetContextAsync();
                    _ = Task.Run(() => HandleHttpRequest(context, config.Cors));
                }
                catch (HttpListenerException) when (cts.IsCancellationRequested)
                {
                    break;
                }
                catch (ObjectDisposedException)
                {
                    break;
                }
            }
        }, cts.Token);

        config.OnStart?.Invoke(url.TrimEnd('/'));

        return new TransportInstance(url.TrimEnd('/'), listener, cts, task);
    }

    private static async Task HandleHttpRequest(HttpListenerContext context, bool cors)
    {
        var request = context.Request;
        var response = context.Response;

        try
        {
            // CORS
            if (cors)
            {
                response.Headers.Add("Access-Control-Allow-Origin", "*");
                response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
            }

            // Handle OPTIONS
            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 200;
                response.Close();
                return;
            }

            // Parse body
            Dictionary<string, object>? body = null;
            if (request.HasEntityBody)
            {
                using var reader = new StreamReader(request.InputStream, request.ContentEncoding);
                var json = await reader.ReadToEndAsync();
                body = JsonSerializer.Deserialize<Dictionary<string, object>>(json, JsonOptions);
            }

            // Handle request
            var path = request.Url?.AbsolutePath ?? "/";
            var result = HandleRequest(request.HttpMethod, path, body);

            // Send response
            response.StatusCode = result.Status;
            response.ContentType = "application/json";
            var responseBody = JsonSerializer.Serialize(result.Body, JsonOptions);
            var buffer = Encoding.UTF8.GetBytes(responseBody);
            response.ContentLength64 = buffer.Length;
            await response.OutputStream.WriteAsync(buffer);
        }
        finally
        {
            response.Close();
        }
    }
}
