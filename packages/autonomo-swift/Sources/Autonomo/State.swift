import Foundation

// MARK: - User Context

/// User context information
public struct UserContext {
    public var id: String?
    public var email: String?
    public var role: String?
    public var extra: [String: Any]
    
    public init(id: String? = nil, email: String? = nil, role: String? = nil, extra: [String: Any] = [:]) {
        self.id = id
        self.email = email
        self.role = role
        self.extra = extra
    }
    
    public func toDictionary() -> [String: Any] {
        var result: [String: Any] = [:]
        if let id = id { result["id"] = id }
        if let email = email { result["email"] = email }
        if let role = role { result["role"] = role }
        for (key, value) in extra { result[key] = value }
        return result
    }
}

// MARK: - Network Request

/// Network request information
public struct NetworkRequest {
    public let method: String
    public let url: String
    public var status: Int?
    public var duration: Int?
    public var error: String?
    
    public init(method: String, url: String, status: Int? = nil, duration: Int? = nil, error: String? = nil) {
        self.method = method
        self.url = url
        self.status = status
        self.duration = duration
        self.error = error
    }
    
    public func toDictionary() -> [String: Any] {
        var result: [String: Any] = ["method": method, "url": url]
        if let status = status { result["status"] = status }
        if let duration = duration { result["duration"] = duration }
        if let error = error { result["error"] = error }
        return result
    }
}

// MARK: - App State

/// Complete application state snapshot
public struct AppState {
    public let screen: String
    public let timestamp: Int64
    public let instance: InstanceInfo?
    public let user: UserContext?
    public let elements: [ElementInfo]
    public let customActions: [String]
    public let data: [String: Any]?
    public let errors: [String]
    public let logs: [String]
    public let renderErrors: [String]
    public let network: [NetworkRequest]?
    
    public func toDictionary() -> [String: Any] {
        var result: [String: Any] = [
            "screen": screen,
            "timestamp": timestamp,
            "elements": elements.map { $0.toDictionary() },
            "customActions": customActions,
            "errors": errors,
            "logs": logs,
            "renderErrors": renderErrors
        ]
        if let instance = instance { result["instance"] = instance.toDictionary() }
        if let user = user { result["user"] = user.toDictionary() }
        if let data = data, !data.isEmpty { result["data"] = data }
        if let network = network, !network.isEmpty {
            result["network"] = network.map { $0.toDictionary() }
        }
        return result
    }
}

// MARK: - State Manager

/// Singleton state manager
public class StateManager {
    public static let shared = StateManager()
    
    private static let maxErrors = 50
    private static let maxLogs = 100
    private static let maxNetwork = 50
    
    private var _screen = "unknown"
    private var _user: UserContext?
    private var _data: [String: Any] = [:]
    private var _errors: [String] = []
    private var _logs: [String] = []
    private var _renderErrors: [String] = []
    private var _network: [NetworkRequest] = []
    private var listeners: [(AppState) -> Void] = []
    private let lock = NSLock()
    
    private init() {
        // Forward registry/action changes
        ElementRegistry.shared.onChange { [weak self] in self?.notifyChange() }
        CustomActionsRegistry.shared.onChange { [weak self] in self?.notifyChange() }
    }
    
    /// Set current screen/route
    public func setScreen(_ screen: String) {
        lock.lock()
        _screen = screen
        lock.unlock()
        notifyChange()
    }
    
    /// Get current screen
    public func getScreen() -> String {
        lock.lock()
        defer { lock.unlock() }
        return _screen
    }
    
    /// Set user context
    public func setUser(_ user: UserContext?) {
        lock.lock()
        _user = user
        lock.unlock()
        notifyChange()
    }
    
    /// Set application data
    public func setData(_ data: [String: Any]) {
        lock.lock()
        _data = data
        lock.unlock()
        notifyChange()
    }
    
    /// Merge data into existing
    public func mergeData(_ data: [String: Any]) {
        lock.lock()
        for (key, value) in data { _data[key] = value }
        lock.unlock()
        notifyChange()
    }
    
    /// Add an error
    public func addError(_ error: String) {
        lock.lock()
        _errors.append(error)
        while _errors.count > Self.maxErrors { _errors.removeFirst() }
        lock.unlock()
        notifyChange()
    }
    
    /// Add a log entry
    public func addLog(_ log: String) {
        lock.lock()
        _logs.append(log)
        while _logs.count > Self.maxLogs { _logs.removeFirst() }
        lock.unlock()
    }
    
    /// Add a render error
    public func addRenderError(_ error: String) {
        lock.lock()
        _renderErrors.append(error)
        while _renderErrors.count > Self.maxErrors { _renderErrors.removeFirst() }
        lock.unlock()
        notifyChange()
    }
    
    /// Add a network request
    public func addNetworkRequest(_ request: NetworkRequest) {
        lock.lock()
        _network.append(request)
        while _network.count > Self.maxNetwork { _network.removeFirst() }
        lock.unlock()
    }
    
    /// Clear errors
    public func clearErrors() {
        lock.lock()
        _errors.removeAll()
        _renderErrors.removeAll()
        lock.unlock()
        notifyChange()
    }
    
    /// Clear logs
    public func clearLogs() {
        lock.lock()
        _logs.removeAll()
        lock.unlock()
    }
    
    /// Clear network history
    public func clearNetwork() {
        lock.lock()
        _network.removeAll()
        lock.unlock()
    }
    
    /// Get current state snapshot
    public func getState() -> AppState {
        lock.lock()
        defer { lock.unlock() }
        return AppState(
            screen: _screen,
            timestamp: Int64(Date().timeIntervalSince1970 * 1000),
            instance: InstanceManager.shared.getInstance(),
            user: _user,
            elements: ElementRegistry.shared.getAll(),
            customActions: CustomActionsRegistry.shared.list(),
            data: _data.isEmpty ? nil : _data,
            errors: _errors,
            logs: _logs,
            renderErrors: _renderErrors,
            network: _network.isEmpty ? nil : _network
        )
    }
    
    /// Subscribe to state changes
    @discardableResult
    public func onChange(_ listener: @escaping (AppState) -> Void) -> () -> Void {
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
    
    /// Trigger a state update notification
    public func notifyChange() {
        let state = getState()
        lock.lock()
        let currentListeners = listeners
        lock.unlock()
        for listener in currentListeners {
            listener(state)
        }
    }
}

// MARK: - Convenience

/// Global state manager accessor
public var state: StateManager { StateManager.shared }
