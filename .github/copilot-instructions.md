# Autonomo Design Philosophy

## Core Mantra

> **Get out of the LLM's way.**

Let the LLM use its reasoning. Do not create legacy code to make genius LLMs do what they already do — and do way better than any hard-coded instructions could.

## What This Means

### ✅ DO: Provide Clean Primitives

Autonomo provides minimal, reliable primitives:
- **Observe** - `get_state` returns structured app state
- **Act** - `send_command` performs discrete actions  
- **Wait** - `wait_for` handles async timing
- **Batch** - `run_scenario` chains multiple actions

These are "dumb" tools. They don't try to be smart. They just work.

### ❌ DON'T: Build "Smart" Tools

Avoid tools that replicate LLM capabilities:
- ~~`assert`~~ - LLM already validates by reasoning about state
- ~~`verify_element_exists`~~ - LLM sees elements in state response
- ~~`check_test_passed`~~ - LLM determines pass/fail through understanding
- ~~`suggest_next_action`~~ - LLM plans naturally

**The LLM IS the assertion engine. The LLM IS the test planner.**

### Example: Validation Testing

Bad approach (over-engineered):
```
autonomo_assert(condition: "element:Card.*")
autonomo_verify_count(elements: ">=2")
autonomo_check_no_errors()
```

Good approach (let LLM reason):
```
1. send_command(action: "submit")
2. get_state()
3. LLM observes: "New card appeared, no errors → ✅ validated"
```

## Development Guidelines

When adding features to Autonomo, ask:
1. Is this a primitive operation the app must perform?
2. Or is this reasoning/logic an LLM handles naturally?

If #2, don't build it. Trust the LLM.

## The Result

Autonomo stays lean. Tools stay simple. LLMs stay empowered.

The magic isn't in clever tooling — it's in giving a genius reasoning engine clean data to work with.
