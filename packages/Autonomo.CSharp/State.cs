namespace Autonomo;

/// <summary>
/// User context information
/// </summary>
public class UserContext
{
    public string? Id { get; init; }
    public string? Email { get; init; }
    public string? Role { get; init; }
    public Dictionary<string, object>? Extra { get; init; }

    public Dictionary<string, object> ToDictionary()
    {
        var result = new Dictionary<string, object>();
        if (Id != null) result["id"] = Id;
        if (Email != null) result["email"] = Email;
        if (Role != null) result["role"] = Role;
        if (Extra != null)
        {
            foreach (var kvp in Extra)
            {
                result[kvp.Key] = kvp.Value;
            }
        }
        return result;
    }
}

/// <summary>
/// Network request information
/// </summary>
public class NetworkRequest
{
    public string Method { get; init; } = "";
    public string Url { get; init; } = "";
    public int? Status { get; init; }
    public int? Duration { get; init; }
    public string? Error { get; init; }

    public Dictionary<string, object> ToDictionary()
    {
        var result = new Dictionary<string, object>
        {
            ["method"] = Method,
            ["url"] = Url
        };
        if (Status.HasValue) result["status"] = Status.Value;
        if (Duration.HasValue) result["duration"] = Duration.Value;
        if (Error != null) result["error"] = Error;
        return result;
    }
}

/// <summary>
/// Complete application state snapshot
/// </summary>
public class AppState
{
    public string Screen { get; init; } = "";
    public long Timestamp { get; init; }
    public UserContext? User { get; init; }
    public List<ElementInfo> Elements { get; init; } = new();
    public List<string> CustomActions { get; init; } = new();
    public Dictionary<string, object>? Data { get; init; }
    public List<string> Errors { get; init; } = new();
    public List<string> Logs { get; init; } = new();
    public List<string> RenderErrors { get; init; } = new();
    public List<NetworkRequest>? Network { get; init; }

    public Dictionary<string, object> ToDictionary()
    {
        var result = new Dictionary<string, object>
        {
            ["screen"] = Screen,
            ["timestamp"] = Timestamp,
            ["elements"] = Elements.Select(e => e.ToDictionary()).ToList(),
            ["customActions"] = CustomActions,
            ["errors"] = Errors,
            ["logs"] = Logs,
            ["renderErrors"] = RenderErrors
        };
        if (User != null) result["user"] = User.ToDictionary();
        if (Data != null) result["data"] = Data;
        if (Network != null) result["network"] = Network.Select(n => n.ToDictionary()).ToList();
        return result;
    }
}

/// <summary>
/// Singleton state manager
/// </summary>
public sealed class StateManager
{
    private static readonly Lazy<StateManager> _instance = new(() => new StateManager());
    public static StateManager Instance => _instance.Value;

    private const int MaxErrors = 50;
    private const int MaxLogs = 100;
    private const int MaxNetwork = 50;

    private string _screen = "unknown";
    private UserContext? _user;
    private Dictionary<string, object> _data = new();
    private readonly List<string> _errors = new();
    private readonly List<string> _logs = new();
    private readonly List<string> _renderErrors = new();
    private readonly List<NetworkRequest> _network = new();
    private readonly List<Action<AppState>> _listeners = new();
    private readonly object _lock = new();

    private StateManager()
    {
        // Forward registry/action changes
        ElementRegistry.Instance.OnChange(() => NotifyChange());
        CustomActionsRegistry.Instance.OnChange(() => NotifyChange());
    }

    /// <summary>
    /// Set current screen/route
    /// </summary>
    public void SetScreen(string screen)
    {
        lock (_lock)
        {
            _screen = screen;
            NotifyChange();
        }
    }

    /// <summary>
    /// Get current screen
    /// </summary>
    public string GetScreen()
    {
        lock (_lock) { return _screen; }
    }

    /// <summary>
    /// Set user context
    /// </summary>
    public void SetUser(UserContext? user)
    {
        lock (_lock)
        {
            _user = user;
            NotifyChange();
        }
    }

    /// <summary>
    /// Set application data
    /// </summary>
    public void SetData(Dictionary<string, object> data)
    {
        lock (_lock)
        {
            _data = data;
            NotifyChange();
        }
    }

    /// <summary>
    /// Merge data into existing
    /// </summary>
    public void MergeData(Dictionary<string, object> data)
    {
        lock (_lock)
        {
            foreach (var kvp in data)
            {
                _data[kvp.Key] = kvp.Value;
            }
            NotifyChange();
        }
    }

    /// <summary>
    /// Add an error
    /// </summary>
    public void AddError(string error)
    {
        lock (_lock)
        {
            _errors.Add(error);
            while (_errors.Count > MaxErrors) _errors.RemoveAt(0);
            NotifyChange();
        }
    }

    /// <summary>
    /// Add a log entry
    /// </summary>
    public void AddLog(string log)
    {
        lock (_lock)
        {
            _logs.Add(log);
            while (_logs.Count > MaxLogs) _logs.RemoveAt(0);
        }
    }

    /// <summary>
    /// Add a render error
    /// </summary>
    public void AddRenderError(string error)
    {
        lock (_lock)
        {
            _renderErrors.Add(error);
            while (_renderErrors.Count > MaxErrors) _renderErrors.RemoveAt(0);
            NotifyChange();
        }
    }

    /// <summary>
    /// Add a network request
    /// </summary>
    public void AddNetworkRequest(NetworkRequest request)
    {
        lock (_lock)
        {
            _network.Add(request);
            while (_network.Count > MaxNetwork) _network.RemoveAt(0);
        }
    }

    /// <summary>
    /// Clear errors
    /// </summary>
    public void ClearErrors()
    {
        lock (_lock)
        {
            _errors.Clear();
            _renderErrors.Clear();
            NotifyChange();
        }
    }

    /// <summary>
    /// Clear logs
    /// </summary>
    public void ClearLogs()
    {
        lock (_lock) { _logs.Clear(); }
    }

    /// <summary>
    /// Clear network history
    /// </summary>
    public void ClearNetwork()
    {
        lock (_lock) { _network.Clear(); }
    }

    /// <summary>
    /// Get current state snapshot
    /// </summary>
    public AppState GetState()
    {
        lock (_lock)
        {
            return new AppState
            {
                Screen = _screen,
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                User = _user,
                Elements = ElementRegistry.Instance.GetAll(),
                CustomActions = CustomActionsRegistry.Instance.List(),
                Data = _data.Count > 0 ? new Dictionary<string, object>(_data) : null,
                Errors = _errors.ToList(),
                Logs = _logs.ToList(),
                RenderErrors = _renderErrors.ToList(),
                Network = _network.Count > 0 ? _network.ToList() : null
            };
        }
    }

    /// <summary>
    /// Subscribe to state changes
    /// </summary>
    public Action OnChange(Action<AppState> listener)
    {
        lock (_lock)
        {
            _listeners.Add(listener);
            return () => { lock (_lock) { _listeners.Remove(listener); } };
        }
    }

    /// <summary>
    /// Trigger a state update notification
    /// </summary>
    public void NotifyChange()
    {
        var state = GetState();
        foreach (var listener in _listeners.ToList())
        {
            listener(state);
        }
    }
}

/// <summary>
/// Static helper for state management
/// </summary>
public static class State
{
    public static StateManager Instance => StateManager.Instance;

    public static void SetScreen(string screen) => Instance.SetScreen(screen);
    public static string GetScreen() => Instance.GetScreen();
    public static void SetUser(UserContext? user) => Instance.SetUser(user);
    public static void SetData(Dictionary<string, object> data) => Instance.SetData(data);
    public static void MergeData(Dictionary<string, object> data) => Instance.MergeData(data);
    public static void AddError(string error) => Instance.AddError(error);
    public static void AddLog(string log) => Instance.AddLog(log);
    public static AppState GetState() => Instance.GetState();
    public static Action OnChange(Action<AppState> listener) => Instance.OnChange(listener);
}
