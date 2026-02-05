# frozen_string_literal: true

module Autonomo
  # Result of a custom action
  class ActionResult
    attr_reader :success, :message, :error, :data

    def initialize(success:, message: nil, error: nil, data: nil)
      @success = success
      @message = message
      @error = error
      @data = data
    end

    def to_h
      result = { success: @success }
      result[:message] = @message if @message
      result[:error] = @error if @error
      result[:data] = @data if @data
      result
    end

    def self.ok(message = nil, data: nil)
      new(success: true, message: message, data: data)
    end

    def self.fail(error)
      new(success: false, error: error)
    end
  end

  # Singleton registry for custom actions
  class CustomActionsRegistry
    @instance = nil

    def self.instance
      @instance ||= new
    end

    def initialize
      @actions = {}
      @listeners = []
      @mutex = Monitor.new  # Use Monitor for reentrant locking
    end

    # Register a custom action
    def register(name, &handler)
      @mutex.synchronize do
        @actions[name] = handler
        notify_change
      end
      -> { unregister(name) }
    end

    # Unregister a custom action
    def unregister(name)
      @mutex.synchronize do
        if @actions.delete(name)
          notify_change
        end
      end
    end

    # Execute a custom action
    def execute(name, value = nil)
      handler = @mutex.synchronize { @actions[name] }
      
      return ActionResult.fail("Unknown custom action: #{name}") unless handler

      begin
        handler.call(value)
      rescue => e
        ActionResult.fail(e.message)
      end
    end

    # Check if action exists
    def has?(name)
      @mutex.synchronize { @actions.key?(name) }
    end

    # List all action names
    def list
      @mutex.synchronize { @actions.keys }
    end

    # Subscribe to changes
    def on_change(&listener)
      @mutex.synchronize { @listeners << listener }
      -> { @mutex.synchronize { @listeners.delete(listener) } }
    end

    private

    def notify_change
      @listeners.each(&:call)
    end
  end

  # Module-level helpers
  class << self
    def custom_actions
      CustomActionsRegistry.instance
    end

    # Register a custom action
    def register_custom_action(name, &handler)
      custom_actions.register(name, &handler)
    end
  end
end
