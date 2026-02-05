import Foundation

// MARK: - Command Result

/// Result of a command execution
public struct CommandResult {
    public let success: Bool
    public let state: AppState
    public let message: String?
    public let error: String?
    
    public init(success: Bool, state: AppState, message: String? = nil, error: String? = nil) {
        self.success = success
        self.state = state
        self.message = message
        self.error = error
    }
    
    public static func ok(_ message: String? = nil) -> CommandResult {
        CommandResult(success: true, state: StateManager.shared.getState(), message: message)
    }
    
    public static func fail(_ error: String) -> CommandResult {
        CommandResult(success: false, state: StateManager.shared.getState(), error: error)
    }
    
    public func toDictionary() -> [String: Any] {
        var result: [String: Any] = [
            "success": success,
            "state": state.toDictionary()
        ]
        if let message = message { result["message"] = message }
        if let error = error { result["error"] = error }
        return result
    }
}

// MARK: - Navigation Handler

public typealias NavigationHandler = (String) -> Void

// MARK: - Commands

/// Command execution
public class Commands {
    public static var navigationHandler: NavigationHandler?
    
    /// Navigate to a screen
    public static func navigate(_ screen: String) -> CommandResult {
        guard let handler = navigationHandler else {
            return .fail("No navigation handler registered")
        }
        
        handler(screen)
        Thread.sleep(forTimeInterval: 0.1)
        return .ok("Navigated to \(screen)")
    }
    
    /// Press/tap an element
    public static func press(_ elementId: String) -> CommandResult {
        guard let handler = ElementRegistry.shared.get(elementId) else {
            let available = ElementRegistry.shared.list().joined(separator: ", ")
            return .fail("Element not found: \(elementId). Available: \(available)")
        }
        
        if handler.disabled {
            return .fail("Element is disabled: \(elementId)")
        }
        
        handler.handler(nil)
        Thread.sleep(forTimeInterval: 0.1)
        return .ok("Pressed \(elementId)")
    }
    
    /// Fill text into an input element
    public static func fill(_ elementId: String, value: String) -> CommandResult {
        guard let handler = ElementRegistry.shared.get(elementId) else {
            let available = ElementRegistry.shared.list().joined(separator: ", ")
            return .fail("Element not found: \(elementId). Available: \(available)")
        }
        
        if handler.type != .input {
            return .fail("Element \(elementId) is not an input (type: \(handler.type.rawValue))")
        }
        
        if handler.disabled {
            return .fail("Element is disabled: \(elementId)")
        }
        
        handler.handler(value)
        Thread.sleep(forTimeInterval: 0.05)
        return .ok("Filled \(elementId) with \"\(value)\"")
    }
    
    /// Submit an input (press enter)
    public static func submit(_ elementId: String) -> CommandResult {
        guard let handler = ElementRegistry.shared.get(elementId) else {
            return .fail("Element not found: \(elementId)")
        }
        
        guard let onSubmit = handler.onSubmit else {
            return .fail("Element \(elementId) does not support submit")
        }
        
        onSubmit()
        Thread.sleep(forTimeInterval: 0.1)
        return .ok("Submitted \(elementId)")
    }
    
    /// Execute a custom action
    public static func custom(_ actionName: String, value: String? = nil) -> CommandResult {
        let result = CustomActionsRegistry.shared.execute(actionName, value: value)
        return CommandResult(
            success: result.success,
            state: StateManager.shared.getState(),
            message: result.message,
            error: result.error
        )
    }
    
    /// Wait for a duration
    public static func wait(_ ms: Int) -> CommandResult {
        Thread.sleep(forTimeInterval: Double(ms) / 1000.0)
        return .ok("Waited \(ms)ms")
    }
    
    /// Get current state without any action
    public static func getState() -> CommandResult {
        .ok()
    }
    
    /// Execute a command by type
    public static func execute(command: String, target: String? = nil, value: String? = nil) -> CommandResult {
        switch command.lowercased() {
        case "navigate":
            guard let target = target else {
                return .fail("Navigate requires a target screen")
            }
            return navigate(target)
            
        case "press", "tap", "click":
            guard let target = target else {
                return .fail("Press requires a target element ID")
            }
            return press(target)
            
        case "fill", "type":
            guard let target = target else {
                return .fail("Fill requires a target element ID")
            }
            return fill(target, value: value ?? "")
            
        case "submit":
            guard let target = target else {
                return .fail("Submit requires a target element ID")
            }
            return submit(target)
            
        case "custom":
            guard let target = target else {
                return .fail("Custom requires an action name")
            }
            return custom(target, value: value)
            
        case "wait":
            return wait(Int(target ?? "1000") ?? 1000)
            
        case "state", "snapshot":
            return getState()
            
        default:
            return .fail("Unknown command: \(command)")
        }
    }
}

// MARK: - Convenience

/// Set the navigation handler
public func setNavigationHandler(_ handler: @escaping NavigationHandler) {
    Commands.navigationHandler = handler
}

/// Execute a command
public func executeCommand(_ command: String, target: String? = nil, value: String? = nil) -> CommandResult {
    Commands.execute(command: command, target: target, value: value)
}
