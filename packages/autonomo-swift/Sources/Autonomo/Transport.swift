import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

// MARK: - Dev Mode Detection

/// Check if running in development mode.
/// Returns true unless explicitly in production environment.
public func isDevMode() -> Bool {
    // Check common environment variables
    let env = ProcessInfo.processInfo.environment
    
    let envValue = env["ENV"] ?? env["ENVIRONMENT"] ?? env["APP_ENV"] ?? ""
    if envValue.lowercased() == "production" || envValue.lowercased() == "prod" {
        return false
    }
    
    let nodeEnv = env["NODE_ENV"] ?? ""
    if nodeEnv.lowercased() == "production" {
        return false
    }
    
    // Check for DEBUG flag
    if env["DEBUG"] != nil {
        return true
    }
    
    // Check if running in Xcode debugger
    #if DEBUG
    return true
    #else
    return true // Default to dev mode unless explicitly production
    #endif
}

// MARK: - Transport Config

/// Configuration for the Autonomo transport
public struct TransportConfig {
    public var port: UInt16
    public var host: String
    public var cors: Bool
    /// Only enable in development mode (default: true)
    public var devOnly: Bool
    public var onStart: ((String) -> Void)?
    public var onCommand: ((String, String?, String?) -> Void)?
    
    public init(
        port: UInt16 = 8080,
        host: String = "127.0.0.1",
        cors: Bool = true,
        devOnly: Bool = true,
        onStart: ((String) -> Void)? = nil,
        onCommand: ((String, String?, String?) -> Void)? = nil
    ) {
        self.port = port
        self.host = host
        self.cors = cors
        self.devOnly = devOnly
        self.onStart = onStart
        self.onCommand = onCommand
    }
}

// MARK: - Request Result

/// HTTP request result
public struct RequestResult {
    public let status: Int
    public let body: [String: Any]
}

// MARK: - Transport

/// HTTP transport utilities (optional). WebSocket is the primary mode.
public class Transport {
    
    /// Handle an incoming HTTP request
    public static func handleRequest(method: String, path: String, body: [String: Any]? = nil) -> RequestResult {
        // Health check
        if method == "GET" && path == "/health" {
            return RequestResult(
                status: 200,
                body: [
                    "status": "ok",
                    "timestamp": Int64(Date().timeIntervalSince1970 * 1000)
                ]
            )
        }
        
        // Get current state
        if method == "GET" && path == "/state" {
            return RequestResult(
                status: 200,
                body: StateManager.shared.getState().toDictionary()
            )
        }
        
        // Execute command
        if method == "POST" && path == "/command" {
            guard let body = body else {
                return RequestResult(
                    status: 400,
                    body: ["error": "Missing request body"]
                )
            }
            
            guard let command = body["command"] as? String else {
                return RequestResult(
                    status: 400,
                    body: ["error": "Missing command field"]
                )
            }
            
            let target = body["target"] as? String
            let value = body["value"] as? String
            
            let result = Commands.execute(command: command, target: target, value: value)
            return RequestResult(
                status: result.success ? 200 : 400,
                body: result.toDictionary()
            )
        }
        
        // Not found
        return RequestResult(
            status: 404,
            body: ["error": "Not found"]
        )
    }
}

// MARK: - Simple HTTP Server (for macOS/iOS development)

#if os(macOS) || os(iOS)
import Network

/// Running transport instance
public class TransportInstance {
    public let url: String
    private var listener: NWListener?
    
    init(url: String, listener: NWListener) {
        self.url = url
        self.listener = listener
    }
    
    public func stop() {
        listener?.cancel()
        listener = nil
    }
}

/// Create and start HTTP transport using Network framework
/// Returns nil if devOnly is true and running in production mode.
public func createHttpTransport(_ config: TransportConfig = TransportConfig()) -> TransportInstance? {
    // Skip in production if devOnly is true
    if config.devOnly && !isDevMode() {
        return nil
    }
    
    let port = NWEndpoint.Port(rawValue: config.port)!
    
    guard let listener = try? NWListener(using: .tcp, on: port) else {
        print("Failed to create listener")
        return nil
    }
    
    let url = "http://\(config.host):\(config.port)"
    
    listener.newConnectionHandler = { connection in
        connection.start(queue: .global())
        handleConnection(connection, cors: config.cors)
    }
    
    listener.start(queue: .global())
    config.onStart?(url)
    
    return TransportInstance(url: url, listener: listener)
}

private func handleConnection(_ connection: NWConnection, cors: Bool) {
    connection.receive(minimumIncompleteLength: 1, maximumLength: 65536) { data, _, _, error in
        guard let data = data, error == nil else {
            connection.cancel()
            return
        }
        
        guard let request = String(data: data, encoding: .utf8) else {
            connection.cancel()
            return
        }
        
        // Parse HTTP request
        let lines = request.components(separatedBy: "\r\n")
        guard let firstLine = lines.first else {
            connection.cancel()
            return
        }
        
        let parts = firstLine.components(separatedBy: " ")
        guard parts.count >= 2 else {
            connection.cancel()
            return
        }
        
        let method = parts[0]
        let path = parts[1]
        
        // Parse body for POST
        var body: [String: Any]?
        if method == "POST", let bodyStart = request.range(of: "\r\n\r\n") {
            let bodyString = String(request[bodyStart.upperBound...])
            if let bodyData = bodyString.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: bodyData) as? [String: Any] {
                body = json
            }
        }
        
        // Handle OPTIONS for CORS
        if method == "OPTIONS" {
            let response = buildResponse(status: 200, body: [:], cors: cors)
            sendResponse(connection, response: response)
            return
        }
        
        // Handle request
        let result = Transport.handleRequest(method: method, path: path, body: body)
        let response = buildResponse(status: result.status, body: result.body, cors: cors)
        sendResponse(connection, response: response)
    }
}

private func buildResponse(status: Int, body: [String: Any], cors: Bool) -> String {
    let statusText = status == 200 ? "OK" : (status == 400 ? "Bad Request" : "Not Found")
    let bodyData = (try? JSONSerialization.data(withJSONObject: body)) ?? Data()
    let bodyString = String(data: bodyData, encoding: .utf8) ?? "{}"
    
    var headers = "HTTP/1.1 \(status) \(statusText)\r\n"
    headers += "Content-Type: application/json\r\n"
    headers += "Content-Length: \(bodyString.utf8.count)\r\n"
    if cors {
        headers += "Access-Control-Allow-Origin: *\r\n"
        headers += "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
        headers += "Access-Control-Allow-Headers: Content-Type\r\n"
    }
    headers += "\r\n"
    
    return headers + bodyString
}

private func sendResponse(_ connection: NWConnection, response: String) {
    let data = response.data(using: .utf8)!
    connection.send(content: data, completion: .contentProcessed { _ in
        connection.cancel()
    })
}

#endif
