// Autonomo - AI-powered application testing for Swift
// https://github.com/sebringj/autonomo

@_exported import Foundation

// MARK: - Element Types

/// Types of interactive elements
public enum ElementType: String, Codable {
    case button
    case input
    case toggle
    case select
    case link
    case custom
}

// MARK: - Element Handler

/// Handler for an interactive element
public class ElementHandler {
    public let type: ElementType
    public let handler: (String?) -> Void
    public var disabled: Bool
    public var getValue: (() -> String)?
    public var onSubmit: (() -> Void)?
    public var hint: String?
    public var meta: [String: Any]?
    
    public init(
        type: ElementType,
        handler: @escaping (String?) -> Void,
        disabled: Bool = false,
        getValue: (() -> String)? = nil,
        onSubmit: (() -> Void)? = nil,
        hint: String? = nil,
        meta: [String: Any]? = nil
    ) {
        self.type = type
        self.handler = handler
        self.disabled = disabled
        self.getValue = getValue
        self.onSubmit = onSubmit
        self.hint = hint
        self.meta = meta
    }
}

// MARK: - Element Info

/// Information about a registered element
public struct ElementInfo: Codable {
    public let id: String
    public let type: ElementType
    public var disabled: Bool
    public var value: String?
    public var hint: String?
    
    public init(id: String, type: ElementType, disabled: Bool = false, value: String? = nil, hint: String? = nil) {
        self.id = id
        self.type = type
        self.disabled = disabled
        self.value = value
        self.hint = hint
    }
    
    public func toDictionary() -> [String: Any] {
        var result: [String: Any] = ["id": id, "type": type.rawValue]
        if disabled { result["disabled"] = disabled }
        if let value = value { result["value"] = value }
        if let hint = hint { result["hint"] = hint }
        return result
    }
}

// MARK: - Element Registry

/// Singleton registry for all interactive elements
public class ElementRegistry {
    public static let shared = ElementRegistry()
    
    private var elements: [String: ElementHandler] = [:]
    private var listeners: [() -> Void] = []
    private let lock = NSLock()
    
    private init() {}
    
    /// Register an interactive element
    @discardableResult
    public func register(_ id: String, handler: ElementHandler) -> () -> Void {
        lock.lock()
        elements[id] = handler
        lock.unlock()
        notifyChange()
        return { [weak self] in self?.unregister(id) }
    }
    
    /// Unregister an element
    public func unregister(_ id: String) {
        lock.lock()
        let removed = elements.removeValue(forKey: id) != nil
        lock.unlock()
        if removed { notifyChange() }
    }
    
    /// Get handler for an element
    public func get(_ id: String) -> ElementHandler? {
        lock.lock()
        defer { lock.unlock() }
        return elements[id]
    }
    
    /// Check if element exists
    public func has(_ id: String) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return elements[id] != nil
    }
    
    /// List all element IDs
    public func list() -> [String] {
        lock.lock()
        defer { lock.unlock() }
        return Array(elements.keys)
    }
    
    /// Get detailed info for all elements
    public func getAll() -> [ElementInfo] {
        lock.lock()
        defer { lock.unlock() }
        return elements.map { id, handler in
            ElementInfo(
                id: id,
                type: handler.type,
                disabled: handler.disabled,
                value: handler.getValue?(),
                hint: handler.hint
            )
        }
    }
    
    /// Find elements matching a regex pattern
    public func find(_ pattern: String) -> [ElementInfo] {
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
        return getAll().filter { info in
            let range = NSRange(info.id.startIndex..., in: info.id)
            return regex.firstMatch(in: info.id, range: range) != nil
        }
    }
    
    /// Clear all elements
    public func clear() {
        lock.lock()
        elements.removeAll()
        lock.unlock()
        notifyChange()
    }
    
    /// Get count of registered elements
    public var count: Int {
        lock.lock()
        defer { lock.unlock() }
        return elements.count
    }
    
    /// Subscribe to registry changes
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

// MARK: - Registration Helpers

/// Register a tap handler for a component
@discardableResult
public func registerTapHandler(
    _ id: String,
    disabled: Bool = false,
    hint: String? = nil,
    meta: [String: Any]? = nil,
    handler: @escaping () -> Void
) -> () -> Void {
    ElementRegistry.shared.register(id, handler: ElementHandler(
        type: .button,
        handler: { _ in handler() },
        disabled: disabled,
        hint: hint,
        meta: meta
    ))
}

/// Register a fill handler for an input
@discardableResult
public func registerFillHandler(
    _ id: String,
    getValue: (() -> String)? = nil,
    onSubmit: (() -> Void)? = nil,
    disabled: Bool = false,
    hint: String? = nil,
    meta: [String: Any]? = nil,
    handler: @escaping (String) -> Void
) -> () -> Void {
    ElementRegistry.shared.register(id, handler: ElementHandler(
        type: .input,
        handler: { value in handler(value ?? "") },
        disabled: disabled,
        getValue: getValue,
        onSubmit: onSubmit,
        hint: hint,
        meta: meta
    ))
}

/// Register a toggle handler
@discardableResult
public func registerToggleHandler(
    _ id: String,
    getValue: (() -> String)? = nil,
    disabled: Bool = false,
    hint: String? = nil,
    meta: [String: Any]? = nil,
    handler: @escaping (String?) -> Void
) -> () -> Void {
    ElementRegistry.shared.register(id, handler: ElementHandler(
        type: .toggle,
        handler: handler,
        disabled: disabled,
        getValue: getValue,
        hint: hint,
        meta: meta
    ))
}
