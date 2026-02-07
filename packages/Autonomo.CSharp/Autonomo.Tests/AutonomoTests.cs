/**
 * Test harness for Autonomo.CSharp
 * Run: dotnet run --project Autonomo.Tests
 */

using System;
using System.Collections.Generic;
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

        // Reset singletons using instance methods
        ElementRegistry.Instance.Clear();
        CustomActionsRegistry.Instance.Clear();

        Test("registry starts empty", () =>
        {
            Assert(ElementRegistry.Instance.List().Count == 0, "Registry should be empty");
        });

        Test("RegisterTapHandler adds element", () =>
        {
            var tapped = false;
            var unregister = Registry.RegisterTapHandler("Test.Button", () => { tapped = true; });

            Assert(ElementRegistry.Instance.Has("Test.Button"), "Element should exist");
            Assert(ElementRegistry.Instance.List().Contains("Test.Button"), "Element should be in list");

            // Invoke handler
            var handler = ElementRegistry.Instance.Get("Test.Button");
            handler?.Handler(null);
            Assert(tapped, "Handler should have been called");

            unregister();
            Assert(!ElementRegistry.Instance.Has("Test.Button"), "Element should be removed");
        });

        Test("RegisterFillHandler works with value", () =>
        {
            var value = "";
            var unregister = Registry.RegisterFillHandler(
                "Test.Input",
                (v) => { value = v ?? ""; },
                getValue: () => value
            );

            var handler = ElementRegistry.Instance.Get("Test.Input");
            handler?.Handler("test value");
            AssertEqual("test value", value);
            AssertEqual("test value", handler?.GetValue?.Invoke());

            unregister();
        });

        Test("custom actions work", () =>
        {
            var unregister = CustomActions.Register("testAction", (value) =>
            {
                if (value == "fail")
                    return ActionResult.Fail("Intentional failure");
                return ActionResult.Ok($"Got: {value}");
            });

            var result = CustomActions.Execute("testAction", "hello");
            Assert(result.Success, "Should succeed");
            Assert(result.Message?.Contains("Got: hello") == true, "Message should contain value");

            result = CustomActions.Execute("testAction", "fail");
            Assert(!result.Success, "Should fail");

            unregister();
        });

        Test("state manager tracks screen", () =>
        {
            State.SetScreen("login");
            AssertEqual("login", State.GetScreen());

            var state = State.GetState();
            AssertEqual("login", state.Screen);
        });

        Test("state manager tracks user", () =>
        {
            var user = new UserContext { Id = "123", Email = "test@example.com", Role = "admin" };
            State.SetUser(user);

            var state = State.GetState();
            AssertEqual("123", state.User?.Id);
            AssertEqual("test@example.com", state.User?.Email);
        });

        Test("state manager tracks errors", () =>
        {
            StateManager.Instance.ClearErrors();
            State.AddError("Test error");

            var state = State.GetState();
            Assert(state.Errors.Contains("Test error"), "Errors should contain test error");
        });

        Test("commands execute press", () =>
        {
            var pressed = false;
            Registry.RegisterTapHandler("Cmd.Button", () => { pressed = true; });

            var result = Commands.Press("Cmd.Button");
            Assert(result.Success, "Command should succeed");
            Assert(pressed, "Button should be pressed");

            ElementRegistry.Instance.Unregister("Cmd.Button");
        });

        Test("commands execute fill", () =>
        {
            var value = "";
            Registry.RegisterFillHandler("Cmd.Input", (v) => { value = v ?? ""; });

            var result = Commands.Fill("Cmd.Input", "hello");
            Assert(result.Success, "Command should succeed");
            AssertEqual("hello", value);

            ElementRegistry.Instance.Unregister("Cmd.Input");
        });

        Test("commands return error for missing element", () =>
        {
            var result = Commands.Press("Nonexistent.Button");
            Assert(!result.Success, "Should fail");
            Assert(result.Error?.ToLower().Contains("not found") == true, "Error should mention not found");
        });

        Test("custom actions with metadata", () =>
        {
            var meta = new CustomActionMeta
            {
                Description = "Greets the user",
                Args = new Dictionary<string, string> { ["name"] = "Name to greet" },
                Example = new Dictionary<string, string> { ["name"] = "World" }
            };

            var unregister = CustomActions.Register("greetAction", (value) =>
            {
                return ActionResult.Ok($"Hello, {value}!");
            }, meta);

            // Verify action works
            var result = CustomActions.Execute("greetAction", "World");
            Assert(result.Success, "Should succeed");
            Assert(result.Message?.Contains("Hello, World!") == true, "Message should contain greeting");

            // Verify GetAll returns rich info
            var allActions = CustomActionsRegistry.Instance.GetAll();
            Assert(allActions.Count >= 1, "Should have at least one action");

            var greetInfo = allActions.Find(a => a.Name == "greetAction");
            Assert(greetInfo != null, "Should find greetAction");
            AssertEqual("Greets the user", greetInfo!.Description);
            AssertEqual("Name to greet", greetInfo.Args?["name"]);
            AssertEqual("World", greetInfo.Example?["name"]);

            unregister();
        });

        Console.WriteLine($"\n📊 Results: {passed} passed, {failed} failed\n");
        Environment.Exit(failed > 0 ? 1 : 0);
    }
}
