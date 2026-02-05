# frozen_string_literal: true

module Autonomo
  # Element types for registration
  module ElementType
    BUTTON = "button"
    INPUT = "input"
    TOGGLE = "toggle"
    SELECT = "select"
    LINK = "link"
    CUSTOM = "custom"
  end

  # Handler for an interactive element
  class ElementHandler
    attr_accessor :type, :handler, :disabled, :get_value, :on_submit, :hint, :meta

    def initialize(type:, handler:, disabled: false, get_value: nil, on_submit: nil, hint: nil, meta: nil)
      @type = type
      @handler = handler
      @disabled = disabled
      @get_value = get_value
      @on_submit = on_submit
      @hint = hint
      @meta = meta
    end
  end

  # Information about a registered element
  class ElementInfo
    attr_reader :id, :type, :disabled, :value, :hint, :meta

    def initialize(id:, type:, disabled: false, value: nil, hint: nil, meta: nil)
      @id = id
      @type = type
      @disabled = disabled
      @value = value
      @hint = hint
      @meta = meta
    end

    def to_h
      result = { id: @id, type: @type }
      result[:disabled] = @disabled if @disabled
      result[:value] = @value if @value
      result[:hint] = @hint if @hint
      result[:meta] = @meta if @meta
      result
    end
  end

  # Singleton registry for all interactive elements
  class ElementRegistry
    @instance = nil

    def self.instance
      @instance ||= new
    end

    def initialize
      @elements = {}
      @listeners = []
      @mutex = Monitor.new  # Use Monitor for reentrant locking
    end

    # Register an interactive element
    def register(id, handler)
      @mutex.synchronize do
        @elements[id] = handler
        notify_change
      end
      -> { unregister(id) }
    end

    # Unregister an element
    def unregister(id)
      @mutex.synchronize do
        if @elements.delete(id)
          notify_change
        end
      end
    end

    # Get handler for an element
    def get(id)
      @mutex.synchronize { @elements[id] }
    end

    # Check if element exists
    def has?(id)
      @mutex.synchronize { @elements.key?(id) }
    end

    # List all element IDs
    def list
      @mutex.synchronize { @elements.keys }
    end

    # Get detailed info for all elements
    def get_all
      @mutex.synchronize do
        @elements.map do |id, handler|
          value = handler.get_value&.call
          ElementInfo.new(
            id: id,
            type: handler.type,
            disabled: handler.disabled,
            value: value,
            hint: handler.hint,
            meta: handler.meta
          )
        end
      end
    end

    # Find elements matching a regex pattern
    def find(pattern)
      regex = Regexp.new(pattern)
      get_all.select { |el| regex.match?(el.id) }
    end

    # Clear all elements
    def clear
      @mutex.synchronize do
        @elements.clear
        notify_change
      end
    end

    # Get count of registered elements
    def size
      @mutex.synchronize { @elements.size }
    end

    # Subscribe to registry changes
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
    def registry
      ElementRegistry.instance
    end

    # Register a tap handler for a component
    def register_tap_handler(id, disabled: false, hint: nil, meta: nil, &handler)
      registry.register(id, ElementHandler.new(
        type: ElementType::BUTTON,
        handler: ->(_) { handler.call },
        disabled: disabled,
        hint: hint,
        meta: meta
      ))
    end

    # Register a fill handler for an input
    def register_fill_handler(id, get_value: nil, on_submit: nil, disabled: false, hint: nil, meta: nil, &handler)
      registry.register(id, ElementHandler.new(
        type: ElementType::INPUT,
        handler: ->(v) { handler.call(v || "") },
        get_value: get_value,
        on_submit: on_submit,
        disabled: disabled,
        hint: hint,
        meta: meta
      ))
    end

    # Register a toggle handler
    def register_toggle_handler(id, get_value: nil, disabled: false, hint: nil, meta: nil, &handler)
      registry.register(id, ElementHandler.new(
        type: ElementType::TOGGLE,
        handler: handler,
        get_value: get_value,
        disabled: disabled,
        hint: hint,
        meta: meta
      ))
    end
  end
end
