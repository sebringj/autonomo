package com.autonomo

import java.util.concurrent.CopyOnWriteArrayList

/**
 * User context information
 */
data class UserContext(
    val id: String? = null,
    val email: String? = null,
    val role: String? = null,
    val extra: Map<String, Any> = emptyMap()
) {
    fun toMap(): Map<String, Any?> = buildMap {
        id?.let { put("id", it) }
        email?.let { put("email", it) }
        role?.let { put("role", it) }
        putAll(extra)
    }
}

/**
 * Network request information
 */
data class NetworkRequest(
    val method: String,
    val url: String,
    val status: Int? = null,
    val duration: Int? = null,
    val error: String? = null
) {
    fun toMap(): Map<String, Any?> = buildMap {
        put("method", method)
        put("url", url)
        status?.let { put("status", it) }
        duration?.let { put("duration", it) }
        error?.let { put("error", it) }
    }
}

/**
 * Complete application state snapshot
 */
data class AppState(
    val screen: String,
    val timestamp: Long,
    val user: UserContext?,
    val elements: List<ElementInfo>,
    val customActions: List<String>,
    val data: Map<String, Any>?,
    val errors: List<String>,
    val logs: List<String>,
    val renderErrors: List<String>,
    val network: List<NetworkRequest>?
) {
    fun toMap(): Map<String, Any?> = buildMap {
        put("screen", screen)
        put("timestamp", timestamp)
        put("elements", elements.map { it.toMap() })
        put("customActions", customActions)
        put("errors", errors)
        put("logs", logs)
        put("renderErrors", renderErrors)
        user?.let { put("user", it.toMap()) }
        data?.takeIf { it.isNotEmpty() }?.let { put("data", it) }
        network?.takeIf { it.isNotEmpty() }?.let { put("network", it.map { n -> n.toMap() }) }
    }
}

/**
 * Singleton state manager
 */
object StateManager {
    private const val MAX_ERRORS = 50
    private const val MAX_LOGS = 100
    private const val MAX_NETWORK = 50

    private var screen = "unknown"
    private var user: UserContext? = null
    private var data = mutableMapOf<String, Any>()
    private val errors = mutableListOf<String>()
    private val logs = mutableListOf<String>()
    private val renderErrors = mutableListOf<String>()
    private val network = mutableListOf<NetworkRequest>()
    private val listeners = CopyOnWriteArrayList<(AppState) -> Unit>()
    private val lock = Any()

    init {
        // Forward registry/action changes
        ElementRegistry.onChange { notifyChange() }
        CustomActionsRegistry.onChange { notifyChange() }
    }

    /**
     * Set current screen/route
     */
    fun setScreen(screen: String) {
        synchronized(lock) { this.screen = screen }
        notifyChange()
    }

    /**
     * Get current screen
     */
    fun getScreen(): String = synchronized(lock) { screen }

    /**
     * Set user context
     */
    fun setUser(user: UserContext?) {
        synchronized(lock) { this.user = user }
        notifyChange()
    }

    /**
     * Set application data
     */
    fun setData(data: Map<String, Any>) {
        synchronized(lock) { this.data = data.toMutableMap() }
        notifyChange()
    }

    /**
     * Merge data into existing
     */
    fun mergeData(data: Map<String, Any>) {
        synchronized(lock) { this.data.putAll(data) }
        notifyChange()
    }

    /**
     * Add an error
     */
    fun addError(error: String) {
        synchronized(lock) {
            errors.add(error)
            while (errors.size > MAX_ERRORS) errors.removeAt(0)
        }
        notifyChange()
    }

    /**
     * Add a log entry
     */
    fun addLog(log: String) {
        synchronized(lock) {
            logs.add(log)
            while (logs.size > MAX_LOGS) logs.removeAt(0)
        }
    }

    /**
     * Add a render error
     */
    fun addRenderError(error: String) {
        synchronized(lock) {
            renderErrors.add(error)
            while (renderErrors.size > MAX_ERRORS) renderErrors.removeAt(0)
        }
        notifyChange()
    }

    /**
     * Add a network request
     */
    fun addNetworkRequest(request: NetworkRequest) {
        synchronized(lock) {
            network.add(request)
            while (network.size > MAX_NETWORK) network.removeAt(0)
        }
    }

    /**
     * Clear errors
     */
    fun clearErrors() {
        synchronized(lock) {
            errors.clear()
            renderErrors.clear()
        }
        notifyChange()
    }

    /**
     * Clear logs
     */
    fun clearLogs() {
        synchronized(lock) { logs.clear() }
    }

    /**
     * Clear network history
     */
    fun clearNetwork() {
        synchronized(lock) { network.clear() }
    }

    /**
     * Get current state snapshot
     */
    fun getState(): AppState = synchronized(lock) {
        AppState(
            screen = screen,
            timestamp = System.currentTimeMillis(),
            user = user,
            elements = ElementRegistry.getAll(),
            customActions = CustomActionsRegistry.list(),
            data = data.takeIf { it.isNotEmpty() }?.toMap(),
            errors = errors.toList(),
            logs = logs.toList(),
            renderErrors = renderErrors.toList(),
            network = network.takeIf { it.isNotEmpty() }?.toList()
        )
    }

    /**
     * Subscribe to state changes
     */
    fun onChange(listener: (AppState) -> Unit): () -> Unit {
        listeners.add(listener)
        return { listeners.remove(listener) }
    }

    /**
     * Trigger a state update notification
     */
    fun notifyChange() {
        val state = getState()
        listeners.forEach { it(state) }
    }
}

/**
 * Global state manager accessor
 */
val state: StateManager get() = StateManager
