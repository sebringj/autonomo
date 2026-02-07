/**
 * Test harness for autonomo-swift
 * Run: swift test
 */

import XCTest
@testable import Autonomo

final class AutonomoTests: XCTestCase {
    
    override func setUp() {
        super.setUp()
        ElementRegistry.shared.clear()
        CustomActionsRegistry.shared.clear()
    }
    
    func testRegistryStartsEmpty() {
        XCTAssertEqual(ElementRegistry.shared.list().count, 0, "Registry should be empty")
    }
    
    func testRegisterTapHandler() {
        var tapped = false
        
        let unregister = registerTapHandler("Test.Button") {
            tapped = true
        }
        
        XCTAssertTrue(ElementRegistry.shared.has("Test.Button"), "Element should exist")
        XCTAssertTrue(ElementRegistry.shared.list().contains("Test.Button"), "Element should be in list")
        
        // Invoke handler
        if let handler = ElementRegistry.shared.get("Test.Button") {
            handler.handler(nil)
        }
        XCTAssertTrue(tapped, "Handler should have been called")
        
        unregister()
        XCTAssertFalse(ElementRegistry.shared.has("Test.Button"), "Element should be removed")
    }
    
    func testRegisterFillHandler() {
        var value = ""
        
        let unregister = registerFillHandler(
            "Test.Input",
            getValue: { value }
        ) { v in
            value = v ?? ""
        }
        
        if let handler = ElementRegistry.shared.get("Test.Input") {
            handler.handler("test value")
            XCTAssertEqual(value, "test value")
            XCTAssertEqual(handler.getValue?(), "test value")
        }
        
        unregister()
    }
    
    func testCustomActions() {
        let unregister = registerCustomAction("testAction") { value in
            if value == "fail" {
                return ActionResult.fail("Intentional failure")
            }
            return ActionResult.ok("Got: \(value ?? "")")
        }
        
        var result = CustomActionsRegistry.shared.execute("testAction", value: "hello")
        XCTAssertTrue(result.success, "Should succeed")
        XCTAssertTrue(result.message?.contains("Got: hello") == true)
        
        result = CustomActionsRegistry.shared.execute("testAction", value: "fail")
        XCTAssertFalse(result.success, "Should fail")
        
        unregister()
    }
    
    func testStateManagerTracksScreen() {
        StateManager.shared.setScreen("login")
        XCTAssertEqual(StateManager.shared.getScreen(), "login")
        
        let state = StateManager.shared.getState()
        XCTAssertEqual(state.screen, "login")
    }
    
    func testStateManagerTracksUser() {
        let user = UserContext(id: "123", email: "test@example.com", role: "admin")
        StateManager.shared.setUser(user)
        
        let state = StateManager.shared.getState()
        XCTAssertEqual(state.user?.id, "123")
        XCTAssertEqual(state.user?.email, "test@example.com")
    }
    
    func testStateManagerTracksErrors() {
        StateManager.shared.clearErrors()
        StateManager.shared.addError("Test error")
        
        let state = StateManager.shared.getState()
        XCTAssertTrue(state.errors.contains("Test error"))
    }
    
    func testCommandsExecutePress() {
        var pressed = false
        registerTapHandler("Cmd.Button") { pressed = true }
        
        let result = executeCommand("press", target: "Cmd.Button")
        XCTAssertTrue(result.success, "Command should succeed")
        XCTAssertTrue(pressed, "Button should be pressed")
        
        ElementRegistry.shared.unregister("Cmd.Button")
    }
    
    func testCommandsExecuteFill() {
        var value = ""
        registerFillHandler("Cmd.Input") { v in value = v ?? "" }
        
        let result = executeCommand("fill", target: "Cmd.Input", value: "hello")
        XCTAssertTrue(result.success, "Command should succeed")
        XCTAssertEqual(value, "hello")
        
        ElementRegistry.shared.unregister("Cmd.Input")
    }
    
    func testCommandsReturnErrorForMissingElement() {
        let result = executeCommand("press", target: "Nonexistent.Button")
        XCTAssertFalse(result.success, "Should fail")
        XCTAssertTrue(result.error?.lowercased().contains("not found") == true)
    }
    
    func testCustomActionsWithMetadata() {
        let meta = CustomActionMeta(
            description: "Greets the user",
            args: ["name": "Name to greet"],
            example: ["name": "World"]
        )
        
        let unregister = registerCustomAction("greetAction", meta: meta) { value in
            return ActionResult.ok("Hello, \(value ?? "stranger")!")
        }
        
        // Verify action works
        let result = CustomActionsRegistry.shared.execute("greetAction", value: "World")
        XCTAssertTrue(result.success)
        XCTAssertTrue(result.message?.contains("Hello, World!") == true)
        
        // Verify getAll returns rich info
        let allActions = CustomActionsRegistry.shared.getAll()
        XCTAssertGreaterThanOrEqual(allActions.count, 1)
        
        let greetInfo = allActions.first { $0.name == "greetAction" }
        XCTAssertNotNil(greetInfo)
        XCTAssertEqual(greetInfo?.description, "Greets the user")
        XCTAssertEqual(greetInfo?.args?["name"], "Name to greet")
        XCTAssertEqual(greetInfo?.example?["name"], "World")
        
        unregister()
    }
}
