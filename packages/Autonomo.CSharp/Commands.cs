namespace Autonomo;

/// <summary>
/// Result of a command execution
/// </summary>
public class CommandResult
{
    public bool Success { get; init; }
    public AppState State { get; init; } = null!;
    public string? Message { get; init; }
    public string? Error { get; init; }

    public Dictionary<string, object> ToDictionary()
    {
        var result = new Dictionary<string, object>
        {
            ["success"] = Success,
            ["state"] = State.ToDictionary()
        };
        if (Message != null) result["message"] = Message;
        if (Error != null) result["error"] = Error;
        return result;
    }

    public static CommandResult Ok(string? message = null)
        => new() { Success = true, Message = message, State = StateManager.Instance.GetState() };

    public static CommandResult Fail(string error)
        => new() { Success = false, Error = error, State = StateManager.Instance.GetState() };
}

/// <summary>
/// Navigation handler delegate
/// </summary>
public delegate void NavigationHandler(string screen);

/// <summary>
/// Command execution service
/// </summary>
public static class Commands
{
    private static NavigationHandler? _navigationHandler;

    /// <summary>
    /// Set the navigation handler
    /// </summary>
    public static void SetNavigationHandler(NavigationHandler handler)
    {
        _navigationHandler = handler;
    }

    /// <summary>
    /// Navigate to a screen
    /// </summary>
    public static CommandResult Navigate(string screen)
    {
        try
        {
            if (_navigationHandler == null)
            {
                return CommandResult.Fail("No navigation handler registered");
            }
            _navigationHandler(screen);
            Thread.Sleep(100);
            return CommandResult.Ok($"Navigated to {screen}");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    /// <summary>
    /// Press/tap an element
    /// </summary>
    public static CommandResult Press(string elementId)
    {
        var handler = ElementRegistry.Instance.Get(elementId);
        if (handler == null)
        {
            var available = string.Join(", ", ElementRegistry.Instance.List());
            return CommandResult.Fail($"Element not found: {elementId}. Available: {available}");
        }
        if (handler.Disabled)
        {
            return CommandResult.Fail($"Element is disabled: {elementId}");
        }
        try
        {
            handler.Handler(null);
            Thread.Sleep(100);
            return CommandResult.Ok($"Pressed {elementId}");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    /// <summary>
    /// Fill text into an input element
    /// </summary>
    public static CommandResult Fill(string elementId, string value)
    {
        var handler = ElementRegistry.Instance.Get(elementId);
        if (handler == null)
        {
            var available = string.Join(", ", ElementRegistry.Instance.List());
            return CommandResult.Fail($"Element not found: {elementId}. Available: {available}");
        }
        if (handler.Type != ElementType.Input)
        {
            return CommandResult.Fail($"Element {elementId} is not an input (type: {handler.Type})");
        }
        if (handler.Disabled)
        {
            return CommandResult.Fail($"Element is disabled: {elementId}");
        }
        try
        {
            handler.Handler(value);
            Thread.Sleep(50);
            return CommandResult.Ok($"Filled {elementId} with \"{value}\"");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    /// <summary>
    /// Submit an input (press enter)
    /// </summary>
    public static CommandResult Submit(string elementId)
    {
        var handler = ElementRegistry.Instance.Get(elementId);
        if (handler == null)
        {
            return CommandResult.Fail($"Element not found: {elementId}");
        }
        if (handler.OnSubmit == null)
        {
            return CommandResult.Fail($"Element {elementId} does not support submit");
        }
        try
        {
            handler.OnSubmit();
            Thread.Sleep(100);
            return CommandResult.Ok($"Submitted {elementId}");
        }
        catch (Exception ex)
        {
            return CommandResult.Fail(ex.Message);
        }
    }

    /// <summary>
    /// Execute a custom action
    /// </summary>
    public static CommandResult Custom(string actionName, string? value = null)
    {
        var result = CustomActionsRegistry.Instance.Execute(actionName, value);
        return new CommandResult
        {
            Success = result.Success,
            Message = result.Message,
            Error = result.Error,
            State = StateManager.Instance.GetState()
        };
    }

    /// <summary>
    /// Wait for a duration
    /// </summary>
    public static CommandResult Wait(int ms)
    {
        Thread.Sleep(ms);
        return CommandResult.Ok($"Waited {ms}ms");
    }

    /// <summary>
    /// Get current state without any action
    /// </summary>
    public static CommandResult GetState()
    {
        return CommandResult.Ok();
    }

    /// <summary>
    /// Execute a command by type
    /// </summary>
    public static CommandResult Execute(string command, string? target = null, string? value = null)
    {
        var cmd = command.ToLower();

        return cmd switch
        {
            "navigate" when target == null =>
                CommandResult.Fail("Navigate requires a target screen"),
            "navigate" =>
                Navigate(target!),

            "press" or "tap" or "click" when target == null =>
                CommandResult.Fail("Press requires a target element ID"),
            "press" or "tap" or "click" =>
                Press(target!),

            "fill" or "type" when target == null =>
                CommandResult.Fail("Fill requires a target element ID"),
            "fill" or "type" =>
                Fill(target!, value ?? ""),

            "submit" when target == null =>
                CommandResult.Fail("Submit requires a target element ID"),
            "submit" =>
                Submit(target!),

            "custom" when target == null =>
                CommandResult.Fail("Custom requires an action name"),
            "custom" =>
                Custom(target!, value),

            "wait" =>
                Wait(int.TryParse(target, out var ms) ? ms : 1000),

            "state" or "snapshot" =>
                GetState(),

            _ => CommandResult.Fail($"Unknown command: {command}")
        };
    }
}
