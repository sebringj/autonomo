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
/// Metadata for a custom action - helps AI understand what it does
/// </summary>
public class CustomActionMeta
{
    public string? Description { get; init; }
    public Dictionary<string, string>? Args { get; init; }
    public Dictionary<string, string>? Example { get; init; }
}

/// <summary>
/// Rich custom action info returned in state
/// </summary>
public class CustomActionInfo
{
    public string Name { get; init; } = "";
    public string? Description { get; init; }
    public Dictionary<string, string>? Args { get; init; }
    public Dictionary<string, string>? Example { get; init; }

    public Dictionary<string, object> ToDictionary()
    {
        var result = new Dictionary<string, object> { ["name"] = Name };
        if (Description != null) result["description"] = Description;
        if (Args != null) result["args"] = Args;
        if (Example != null) result["example"] = Example;
        return result;
    }
}

/// <summary>
/// Custom action handler delegate
/// </summary>
public delegate ActionResult CustomActionHandler(string? value);

/// <summary>
/// Internal registered action
/// </summary>
internal class RegisteredAction
{
    public CustomActionHandler Handler { get; init; } = null!;
    public CustomActionMeta? Meta { get; init; }
}

/// <summary>
/// Singleton registry for custom actions
/// </summary>
public sealed class CustomActionsRegistry
{
    private static readonly Lazy<CustomActionsRegistry> _instance = new(() => new CustomActionsRegistry());
    public static CustomActionsRegistry Instance => _instance.Value;

    private readonly Dictionary<string, RegisteredAction> _actions = new();
    private readonly List<Action> _listeners = new();
    private readonly object _lock = new();

    private CustomActionsRegistry() { }

    /// <summary>
    /// Register a custom action
    /// </summary>
    public Action Register(string name, CustomActionHandler handler, CustomActionMeta? meta = null)
    {
        lock (_lock)
        {
            _actions[name] = new RegisteredAction { Handler = handler, Meta = meta };
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
        RegisteredAction? action;
        lock (_lock)
        {
            _actions.TryGetValue(name, out action);
        }

        if (action == null)
        {
            var available = List().Count == 0 ? "none" : string.Join(", ", List());
            return ActionResult.Fail($"Unknown custom action: {name}. Available: {available}");
        }

        try
        {
            return action.Handler(value);
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
    /// Get rich info about all actions (for AI discoverability)
    /// </summary>
    public List<CustomActionInfo> GetAll()
    {
        lock (_lock)
        {
            return _actions.Select(kvp => new CustomActionInfo
            {
                Name = kvp.Key,
                Description = kvp.Value.Meta?.Description,
                Args = kvp.Value.Meta?.Args,
                Example = kvp.Value.Meta?.Example
            }).ToList();
        }
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
    public static Action Register(string name, CustomActionHandler handler, CustomActionMeta? meta = null)
        => Instance.Register(name, handler, meta);

    /// <summary>
    /// Execute a custom action
    /// </summary>
    public static ActionResult Execute(string name, string? value = null)
        => Instance.Execute(name, value);
}
