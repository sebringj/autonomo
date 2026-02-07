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
 * Metadata for a custom action - helps AI understand what it does
 */
data class CustomActionMeta(
    val description: String? = null,
    val args: Map<String, String>? = null,
    val example: Map<String, String>? = null
)

/**
 * Rich custom action info returned in state
 */
data class CustomActionInfo(
    val name: String,
    val description: String? = null,
    val args: Map<String, String>? = null,
    val example: Map<String, String>? = null
) {
    fun toMap(): Map<String, Any?> = buildMap {
        put("name", name)
        description?.let { put("description", it) }
        args?.let { put("args", it) }
        example?.let { put("example", it) }
    }
}

/**
 * Custom action handler type
 */
typealias CustomActionHandler = (String?) -> ActionResult

/**
 * Internal registered action
 */
private data class RegisteredAction(
    val handler: CustomActionHandler,
    val meta: CustomActionMeta? = null
)

/**
 * Singleton registry for custom actions
 */
object CustomActionsRegistry {
    private val actions = ConcurrentHashMap<String, RegisteredAction>()
    private val listeners = CopyOnWriteArrayList<() -> Unit>()

    /**
     * Register a custom action
     */
    fun register(name: String, handler: CustomActionHandler, meta: CustomActionMeta? = null): () -> Unit {
        actions[name] = RegisteredAction(handler, meta)
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
        val action = actions[name] 
            ?: return ActionResult.fail("Unknown custom action: $name. Available: ${list().ifEmpty { listOf("none") }.joinToString(", ")}")
        return try {
            action.handler(value)
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
     * Get rich info about all actions (for AI discoverability)
     */
    fun getAll(): List<CustomActionInfo> = actions.map { (name, action) ->
        CustomActionInfo(
            name = name,
            description = action.meta?.description,
            args = action.meta?.args,
            example = action.meta?.example
        )
    }

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
fun registerCustomAction(name: String, handler: CustomActionHandler, meta: CustomActionMeta? = null): () -> Unit =
    CustomActionsRegistry.register(name, handler, meta)
