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

// MARK: - Custom Action Handler

public typealias CustomActionHandler = (String?) -> ActionResult

// MARK: - Custom Actions Registry

/// Singleton registry for custom actions
public class CustomActionsRegistry {
    public static let shared = CustomActionsRegistry()
    
    private var actions: [String: CustomActionHandler] = [:]
    private var listeners: [() -> Void] = []
    private let lock = NSLock()
    
    private init() {}
    
    /// Register a custom action
    @discardableResult
    public func register(_ name: String, handler: @escaping CustomActionHandler) -> () -> Void {
        lock.lock()
        actions[name] = handler
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
        let handler = actions[name]
        lock.unlock()
        
        guard let handler = handler else {
            return .fail("Unknown custom action: \(name)")
        }
        
        do {
            return handler(value)
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
public func registerCustomAction(_ name: String, handler: @escaping CustomActionHandler) -> () -> Void {
    CustomActionsRegistry.shared.register(name, handler: handler)
}
