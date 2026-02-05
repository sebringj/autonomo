namespace Autonomo;

/// <summary>
/// Element types for registration
/// </summary>
public enum ElementType
{
    Button,
    Input,
    Toggle,
    Select,
    Link,
    Custom
}

/// <summary>
/// Handler for an interactive element
/// </summary>
public class ElementHandler
{
    public ElementType Type { get; init; }
    public Action<string?> Handler { get; init; } = null!;
    public bool Disabled { get; init; }
    public Func<string>? GetValue { get; init; }
    public Action? OnSubmit { get; init; }
    public string? Hint { get; init; }
    public Dictionary<string, object>? Meta { get; init; }
}

/// <summary>
/// Information about a registered element
/// </summary>
public class ElementInfo
{
    public string Id { get; init; } = "";
    public ElementType Type { get; init; }
    public bool Disabled { get; init; }
    public string? Value { get; init; }
    public string? Hint { get; init; }
    public Dictionary<string, object>? Meta { get; init; }

    public Dictionary<string, object> ToDictionary()
    {
        var result = new Dictionary<string, object>
        {
            ["id"] = Id,
            ["type"] = Type.ToString().ToLower()
        };
        if (Disabled) result["disabled"] = Disabled;
        if (Value != null) result["value"] = Value;
        if (Hint != null) result["hint"] = Hint;
        if (Meta != null) result["meta"] = Meta;
        return result;
    }
}

/// <summary>
/// Singleton registry for all interactive elements
/// </summary>
public sealed class ElementRegistry
{
    private static readonly Lazy<ElementRegistry> _instance = new(() => new ElementRegistry());
    public static ElementRegistry Instance => _instance.Value;

    private readonly Dictionary<string, ElementHandler> _elements = new();
    private readonly List<Action> _listeners = new();
    private readonly object _lock = new();

    private ElementRegistry() { }

    /// <summary>
    /// Register an interactive element
    /// </summary>
    public Action Register(string id, ElementHandler handler)
    {
        lock (_lock)
        {
            _elements[id] = handler;
            NotifyChange();
            return () => Unregister(id);
        }
    }

    /// <summary>
    /// Unregister an element
    /// </summary>
    public void Unregister(string id)
    {
        lock (_lock)
        {
            if (_elements.Remove(id))
            {
                NotifyChange();
            }
        }
    }

    /// <summary>
    /// Get handler for an element
    /// </summary>
    public ElementHandler? Get(string id)
    {
        lock (_lock)
        {
            return _elements.TryGetValue(id, out var handler) ? handler : null;
        }
    }

    /// <summary>
    /// Check if element exists
    /// </summary>
    public bool Has(string id)
    {
        lock (_lock)
        {
            return _elements.ContainsKey(id);
        }
    }

    /// <summary>
    /// List all element IDs
    /// </summary>
    public List<string> List()
    {
        lock (_lock)
        {
            return _elements.Keys.ToList();
        }
    }

    /// <summary>
    /// Get detailed info for all elements
    /// </summary>
    public List<ElementInfo> GetAll()
    {
        lock (_lock)
        {
            return _elements.Select(kvp => new ElementInfo
            {
                Id = kvp.Key,
                Type = kvp.Value.Type,
                Disabled = kvp.Value.Disabled,
                Value = kvp.Value.GetValue?.Invoke(),
                Hint = kvp.Value.Hint,
                Meta = kvp.Value.Meta
            }).ToList();
        }
    }

    /// <summary>
    /// Find elements matching a regex pattern
    /// </summary>
    public List<ElementInfo> Find(string pattern)
    {
        var regex = new System.Text.RegularExpressions.Regex(pattern);
        return GetAll().Where(el => regex.IsMatch(el.Id)).ToList();
    }

    /// <summary>
    /// Clear all elements
    /// </summary>
    public void Clear()
    {
        lock (_lock)
        {
            _elements.Clear();
            NotifyChange();
        }
    }

    /// <summary>
    /// Get count of registered elements
    /// </summary>
    public int Size
    {
        get { lock (_lock) { return _elements.Count; } }
    }

    /// <summary>
    /// Subscribe to registry changes
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
/// Static helper methods for element registration
/// </summary>
public static class Registry
{
    public static ElementRegistry Instance => ElementRegistry.Instance;

    /// <summary>
    /// Register a tap handler for a component
    /// </summary>
    public static Action RegisterTapHandler(
        string id,
        Action handler,
        bool disabled = false,
        string? hint = null,
        Dictionary<string, object>? meta = null)
    {
        return Instance.Register(id, new ElementHandler
        {
            Type = ElementType.Button,
            Handler = _ => handler(),
            Disabled = disabled,
            Hint = hint,
            Meta = meta
        });
    }

    /// <summary>
    /// Register a fill handler for an input
    /// </summary>
    public static Action RegisterFillHandler(
        string id,
        Action<string> handler,
        Func<string>? getValue = null,
        Action? onSubmit = null,
        bool disabled = false,
        string? hint = null,
        Dictionary<string, object>? meta = null)
    {
        return Instance.Register(id, new ElementHandler
        {
            Type = ElementType.Input,
            Handler = v => handler(v ?? ""),
            GetValue = getValue,
            OnSubmit = onSubmit,
            Disabled = disabled,
            Hint = hint,
            Meta = meta
        });
    }

    /// <summary>
    /// Register a toggle handler
    /// </summary>
    public static Action RegisterToggleHandler(
        string id,
        Action<string?> handler,
        Func<string>? getValue = null,
        bool disabled = false,
        string? hint = null,
        Dictionary<string, object>? meta = null)
    {
        return Instance.Register(id, new ElementHandler
        {
            Type = ElementType.Toggle,
            Handler = handler,
            GetValue = getValue,
            Disabled = disabled,
            Hint = hint,
            Meta = meta
        });
    }
}
