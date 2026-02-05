/**
 * Test harness for Autonomo.CSharp
 * Run: dotnet test
 * Or:  dotnet run --project Autonomo.Tests
 */

using System;
using Autonomo;

class Program
{
    static int passed = 0;
    static int failed = 0;

    static void Test(string name, Action fn)
    {
        try
        {
            fn();
            Console.WriteLine($"✅ {name}");
            passed++;
        }
        catch (Exception e)
        {
            Console.WriteLine($"❌ {name}");
            Console.WriteLine($"   {e.Message}");
            failed++;
        }
    }

    static void Assert(bool condition, string message)
    {
        if (!condition) throw new Exception(message);
    }

    static void AssertEqual<T>(T expected, T actual, string? message = null)
    {
        if (!Equals(expected, actual))
        {
            throw new Exception(message ?? $"Expected {expected}, got {actual}");
        }
    }

    static void Main(string[] args)
    {
        Console.WriteLine("\n🧪 Autonomo.CSharp Test Harness\n");

        // Reset singletons
        ElementRegistry.Clear();
        CustomActionsRegistry.Clear();

        Test("registry starts empty", () =>
        {
            Assert(ElementRegistry.List().Count == 0, "Registry should be empty");
        });

        Test("RegisterTapHandler adds element", () =>
        {
            var tapped = false;
            var unregister = Autonomo.Autonomo.RegisterTapHandler("Test.Button", () => { tapped = true; });

            Assert(ElementRegistry.Has("Test.Button"), "Element should exist");
            Assert(ElementRegistry.List().Contains("Test.Button"), "Element should be in list");

            // Invoke handler
            var handler = ElementRegistry.Get("Test.Button");
            handler?.Handler(null);
            Assert(tapped, "Handler should have been called");

            unregister();
            Assert(!ElementRegistry.Has("Test.Button"), "Element should be removed");
        });

        Test("RegisterFillHandler works with value", () =>
        {
            var value = "";
            var unregister = Autonomo.Autonomo.RegisterFillHandler(
                "Test.Input",
                (v) => { value = v ?? ""; },
                getValue: () => value
            );

            var handler = ElementRegistry.Get("Test.Input");
            handler?.Handler("test value");
            AssertEqual("test value", value);
            AssertEqual("test value", handler?.GetValue?.Invoke());

            unregister();
        });

        Test("custom actions work", () =>
        {
            var unregister = Autonomo.Autonomo.RegisterCustomAction("testAction", (value) =>
            {
                if (value == "fail")
                    return ActionResult.Fail("Intentional failure");
                return ActionResult.Ok($"Got: {value}");
            });

            var result = CustomActionsRegistry.Execute("testAction", "hello");
            Assert(result.Success, "Should succeed");
            Assert(result.Message?.Contains("Got: hello") == true, "Message should contain value");

            result = CustomActionsRegistry.Execute("testAction", "fail");
            Assert(!result.Success, "Should fail");

            unregister();
        });

        Test("state manager tracks screen", () =>
        {
            StateManager.SetScreen("login");
            AssertEqual("login", StateManager.GetScreen());

            var state = StateManager.GetState();
            AssertEqual("login", state.Screen);
        });

        Test("state manager tracks user", () =>
        {
            var user = new UserContext { Id = "123", Email = "test@example.com", Role = "admin" };
            StateManager.SetUser(user);

            var state = StateManager.GetState();
            AssertEqual("123", state.User?.Id);
            AssertEqual("test@example.com", state.User?.Email);
        });

        Test("state manager tracks errors", () =>
        {
            StateManager.ClearErrors();
            StateManager.AddError("Test error");

            var state = StateManager.GetState();
            Assert(state.Errors.Contains("Test error"), "Errors should contain test error");
        });

        Test("commands execute press", () =>
        {
            var pressed = false;
            Autonomo.Autonomo.RegisterTapHandler("Cmd.Button", () => { pressed = true; });

            var result = Autonomo.Autonomo.ExecuteCommand("press", "Cmd.Button");
            Assert(result.Success, "Command should succeed");
            Assert(pressed, "Button should be pressed");

            ElementRegistry.Unregister("Cmd.Button");
        });

        Test("commands execute fill", () =>
        {
            var value = "";
            Autonomo.Autonomo.RegisterFillHandler("Cmd.Input", (v) => { value = v ?? ""; });

            var result = Autonomo.Autonomo.ExecuteCommand("fill", "Cmd.Input", "hello");
            Assert(result.Success, "Command should succeed");
            AssertEqual("hello", value);

            ElementRegistry.Unregister("Cmd.Input");
        });

        Test("commands return error for missing element", () =>
        {
            var result = Autonomo.Autonomo.ExecuteCommand("press", "Nonexistent.Button");
            Assert(!result.Success, "Should fail");
            Assert(result.Error?.ToLower().Contains("not found") == true, "Error should mention not found");
        });

        Console.WriteLine($"\n📊 Results: {passed} passed, {failed} failed\n");
        Environment.Exit(failed > 0 ? 1 : 0);
    }
}
