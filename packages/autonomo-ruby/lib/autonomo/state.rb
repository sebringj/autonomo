# frozen_string_literal: true

module Autonomo
  # User context information
  class UserContext
    attr_accessor :id, :email, :role, :extra

    def initialize(id: nil, email: nil, role: nil, **extra)
      @id = id
      @email = email
      @role = role
      @extra = extra
    end

    def to_h
      result = {}
      result[:id] = @id if @id
      result[:email] = @email if @email
      result[:role] = @role if @role
      result.merge!(@extra)
      result
    end
  end

  # Network request information
  class NetworkRequest
    attr_reader :method, :url, :status, :duration, :error

    def initialize(method:, url:, status: nil, duration: nil, error: nil)
      @method = method
      @url = url
      @status = status
      @duration = duration
      @error = error
    end

    def to_h
      result = { method: @method, url: @url }
      result[:status] = @status if @status
      result[:duration] = @duration if @duration
      result[:error] = @error if @error
      result
    end
  end

  # Complete application state snapshot
  class AppState
    attr_reader :screen, :timestamp, :instance, :user, :elements, :custom_actions,
                :data, :errors, :logs, :render_errors, :network

    def initialize(screen:, timestamp:, instance:, user:, elements:, custom_actions:,
                   data:, errors:, logs:, render_errors:, network:)
      @screen = screen
      @timestamp = timestamp
      @instance = instance
      @user = user
      @elements = elements
      @custom_actions = custom_actions
      @data = data
      @errors = errors
      @logs = logs
      @render_errors = render_errors
      @network = network
    end

    def to_h
      result = {
        screen: @screen,
        timestamp: @timestamp,
        elements: @elements.map(&:to_h),
        customActions: @custom_actions,
        errors: @errors,
        logs: @logs,
        renderErrors: @render_errors
      }
      result[:instance] = @instance.to_h if @instance
      result[:user] = @user.to_h if @user
      result[:data] = @data if @data && !@data.empty?
      result[:network] = @network.map(&:to_h) if @network && !@network.empty?
      result
    end
  end

  # Singleton state manager
  class StateManager
    MAX_ERRORS = 50
    MAX_LOGS = 100
    MAX_NETWORK = 50

    @instance = nil

    def self.instance
      @instance ||= new
    end

    def initialize
      @screen = "unknown"
      @user = nil
      @data = {}
      @errors = []
      @logs = []
      @render_errors = []
      @network = []
      @listeners = []
      @mutex = Monitor.new  # Use Monitor for reentrant locking

      # Forward registry/action changes
      Autonomo.registry.on_change { notify_change }
      Autonomo.custom_actions.on_change { notify_change }
    end

    # Set current screen/route
    def set_screen(screen)
      @mutex.synchronize do
        @screen = screen
        notify_change
      end
    end

    # Get current screen
    def get_screen
      @mutex.synchronize { @screen }
    end

    # Set user context
    def set_user(user)
      @mutex.synchronize do
        @user = user
        notify_change
      end
    end

    # Set application data
    def set_data(data)
      @mutex.synchronize do
        @data = data
        notify_change
      end
    end

    # Merge data into existing
    def merge_data(data)
      @mutex.synchronize do
        @data.merge!(data)
        notify_change
      end
    end

    # Add an error
    def add_error(error)
      @mutex.synchronize do
        @errors << error
        @errors.shift while @errors.size > MAX_ERRORS
        notify_change
      end
    end

    # Add a log entry
    def add_log(log)
      @mutex.synchronize do
        @logs << log
        @logs.shift while @logs.size > MAX_LOGS
      end
    end

    # Add a render error
    def add_render_error(error)
      @mutex.synchronize do
        @render_errors << error
        @render_errors.shift while @render_errors.size > MAX_ERRORS
        notify_change
      end
    end

    # Add a network request
    def add_network_request(request)
      @mutex.synchronize do
        @network << request
        @network.shift while @network.size > MAX_NETWORK
      end
    end

    # Clear errors
    def clear_errors
      @mutex.synchronize do
        @errors.clear
        @render_errors.clear
        notify_change
      end
    end

    # Clear logs
    def clear_logs
      @mutex.synchronize { @logs.clear }
    end

    # Clear network history
    def clear_network
      @mutex.synchronize { @network.clear }
    end

    # Get current state snapshot
    def get_state
      @mutex.synchronize do
        AppState.new(
          screen: @screen,
          timestamp: (Time.now.to_f * 1000).to_i,
          instance: Autonomo.get_instance,
          user: @user,
          elements: Autonomo.registry.get_all,
          custom_actions: Autonomo.custom_actions.list,
          data: @data.empty? ? nil : @data.dup,
          errors: @errors.dup,
          logs: @logs.dup,
          render_errors: @render_errors.dup,
          network: @network.empty? ? nil : @network.dup
        )
      end
    end

    # Subscribe to state changes
    def on_change(&listener)
      @mutex.synchronize { @listeners << listener }
      -> { @mutex.synchronize { @listeners.delete(listener) } }
    end

    # Trigger a state update notification
    def notify_change
      state = get_state
      @listeners.each { |l| l.call(state) }
    end
  end

  # Module-level helpers
  class << self
    def state
      StateManager.instance
    end
  end
end
