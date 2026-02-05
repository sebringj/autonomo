namespace Autonomo;

/// <summary>
/// Result of a custom action
/// </summary>
public class ActionResult
{
    public bool Success { get; init; }
    public string? Message { get; init; }
    public string? Error { get; init; }
    public object? Data { get; init; }

    public Dictionary<string, object> ToDictionary()
    {
        var result = new Dictionary<string, object> { ["success"] = Success };
        if (Message != null) result["message"] = Message;
        if (Error != null) result["error"] = Error;
        if (Data != null) result["data"] = Data;
        return result;
    }

    public static ActionResult Ok(string? message = null, object? data = null)
        => new() { Success = true, Message = message, Data = data };

    public static ActionResult Fail(string error)
        => new() { Success = false, Error = error };
}

/// <summary>
/// Custom action handler delegate
/// </summary>
public delegate ActionResult CustomActionHandler(string? value);

/// <summary>
/// Singleton registry for custom actions
/// </summary>
public sealed class CustomActionsRegistry
{
    private static readonly Lazy<CustomActionsRegistry> _instance = new(() => new CustomActionsRegistry());
    public static CustomActionsRegistry Instance => _instance.Value;

    private readonly Dictionary<string, CustomActionHandler> _actions = new();
    private readonly List<Action> _listeners = new();
    private readonly object _lock = new();

    private CustomActionsRegistry() { }

    /// <summary>
    /// Register a custom action
    /// </summary>
    public Action Register(string name, CustomActionHandler handler)
    {
        lock (_lock)
        {
            _actions[name] = handler;
            NotifyChange();
            return () => Unregister(name);
        }
    }

    /// <summary>
    /// Unregister a custom action
    /// </summary>
    public void Unregister(string name)
    {
        lock (_lock)
        {
            if (_actions.Remove(name))
            {
                NotifyChange();
            }
        }
    }

    /// <summary>
    /// Clear all registered custom actions
    /// </summary>
    public void Clear()
    {
        lock (_lock)
        {
            _actions.Clear();
            NotifyChange();
        }
    }

    /// <summary>
    /// Execute a custom action
    /// </summary>
    public ActionResult Execute(string name, string? value = null)
    {
        CustomActionHandler? handler;
        lock (_lock)
        {
            _actions.TryGetValue(name, out handler);
        }

        if (handler == null)
        {
            return ActionResult.Fail($"Unknown custom action: {name}");
        }

        try
        {
            return handler(value);
        }
        catch (Exception ex)
        {
            return ActionResult.Fail(ex.Message);
        }
    }

    /// <summary>
    /// Check if action exists
    /// </summary>
    public bool Has(string name)
    {
        lock (_lock) { return _actions.ContainsKey(name); }
    }

    /// <summary>
    /// List all action names
    /// </summary>
    public List<string> List()
    {
        lock (_lock) { return _actions.Keys.ToList(); }
    }

    /// <summary>
    /// Subscribe to changes
    /// </summary>
    public Action OnChange(Action listener)
    {
        lock (_lock)
        {
            _listeners.Add(listener);
            return () => { lock (_lock) { _listeners.Remove(listener); } };
        }
    }

    private void NotifyChange()
    {
        foreach (var listener in _listeners.ToList())
        {
            listener();
        }
    }
}

/// <summary>
/// Static helper for custom actions
/// </summary>
public static class CustomActions
{
    public static CustomActionsRegistry Instance => CustomActionsRegistry.Instance;

    /// <summary>
    /// Register a custom action
    /// </summary>
    public static Action Register(string name, CustomActionHandler handler)
        => Instance.Register(name, handler);

    /// <summary>
    /// Execute a custom action
    /// </summary>
    public static ActionResult Execute(string name, string? value = null)
        => Instance.Execute(name, value);
}
