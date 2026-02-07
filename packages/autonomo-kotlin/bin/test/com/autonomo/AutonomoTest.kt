/**
 * Test harness for autonomo-kotlin
 * Run: ./gradlew test
 * Or:  kotlin -cp build/classes/kotlin/main src/test/kotlin/com/autonomo/AutonomoTest.kt
 */

package com.autonomo

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.assertFalse
import kotlin.test.assertNotNull

class AutonomoTest {
    
    private fun setup() {
        ElementRegistry.clear()
        // CustomActionsRegistry doesn't have clear, so we'll work around
    }
    
    @Test
    fun `registry starts empty`() {
        setup()
        assertEquals(0, ElementRegistry.list().size, "Registry should be empty")
    }
    
    @Test
    fun `registerTapHandler adds element`() {
        setup()
        var tapped = false
        
        val unregister = registerTapHandler("Test.Button") {
            tapped = true
        }
        
        assertTrue(ElementRegistry.has("Test.Button"), "Element should exist")
        assertTrue(ElementRegistry.list().contains("Test.Button"), "Element should be in list")
        
        // Invoke handler
        ElementRegistry.get("Test.Button")?.handler?.invoke(null)
        assertTrue(tapped, "Handler should have been called")
        
        unregister()
        assertFalse(ElementRegistry.has("Test.Button"), "Element should be removed")
    }
    
    @Test
    fun `registerFillHandler works with value`() {
        setup()
        var value = ""
        
        val unregister = registerFillHandler(
            "Test.Input",
            getValue = { value }
        ) { v ->
            value = v
        }
        
        val handler = ElementRegistry.get("Test.Input")
        handler?.handler?.invoke("test value")
        assertEquals("test value", value)
        assertEquals("test value", handler?.getValue?.invoke())
        
        unregister()
    }
    
    @Test
    fun `custom actions work`() {
        val unregister = registerCustomAction("testAction") { value ->
            if (value == "fail") {
                ActionResult.fail("Intentional failure")
            } else {
                ActionResult.ok("Got: $value")
            }
        }
        
        var result = CustomActionsRegistry.execute("testAction", "hello")
        assertTrue(result.success, "Should succeed")
        assertTrue(result.message?.contains("Got: hello") == true)
        
        result = CustomActionsRegistry.execute("testAction", "fail")
        assertFalse(result.success, "Should fail")
        
        unregister()
    }
    
    @Test
    fun `state manager tracks screen`() {
        StateManager.setScreen("login")
        assertEquals("login", StateManager.getScreen())
        
        val state = StateManager.getState()
        assertEquals("login", state.screen)
    }
    
    @Test
    fun `state manager tracks user`() {
        val user = UserContext(id = "123", email = "test@example.com", role = "admin")
        StateManager.setUser(user)
        
        val state = StateManager.getState()
        assertEquals("123", state.user?.id)
        assertEquals("test@example.com", state.user?.email)
    }
    
    @Test
    fun `state manager tracks errors`() {
        StateManager.clearErrors()
        StateManager.addError("Test error")
        
        val state = StateManager.getState()
        assertTrue(state.errors.contains("Test error"))
    }
    
    @Test
    fun `commands execute press`() {
        setup()
        var pressed = false
        registerTapHandler("Cmd.Button") { pressed = true }
        
        val result = executeCommand("press", "Cmd.Button")
        assertTrue(result.success, "Command should succeed")
        assertTrue(pressed, "Button should be pressed")
        
        ElementRegistry.unregister("Cmd.Button")
    }
    
    @Test
    fun `commands execute fill`() {
        setup()
        var value = ""
        registerFillHandler("Cmd.Input") { v -> value = v }
        
        val result = executeCommand("fill", "Cmd.Input", "hello")
        assertTrue(result.success, "Command should succeed")
        assertEquals("hello", value)
        
        ElementRegistry.unregister("Cmd.Input")
    }
    
    @Test
    fun `commands return error for missing element`() {
        setup()
        val result = executeCommand("press", "Nonexistent.Button")
        assertFalse(result.success, "Should fail")
        assertTrue(result.error?.lowercase()?.contains("not found") == true)
    }
    
    @Test
    fun `custom actions with metadata`() {
        val meta = CustomActionMeta(
            description = "Greets the user",
            args = mapOf("name" to "Name to greet"),
            example = mapOf("name" to "World")
        )
        
        val unregister = registerCustomAction("greetAction", meta) { value ->
            ActionResult.ok("Hello, $value!")
        }
        
        // Verify action works
        val result = CustomActionsRegistry.execute("greetAction", "World")
        assertTrue(result.success, "Should succeed")
        assertTrue(result.message?.contains("Hello, World!") == true)
        
        // Verify getAll returns rich info
        val allActions = CustomActionsRegistry.getAll()
        assertTrue(allActions.isNotEmpty(), "Should have at least one action")
        
        val greetInfo = allActions.find { it.name == "greetAction" }
        assertNotNull(greetInfo)
        assertEquals("Greets the user", greetInfo?.description)
        assertEquals("Name to greet", greetInfo?.args?.get("name"))
        assertEquals("World", greetInfo?.example?.get("name"))
        
        unregister()
    }
}

// Standalone runner for quick testing without gradle
fun main() {
    var passed = 0
    var failed = 0
    
    fun test(name: String, fn: () -> Unit) {
        try {
            fn()
            println("✅ $name")
            passed++
        } catch (e: Throwable) {
            println("❌ $name")
            println("   ${e.message}")
            failed++
        }
    }
    
    println("\n🧪 autonomo-kotlin Test Harness\n")
    
    val tests = AutonomoTest()
    
    test("registry starts empty") { tests.`registry starts empty`() }
    test("registerTapHandler adds element") { tests.`registerTapHandler adds element`() }
    test("registerFillHandler works with value") { tests.`registerFillHandler works with value`() }
    test("custom actions work") { tests.`custom actions work`() }
    test("state manager tracks screen") { tests.`state manager tracks screen`() }
    test("state manager tracks user") { tests.`state manager tracks user`() }
    test("state manager tracks errors") { tests.`state manager tracks errors`() }
    test("commands execute press") { tests.`commands execute press`() }
    test("commands execute fill") { tests.`commands execute fill`() }
    test("commands return error for missing element") { tests.`commands return error for missing element`() }
    test("custom actions with metadata") { tests.`custom actions with metadata`() }
    
    println("\n📊 Results: $passed passed, $failed failed\n")
    if (failed > 0) System.exit(1)
}
