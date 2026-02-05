package com.autonomo

import com.sun.net.httpserver.HttpServer
import java.io.InputStreamReader
import java.net.InetSocketAddress

/**
 * Configuration for the Autonomo transport
 */
data class TransportConfig(
    val port: Int = 8080,
    val host: String = "127.0.0.1",
    val cors: Boolean = true,
    val onStart: ((String) -> Unit)? = null,
    val onCommand: ((String, String?, String?) -> Unit)? = null
)

/**
 * HTTP request result
 */
data class RequestResult(
    val status: Int,
    val body: Map<String, Any?>
)

/**
 * Running transport instance
 */
class TransportInstance(
    val url: String,
    private val server: HttpServer
) {
    fun stop() {
        server.stop(0)
    }
}

/**
 * HTTP transport for AI communication
 */
object Transport {
    /**
     * Handle an incoming HTTP request
     */
    fun handleRequest(method: String, path: String, body: Map<String, Any?>? = null): RequestResult {
        // Health check
        if (method == "GET" && path == "/health") {
            return RequestResult(
                status = 200,
                body = mapOf("status" to "ok", "timestamp" to System.currentTimeMillis())
            )
        }

        // Get current state
        if (method == "GET" && path == "/state") {
            return RequestResult(
                status = 200,
                body = StateManager.getState().toMap()
            )
        }

        // Execute command
        if (method == "POST" && path == "/command") {
            if (body == null) {
                return RequestResult(
                    status = 400,
                    body = mapOf("error" to "Missing request body")
                )
            }

            val command = body["command"] as? String
            if (command == null) {
                return RequestResult(
                    status = 400,
                    body = mapOf("error" to "Missing command field")
                )
            }

            val target = body["target"] as? String
            val value = body["value"] as? String

            val result = Commands.execute(command, target, value)
            return RequestResult(
                status = if (result.success) 200 else 400,
                body = result.toMap()
            )
        }

        // Not found
        return RequestResult(
            status = 404,
            body = mapOf("error" to "Not found")
        )
    }

    /**
     * Create and start HTTP transport
     */
    fun createHttpTransport(config: TransportConfig = TransportConfig()): TransportInstance {
        val server = HttpServer.create(InetSocketAddress(config.host, config.port), 0)
        val url = "http://${config.host}:${config.port}"

        server.createContext("/") { exchange ->
            // CORS headers
            if (config.cors) {
                exchange.responseHeaders.add("Access-Control-Allow-Origin", "*")
                exchange.responseHeaders.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                exchange.responseHeaders.add("Access-Control-Allow-Headers", "Content-Type")
            }

            // Handle OPTIONS
            if (exchange.requestMethod == "OPTIONS") {
                exchange.sendResponseHeaders(200, -1)
                exchange.close()
                return@createContext
            }

            // Parse body
            val body: Map<String, Any?>? = if (exchange.requestMethod == "POST") {
                try {
                    val reader = InputStreamReader(exchange.requestBody)
                    val json = reader.readText()
                    parseJson(json)
                } catch (e: Exception) {
                    null
                }
            } else null

            // Handle request
            val result = handleRequest(exchange.requestMethod, exchange.requestURI.path, body)

            // Send response
            exchange.responseHeaders.add("Content-Type", "application/json")
            val responseBody = toJson(result.body).toByteArray()
            exchange.sendResponseHeaders(result.status, responseBody.size.toLong())
            exchange.responseBody.write(responseBody)
            exchange.close()
        }

        server.executor = null
        server.start()

        config.onStart?.invoke(url)

        return TransportInstance(url, server)
    }

    // Simple JSON serialization (you'd typically use a library like kotlinx.serialization or Gson)
    private fun toJson(map: Map<String, Any?>): String {
        return buildString {
            append("{")
            map.entries.forEachIndexed { index, (key, value) ->
                if (index > 0) append(",")
                append("\"$key\":")
                append(valueToJson(value))
            }
            append("}")
        }
    }

    private fun valueToJson(value: Any?): String = when (value) {
        null -> "null"
        is String -> "\"${value.replace("\"", "\\\"")}\""
        is Number -> value.toString()
        is Boolean -> value.toString()
        is List<*> -> "[${value.joinToString(",") { valueToJson(it) }}]"
        is Map<*, *> -> toJson(value.mapKeys { it.key.toString() }.mapValues { it.value })
        else -> "\"$value\""
    }

    // Simple JSON parsing (you'd typically use a library)
    @Suppress("UNCHECKED_CAST")
    private fun parseJson(json: String): Map<String, Any?> {
        // This is a very simplified parser - in production use kotlinx.serialization or Gson
        val result = mutableMapOf<String, Any?>()
        val trimmed = json.trim().removeSurrounding("{", "}")
        if (trimmed.isBlank()) return result
        
        var depth = 0
        var inString = false
        var currentKey = ""
        var currentValue = StringBuilder()
        var parsingKey = true
        
        for (char in trimmed) {
            when {
                char == '"' && (currentValue.isEmpty() || currentValue.last() != '\\') -> {
                    inString = !inString
                    if (!parsingKey) currentValue.append(char)
                }
                !inString && char == '{' -> { depth++; currentValue.append(char) }
                !inString && char == '}' -> { depth--; currentValue.append(char) }
                !inString && char == '[' -> { depth++; currentValue.append(char) }
                !inString && char == ']' -> { depth--; currentValue.append(char) }
                !inString && depth == 0 && char == ':' && parsingKey -> {
                    currentKey = currentValue.toString().trim().removeSurrounding("\"")
                    currentValue = StringBuilder()
                    parsingKey = false
                }
                !inString && depth == 0 && char == ',' -> {
                    result[currentKey] = parseValue(currentValue.toString().trim())
                    currentValue = StringBuilder()
                    parsingKey = true
                }
                parsingKey && !char.isWhitespace() -> currentValue.append(char)
                !parsingKey -> currentValue.append(char)
            }
        }
        
        if (currentKey.isNotEmpty()) {
            result[currentKey] = parseValue(currentValue.toString().trim())
        }
        
        return result
    }

    private fun parseValue(value: String): Any? = when {
        value == "null" -> null
        value == "true" -> true
        value == "false" -> false
        value.startsWith("\"") -> value.removeSurrounding("\"")
        value.contains(".") -> value.toDoubleOrNull() ?: value
        else -> value.toLongOrNull() ?: value
    }
}

/**
 * Create and start HTTP transport
 */
fun createHttpTransport(config: TransportConfig = TransportConfig()): TransportInstance =
    Transport.createHttpTransport(config)
