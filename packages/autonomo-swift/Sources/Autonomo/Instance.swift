import Foundation

// MARK: - Instance Configuration

/// Configuration for initializing an app instance
public struct InstanceConfig {
    public let name: String
    public let platform: Platform
    public var instanceId: String?
    public var version: String?
    public var meta: [String: Any]?
    
    public enum Platform: String {
        case web
        case mobile
        case desktop
    }
    
    public init(name: String, platform: Platform, instanceId: String? = nil, version: String? = nil, meta: [String: Any]? = nil) {
        self.name = name
        self.platform = platform
        self.instanceId = instanceId
        self.version = version
        self.meta = meta
    }
}

// MARK: - Instance Info

/// Information about this app instance
public struct InstanceInfo {
    public let instanceId: String
    public let name: String
    public let bridgeId: String
    public let platform: InstanceConfig.Platform
    public let version: String?
    public let createdAt: Int64
    public let meta: [String: Any]?
    
    public func toDictionary() -> [String: Any] {
        var result: [String: Any] = [
            "instanceId": instanceId,
            "name": name,
            "bridgeId": bridgeId,
            "platform": platform.rawValue,
            "createdAt": createdAt
        ]
        if let version = version { result["version"] = version }
        if let meta = meta { result["meta"] = meta }
        return result
    }
}

// MARK: - Instance Manager

/// Manages the unique identity of this app instance
public class InstanceManager {
    public static let shared = InstanceManager()
    
    private var _instance: InstanceInfo?
    private let lock = NSLock()
    
    private init() {}
    
    /// Generate a short unique ID
    private func generateInstanceId() -> String {
        let uuid = UUID().uuidString
        return String(uuid.prefix(8)).lowercased()
    }
    
    /// Initialize this app instance
    ///
    /// Call once at app launch. Each window/process gets a unique instance ID.
    ///
    /// ```swift
    /// // In AppDelegate or SwiftUI App init
    /// InstanceManager.shared.initInstance(InstanceConfig(
    ///     name: "my-app",
    ///     platform: .mobile
    /// ))
    /// ```
    @discardableResult
    public func initInstance(_ config: InstanceConfig) -> InstanceInfo {
        lock.lock()
        defer { lock.unlock() }
        
        let instanceId = config.instanceId ?? generateInstanceId()
        let info = InstanceInfo(
            instanceId: instanceId,
            name: config.name,
            bridgeId: "\(config.name)-\(instanceId)",
            platform: config.platform,
            version: config.version,
            createdAt: Int64(Date().timeIntervalSince1970 * 1000),
            meta: config.meta
        )
        
        _instance = info
        print("[Autonomo] Instance initialized: \(info.bridgeId)")
        return info
    }
    
    /// Get the current instance info
    public func getInstance() -> InstanceInfo? {
        lock.lock()
        defer { lock.unlock() }
        return _instance
    }
    
    /// Get the current instance info or throw
    public func requireInstance() throws -> InstanceInfo {
        lock.lock()
        defer { lock.unlock() }
        guard let instance = _instance else {
            throw AutonomoError.instanceNotInitialized
        }
        return instance
    }
    
    /// Get just the bridge ID
    public func getBridgeId() -> String? {
        lock.lock()
        defer { lock.unlock() }
        return _instance?.bridgeId
    }
    
    /// Reset the instance (mainly for testing)
    public func resetInstance() {
        lock.lock()
        defer { lock.unlock() }
        _instance = nil
    }
}

// MARK: - Errors

public enum AutonomoError: Error {
    case instanceNotInitialized
}
