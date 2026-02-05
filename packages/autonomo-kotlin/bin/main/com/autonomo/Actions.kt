package com.autonomo

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Result of a custom action
 */
data class ActionResult(
    val success: Boolean,
    val message: String? = null,
    val error: String? = null,
    val data: Any? = null
) {
    fun toMap(): Map<String, Any?> = buildMap {
        put("success", success)
        message?.let { put("message", it) }
        error?.let { put("error", it) }
        data?.let { put("data", it) }
    }

    companion object {
        fun ok(message: String? = null, data: Any? = null) =
            ActionResult(success = true, message = message, data = data)

        fun fail(error: String) =
            ActionResult(success = false, error = error)
    }
}

/**
 * Custom action handler type
 */
typealias CustomActionHandler = (String?) -> ActionResult

/**
 * Singleton registry for custom actions
 */
object CustomActionsRegistry {
    private val actions = ConcurrentHashMap<String, CustomActionHandler>()
    private val listeners = CopyOnWriteArrayList<() -> Unit>()

    /**
     * Register a custom action
     */
    fun register(name: String, handler: CustomActionHandler): () -> Unit {
        actions[name] = handler
        notifyChange()
        return { unregister(name) }
    }

    /**
     * Unregister a custom action
     */
    fun unregister(name: String) {
        if (actions.remove(name) != null) {
            notifyChange()
        }
    }

    /**
     * Execute a custom action
     */
    fun execute(name: String, value: String? = null): ActionResult {
        val handler = actions[name] ?: return ActionResult.fail("Unknown custom action: $name")
        return try {
            handler(value)
        } catch (e: Exception) {
            ActionResult.fail(e.message ?: "Unknown error")
        }
    }

    /**
     * Check if action exists
     */
    fun has(name: String): Boolean = actions.containsKey(name)

    /**
     * List all action names
     */
    fun list(): List<String> = actions.keys.toList()

    /**
     * Subscribe to changes
     */
    fun onChange(listener: () -> Unit): () -> Unit {
        listeners.add(listener)
        return { listeners.remove(listener) }
    }

    private fun notifyChange() {
        listeners.forEach { it() }
    }
}

/**
 * Register a custom action
 */
fun registerCustomAction(name: String, handler: CustomActionHandler): () -> Unit =
    CustomActionsRegistry.register(name, handler)
