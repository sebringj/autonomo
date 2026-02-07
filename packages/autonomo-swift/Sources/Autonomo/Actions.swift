import Foundation

// MARK: - Action Result

/// Result of a custom action
public struct ActionResult {
    public let success: Bool
    public let message: String?
    public let error: String?
    public let data: Any?
    
    public init(success: Bool, message: String? = nil, error: String? = nil, data: Any? = nil) {
        self.success = success
        self.message = message
        self.error = error
        self.data = data
    }
    
    public static func ok(_ message: String? = nil, data: Any? = nil) -> ActionResult {
        ActionResult(success: true, message: message, data: data)
    }
    
    public static func fail(_ error: String) -> ActionResult {
        ActionResult(success: false, error: error)
    }
    
    public func toDictionary() -> [String: Any] {
        var result: [String: Any] = ["success": success]
        if let message = message { result["message"] = message }
        if let error = error { result["error"] = error }
        if let data = data { result["data"] = data }
        return result
    }
}

// MARK: - Custom Action Metadata

/// Metadata for a custom action - helps AI understand what it does
public struct CustomActionMeta {
    public let description: String?
    public let args: [String: String]?
    public let example: [String: String]?
    
    public init(description: String? = nil, args: [String: String]? = nil, example: [String: String]? = nil) {
        self.description = description
        self.args = args
        self.example = example
    }
}

/// Rich custom action info returned in state
public struct CustomActionInfo {
    public let name: String
    public let description: String?
    public let args: [String: String]?
    public let example: [String: String]?
    
    public func toDictionary() -> [String: Any] {
        var result: [String: Any] = ["name": name]
        if let description = description { result["description"] = description }
        if let args = args { result["args"] = args }
        if let example = example { result["example"] = example }
        return result
    }
}

// MARK: - Custom Action Handler

public typealias CustomActionHandler = (String?) -> ActionResult

// MARK: - Registered Action

private struct RegisteredAction {
    let handler: CustomActionHandler
    let meta: CustomActionMeta?
}

// MARK: - Custom Actions Registry

/// Singleton registry for custom actions
public class CustomActionsRegistry {
    public static let shared = CustomActionsRegistry()
    
    private var actions: [String: RegisteredAction] = [:]
    private var listeners: [() -> Void] = []
    private let lock = NSLock()
    
    private init() {}
    
    /// Register a custom action
    @discardableResult
    public func register(_ name: String, handler: @escaping CustomActionHandler, meta: CustomActionMeta? = nil) -> () -> Void {
        lock.lock()
        actions[name] = RegisteredAction(handler: handler, meta: meta)
        lock.unlock()
        notifyChange()
        return { [weak self] in self?.unregister(name) }
    }
    
    /// Unregister a custom action
    public func unregister(_ name: String) {
        lock.lock()
        let removed = actions.removeValue(forKey: name) != nil
        lock.unlock()
        if removed { notifyChange() }
    }
    
    /// Clear all registered custom actions
    public func clear() {
        lock.lock()
        actions.removeAll()
        lock.unlock()
        notifyChange()
    }
    
    /// Execute a custom action
    public func execute(_ name: String, value: String? = nil) -> ActionResult {
        lock.lock()
        let action = actions[name]
        lock.unlock()
        
        guard let action = action else {
            let available = list().isEmpty ? "none" : list().joined(separator: ", ")
            return .fail("Unknown custom action: \(name). Available: \(available)")
        }
        
        do {
            return action.handler(value)
        } catch {
            return .fail(error.localizedDescription)
        }
    }
    
    /// Check if action exists
    public func has(_ name: String) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return actions[name] != nil
    }
    
    /// List all action names
    public func list() -> [String] {
        lock.lock()
        defer { lock.unlock() }
        return Array(actions.keys)
    }
    
    /// Get rich info about all actions (for AI discoverability)
    public func getAll() -> [CustomActionInfo] {
        lock.lock()
        defer { lock.unlock() }
        return actions.map { name, action in
            CustomActionInfo(
                name: name,
                description: action.meta?.description,
                args: action.meta?.args,
                example: action.meta?.example
            )
        }
    }
    
    /// Subscribe to changes
    @discardableResult
    public func onChange(_ listener: @escaping () -> Void) -> () -> Void {
        lock.lock()
        listeners.append(listener)
        let index = listeners.count - 1
        lock.unlock()
        return { [weak self] in
            self?.lock.lock()
            if let self = self, index < self.listeners.count {
                self.listeners.remove(at: index)
            }
            self?.lock.unlock()
        }
    }
    
    private func notifyChange() {
        lock.lock()
        let currentListeners = listeners
        lock.unlock()
        for listener in currentListeners {
            listener()
        }
    }
}

// MARK: - Helper

/// Register a custom action
@discardableResult
public func registerCustomAction(_ name: String, handler: @escaping CustomActionHandler, meta: CustomActionMeta? = nil) -> () -> Void {
    CustomActionsRegistry.shared.register(name, handler: handler, meta: meta)
}
