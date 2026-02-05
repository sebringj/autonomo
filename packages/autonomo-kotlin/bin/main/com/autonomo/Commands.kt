package com.autonomo

/**
 * Result of a command execution
 */
data class CommandResult(
    val success: Boolean,
    val state: AppState,
    val message: String? = null,
    val error: String? = null
) {
    fun toMap(): Map<String, Any?> = buildMap {
        put("success", success)
        put("state", state.toMap())
        message?.let { put("message", it) }
        error?.let { put("error", it) }
    }

    companion object {
        fun ok(message: String? = null) =
            CommandResult(success = true, state = StateManager.getState(), message = message)

        fun fail(error: String) =
            CommandResult(success = false, state = StateManager.getState(), error = error)
    }
}

/**
 * Navigation handler type
 */
typealias NavigationHandler = (String) -> Unit

/**
 * Command execution
 */
object Commands {
    var navigationHandler: NavigationHandler? = null

    /**
     * Navigate to a screen
     */
    fun navigate(screen: String): CommandResult {
        val handler = navigationHandler ?: return CommandResult.fail("No navigation handler registered")
        handler(screen)
        Thread.sleep(100)
        return CommandResult.ok("Navigated to $screen")
    }

    /**
     * Press/tap an element
     */
    fun press(elementId: String): CommandResult {
        val handler = ElementRegistry.get(elementId)
            ?: return CommandResult.fail("Element not found: $elementId. Available: ${ElementRegistry.list().joinToString(", ")}")
        
        if (handler.disabled) {
            return CommandResult.fail("Element is disabled: $elementId")
        }

        handler.handler(null)
        Thread.sleep(100)
        return CommandResult.ok("Pressed $elementId")
    }

    /**
     * Fill text into an input element
     */
    fun fill(elementId: String, value: String): CommandResult {
        val handler = ElementRegistry.get(elementId)
            ?: return CommandResult.fail("Element not found: $elementId. Available: ${ElementRegistry.list().joinToString(", ")}")

        if (handler.type != ElementType.INPUT) {
            return CommandResult.fail("Element $elementId is not an input (type: ${handler.type.value})")
        }

        if (handler.disabled) {
            return CommandResult.fail("Element is disabled: $elementId")
        }

        handler.handler(value)
        Thread.sleep(50)
        return CommandResult.ok("Filled $elementId with \"$value\"")
    }

    /**
     * Submit an input (press enter)
     */
    fun submit(elementId: String): CommandResult {
        val handler = ElementRegistry.get(elementId)
            ?: return CommandResult.fail("Element not found: $elementId")

        val onSubmit = handler.onSubmit
            ?: return CommandResult.fail("Element $elementId does not support submit")

        onSubmit()
        Thread.sleep(100)
        return CommandResult.ok("Submitted $elementId")
    }

    /**
     * Execute a custom action
     */
    fun custom(actionName: String, value: String? = null): CommandResult {
        val result = CustomActionsRegistry.execute(actionName, value)
        return CommandResult(
            success = result.success,
            state = StateManager.getState(),
            message = result.message,
            error = result.error
        )
    }

    /**
     * Wait for a duration
     */
    fun wait(ms: Int): CommandResult {
        Thread.sleep(ms.toLong())
        return CommandResult.ok("Waited ${ms}ms")
    }

    /**
     * Get current state without any action
     */
    fun getState(): CommandResult = CommandResult.ok()

    /**
     * Execute a command by type
     */
    fun execute(command: String, target: String? = null, value: String? = null): CommandResult =
        when (command.lowercase()) {
            "navigate" -> {
                if (target == null) CommandResult.fail("Navigate requires a target screen")
                else navigate(target)
            }

            "press", "tap", "click" -> {
                if (target == null) CommandResult.fail("Press requires a target element ID")
                else press(target)
            }

            "fill", "type" -> {
                if (target == null) CommandResult.fail("Fill requires a target element ID")
                else fill(target, value ?: "")
            }

            "submit" -> {
                if (target == null) CommandResult.fail("Submit requires a target element ID")
                else submit(target)
            }

            "custom" -> {
                if (target == null) CommandResult.fail("Custom requires an action name")
                else custom(target, value)
            }

            "wait" -> wait(target?.toIntOrNull() ?: 1000)

            "state", "snapshot" -> getState()

            else -> CommandResult.fail("Unknown command: $command")
        }
}

/**
 * Set the navigation handler
 */
fun setNavigationHandler(handler: NavigationHandler) {
    Commands.navigationHandler = handler
}

/**
 * Execute a command
 */
fun executeCommand(command: String, target: String? = null, value: String? = null): CommandResult =
    Commands.execute(command, target, value)
