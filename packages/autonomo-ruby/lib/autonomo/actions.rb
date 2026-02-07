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

  # Metadata for a custom action - helps AI understand what it does
  class CustomActionMeta
    attr_reader :description, :args, :example

    def initialize(description: nil, args: nil, example: nil)
      @description = description
      @args = args
      @example = example
    end
  end

  # Rich custom action info returned in state
  class CustomActionInfo
    attr_reader :name, :description, :args, :example

    def initialize(name:, description: nil, args: nil, example: nil)
      @name = name
      @description = description
      @args = args
      @example = example
    end

    def to_h
      result = { name: @name }
      result[:description] = @description if @description
      result[:args] = @args if @args
      result[:example] = @example if @example
      result
    end
  end

  # Internal registered action
  class RegisteredAction
    attr_reader :handler, :meta

    def initialize(handler:, meta: nil)
      @handler = handler
      @meta = meta
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
    def register(name, meta: nil, &handler)
      @mutex.synchronize do
        @actions[name] = RegisteredAction.new(handler: handler, meta: meta)
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
      action = @mutex.synchronize { @actions[name] }
      
      unless action
        available = list.empty? ? 'none' : list.join(', ')
        return ActionResult.fail("Unknown custom action: #{name}. Available: #{available}")
      end

      begin
        action.handler.call(value)
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

    # Get rich info about all actions (for AI discoverability)
    def get_all
      @mutex.synchronize do
        @actions.map do |name, action|
          CustomActionInfo.new(
            name: name,
            description: action.meta&.description,
            args: action.meta&.args,
            example: action.meta&.example
          )
        end
      end
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
    def register_custom_action(name, meta: nil, &handler)
      custom_actions.register(name, meta: meta, &handler)
    end
  end
end
