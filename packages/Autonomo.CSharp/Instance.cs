namespace Autonomo;

/// <summary>
/// Platform type for the instance
/// </summary>
public enum Platform
{
    Web,
    Mobile,
    Desktop
}

/// <summary>
/// Configuration for initializing an app instance
/// </summary>
public class InstanceConfig
{
    public string Name { get; init; } = "";
    public Platform Platform { get; init; }
    public string? InstanceId { get; init; }
    public string? Version { get; init; }
    public Dictionary<string, object>? Meta { get; init; }
}

/// <summary>
/// Information about this app instance
/// </summary>
public class InstanceInfo
{
    public string InstanceId { get; init; } = "";
    public string Name { get; init; } = "";
    public string BridgeId { get; init; } = "";
    public Platform Platform { get; init; }
    public string? Version { get; init; }
    public long CreatedAt { get; init; }
    public Dictionary<string, object>? Meta { get; init; }

    public Dictionary<string, object> ToDictionary()
    {
        var result = new Dictionary<string, object>
        {
            ["instanceId"] = InstanceId,
            ["name"] = Name,
            ["bridgeId"] = BridgeId,
            ["platform"] = Platform.ToString().ToLower(),
            ["createdAt"] = CreatedAt
        };
        if (Version != null) result["version"] = Version;
        if (Meta != null) result["meta"] = Meta;
        return result;
    }
}

/// <summary>
/// Singleton instance manager
/// </summary>
public sealed class InstanceManager
{
    private static readonly Lazy<InstanceManager> _instance = new(() => new InstanceManager());
    public static InstanceManager Instance => _instance.Value;

    private InstanceInfo? _current;
    private readonly object _lock = new();

    private InstanceManager() { }

    /// <summary>
    /// Generate a short unique ID
    /// </summary>
    private static string GenerateInstanceId()
    {
        return Guid.NewGuid().ToString("N")[..8];
    }

    /// <summary>
    /// Initialize this app instance.
    /// 
    /// Call once at app startup. Each process gets a unique instance ID.
    /// </summary>
    /// <example>
    /// InstanceManager.Instance.InitInstance(new InstanceConfig
    /// {
    ///     Name = "my-app",
    ///     Platform = Platform.Desktop
    /// });
    /// </example>
    public InstanceInfo InitInstance(InstanceConfig config)
    {
        lock (_lock)
        {
            var instanceId = config.InstanceId ?? GenerateInstanceId();
            _current = new InstanceInfo
            {
                InstanceId = instanceId,
                Name = config.Name,
                BridgeId = $"{config.Name}-{instanceId}",
                Platform = config.Platform,
                Version = config.Version,
                CreatedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                Meta = config.Meta
            };
            Console.WriteLine($"[Autonomo] Instance initialized: {_current.BridgeId}");
            return _current;
        }
    }

    /// <summary>
    /// Get the current instance info
    /// </summary>
    public InstanceInfo? GetInstance()
    {
        lock (_lock)
        {
            return _current;
        }
    }

    /// <summary>
    /// Get the current instance info or throw
    /// </summary>
    public InstanceInfo RequireInstance()
    {
        lock (_lock)
        {
            if (_current == null)
            {
                throw new InvalidOperationException("Autonomo instance not initialized. Call InitInstance() first.");
            }
            return _current;
        }
    }

    /// <summary>
    /// Get just the bridge ID
    /// </summary>
    public string? GetBridgeId()
    {
        lock (_lock)
        {
            return _current?.BridgeId;
        }
    }

    /// <summary>
    /// Reset the instance (mainly for testing)
    /// </summary>
    public void ResetInstance()
    {
        lock (_lock)
        {
            _current = null;
        }
    }
}
