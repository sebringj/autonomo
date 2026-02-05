package com.autonomo

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Element types for registration
 */
enum class ElementType(val value: String) {
    BUTTON("button"),
    INPUT("input"),
    TOGGLE("toggle"),
    SELECT("select"),
    LINK("link"),
    CUSTOM("custom")
}

/**
 * Handler for an interactive element
 */
data class ElementHandler(
    val type: ElementType,
    val handler: (String?) -> Unit,
    var disabled: Boolean = false,
    val getValue: (() -> String)? = null,
    val onSubmit: (() -> Unit)? = null,
    val hint: String? = null,
    val meta: Map<String, Any>? = null
)

/**
 * Information about a registered element
 */
data class ElementInfo(
    val id: String,
    val type: ElementType,
    val disabled: Boolean = false,
    val value: String? = null,
    val hint: String? = null,
    val meta: Map<String, Any>? = null
) {
    fun toMap(): Map<String, Any?> = buildMap {
        put("id", id)
        put("type", type.value)
        if (disabled) put("disabled", disabled)
        value?.let { put("value", it) }
        hint?.let { put("hint", it) }
        meta?.let { put("meta", it) }
    }
}

/**
 * Singleton registry for all interactive elements
 */
object ElementRegistry {
    private val elements = ConcurrentHashMap<String, ElementHandler>()
    private val listeners = CopyOnWriteArrayList<() -> Unit>()

    /**
     * Register an interactive element
     */
    fun register(id: String, handler: ElementHandler): () -> Unit {
        elements[id] = handler
        notifyChange()
        return { unregister(id) }
    }

    /**
     * Unregister an element
     */
    fun unregister(id: String) {
        if (elements.remove(id) != null) {
            notifyChange()
        }
    }

    /**
     * Get handler for an element
     */
    fun get(id: String): ElementHandler? = elements[id]

    /**
     * Check if element exists
     */
    fun has(id: String): Boolean = elements.containsKey(id)

    /**
     * List all element IDs
     */
    fun list(): List<String> = elements.keys.toList()

    /**
     * Get detailed info for all elements
     */
    fun getAll(): List<ElementInfo> = elements.map { (id, handler) ->
        ElementInfo(
            id = id,
            type = handler.type,
            disabled = handler.disabled,
            value = handler.getValue?.invoke(),
            hint = handler.hint,
            meta = handler.meta
        )
    }

    /**
     * Find elements matching a regex pattern
     */
    fun find(pattern: String): List<ElementInfo> {
        val regex = Regex(pattern)
        return getAll().filter { regex.containsMatchIn(it.id) }
    }

    /**
     * Clear all elements
     */
    fun clear() {
        elements.clear()
        notifyChange()
    }

    /**
     * Get count of registered elements
     */
    val size: Int get() = elements.size

    /**
     * Subscribe to registry changes
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
 * Register a tap handler for a component
 */
fun registerTapHandler(
    id: String,
    disabled: Boolean = false,
    hint: String? = null,
    meta: Map<String, Any>? = null,
    handler: () -> Unit
): () -> Unit = ElementRegistry.register(id, ElementHandler(
    type = ElementType.BUTTON,
    handler = { handler() },
    disabled = disabled,
    hint = hint,
    meta = meta
))

/**
 * Register a fill handler for an input
 */
fun registerFillHandler(
    id: String,
    getValue: (() -> String)? = null,
    onSubmit: (() -> Unit)? = null,
    disabled: Boolean = false,
    hint: String? = null,
    meta: Map<String, Any>? = null,
    handler: (String) -> Unit
): () -> Unit = ElementRegistry.register(id, ElementHandler(
    type = ElementType.INPUT,
    handler = { value -> handler(value ?: "") },
    getValue = getValue,
    onSubmit = onSubmit,
    disabled = disabled,
    hint = hint,
    meta = meta
))

/**
 * Register a toggle handler
 */
fun registerToggleHandler(
    id: String,
    getValue: (() -> String)? = null,
    disabled: Boolean = false,
    hint: String? = null,
    meta: Map<String, Any>? = null,
    handler: (String?) -> Unit
): () -> Unit = ElementRegistry.register(id, ElementHandler(
    type = ElementType.TOGGLE,
    handler = handler,
    getValue = getValue,
    disabled = disabled,
    hint = hint,
    meta = meta
))
