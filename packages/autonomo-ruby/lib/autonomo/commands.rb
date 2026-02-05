# frozen_string_literal: true

module Autonomo
  # Result of a command execution
  class CommandResult
    attr_reader :success, :state, :message, :error

    def initialize(success:, state:, message: nil, error: nil)
      @success = success
      @state = state
      @message = message
      @error = error
    end

    def to_h
      result = {
        success: @success,
        state: @state.to_h
      }
      result[:message] = @message if @message
      result[:error] = @error if @error
      result
    end

    def self.ok(message = nil)
      new(success: true, message: message, state: Autonomo.state.get_state)
    end

    def self.fail(error)
      new(success: false, error: error, state: Autonomo.state.get_state)
    end
  end

  # Command execution
  module Commands
    class << self
      attr_accessor :navigation_handler

      # Navigate to a screen
      def navigate(screen)
        return CommandResult.fail("No navigation handler registered") unless @navigation_handler

        begin
          @navigation_handler.call(screen)
          sleep(0.1)
          CommandResult.ok("Navigated to #{screen}")
        rescue => e
          CommandResult.fail(e.message)
        end
      end

      # Press/tap an element
      def press(element_id)
        handler = Autonomo.registry.get(element_id)
        
        unless handler
          available = Autonomo.registry.list.join(", ")
          return CommandResult.fail("Element not found: #{element_id}. Available: #{available}")
        end

        return CommandResult.fail("Element is disabled: #{element_id}") if handler.disabled

        begin
          handler.handler.call(nil)
          sleep(0.1)
          CommandResult.ok("Pressed #{element_id}")
        rescue => e
          CommandResult.fail(e.message)
        end
      end

      # Fill text into an input element
      def fill(element_id, value)
        handler = Autonomo.registry.get(element_id)

        unless handler
          available = Autonomo.registry.list.join(", ")
          return CommandResult.fail("Element not found: #{element_id}. Available: #{available}")
        end

        if handler.type != ElementType::INPUT
          return CommandResult.fail("Element #{element_id} is not an input (type: #{handler.type})")
        end

        return CommandResult.fail("Element is disabled: #{element_id}") if handler.disabled

        begin
          handler.handler.call(value)
          sleep(0.05)
          CommandResult.ok("Filled #{element_id} with \"#{value}\"")
        rescue => e
          CommandResult.fail(e.message)
        end
      end

      # Submit an input (press enter)
      def submit(element_id)
        handler = Autonomo.registry.get(element_id)

        return CommandResult.fail("Element not found: #{element_id}") unless handler
        return CommandResult.fail("Element #{element_id} does not support submit") unless handler.on_submit

        begin
          handler.on_submit.call
          sleep(0.1)
          CommandResult.ok("Submitted #{element_id}")
        rescue => e
          CommandResult.fail(e.message)
        end
      end

      # Execute a custom action
      def custom(action_name, value = nil)
        result = Autonomo.custom_actions.execute(action_name, value)
        CommandResult.new(
          success: result.success,
          message: result.message,
          error: result.error,
          state: Autonomo.state.get_state
        )
      end

      # Wait for a duration
      def wait(ms)
        sleep(ms / 1000.0)
        CommandResult.ok("Waited #{ms}ms")
      end

      # Get current state without any action
      def get_state
        CommandResult.ok
      end

      # Execute a command by type
      def execute(command, target = nil, value = nil)
        case command.downcase
        when "navigate"
          return CommandResult.fail("Navigate requires a target screen") unless target
          navigate(target)

        when "press", "tap", "click"
          return CommandResult.fail("Press requires a target element ID") unless target
          press(target)

        when "fill", "type"
          return CommandResult.fail("Fill requires a target element ID") unless target
          fill(target, value || "")

        when "submit"
          return CommandResult.fail("Submit requires a target element ID") unless target
          submit(target)

        when "custom"
          return CommandResult.fail("Custom requires an action name") unless target
          custom(target, value)

        when "wait"
          wait((target || "1000").to_i)

        when "state", "snapshot"
          get_state

        else
          CommandResult.fail("Unknown command: #{command}")
        end
      end
    end
  end

  # Module-level helpers
  class << self
    def set_navigation_handler(&handler)
      Commands.navigation_handler = handler
    end

    def execute_command(command, target = nil, value = nil)
      Commands.execute(command, target, value)
    end
  end
end
