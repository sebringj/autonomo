# frozen_string_literal: true

require "securerandom"

module Autonomo
  # Configuration for initializing an app instance
  class InstanceConfig
    attr_reader :name, :platform, :instance_id, :version, :meta

    # @param name [String] Application name
    # @param platform [Symbol] :web, :mobile, or :desktop
    # @param instance_id [String, nil] Custom instance ID (auto-generated if nil)
    # @param version [String, nil] Version string
    # @param meta [Hash, nil] Additional metadata
    def initialize(name:, platform:, instance_id: nil, version: nil, meta: nil)
      @name = name
      @platform = platform
      @instance_id = instance_id
      @version = version
      @meta = meta
    end
  end

  # Information about this app instance
  class InstanceInfo
    attr_reader :instance_id, :name, :bridge_id, :platform, :version, :created_at, :meta

    def initialize(instance_id:, name:, bridge_id:, platform:, version: nil, created_at: nil, meta: nil)
      @instance_id = instance_id
      @name = name
      @bridge_id = bridge_id
      @platform = platform
      @version = version
      @created_at = created_at || (Time.now.to_f * 1000).to_i
      @meta = meta
    end

    def to_h
      result = {
        instanceId: @instance_id,
        name: @name,
        bridgeId: @bridge_id,
        platform: @platform.to_s,
        createdAt: @created_at
      }
      result[:version] = @version if @version
      result[:meta] = @meta if @meta
      result
    end
  end

  # Singleton instance manager
  class InstanceManager
    @instance = nil
    @mutex = Mutex.new

    class << self
      def instance
        @mutex.synchronize do
          @instance ||= new
        end
      end
    end

    def initialize
      @current = nil
      @mutex = Mutex.new
    end

    # Generate a short unique ID
    def generate_instance_id
      SecureRandom.hex(4)
    end

    # Initialize this app instance
    #
    # Call once at app startup. Each process gets a unique instance ID.
    #
    # @example
    #   Autonomo.instance_manager.init_instance(
    #     Autonomo::InstanceConfig.new(name: "my-app", platform: :web)
    #   )
    #
    # @param config [InstanceConfig] Configuration for the instance
    # @return [InstanceInfo] The initialized instance info
    def init_instance(config)
      @mutex.synchronize do
        instance_id = config.instance_id || generate_instance_id
        @current = InstanceInfo.new(
          instance_id: instance_id,
          name: config.name,
          bridge_id: "#{config.name}-#{instance_id}",
          platform: config.platform,
          version: config.version,
          meta: config.meta
        )
        puts "[Autonomo] Instance initialized: #{@current.bridge_id}"
        @current
      end
    end

    # Get the current instance info
    # @return [InstanceInfo, nil]
    def get_instance
      @mutex.synchronize { @current }
    end

    # Get the current instance info or raise
    # @return [InstanceInfo]
    # @raise [RuntimeError] if instance not initialized
    def require_instance
      @mutex.synchronize do
        raise "Autonomo instance not initialized. Call init_instance() first." unless @current
        @current
      end
    end

    # Get just the bridge ID
    # @return [String, nil]
    def get_bridge_id
      @mutex.synchronize { @current&.bridge_id }
    end

    # Reset the instance (mainly for testing)
    def reset_instance
      @mutex.synchronize { @current = nil }
    end
  end

  # Global instance manager
  def self.instance_manager
    InstanceManager.instance
  end

  # Convenience methods
  def self.init_instance(config)
    instance_manager.init_instance(config)
  end

  def self.get_instance
    instance_manager.get_instance
  end

  def self.require_instance
    instance_manager.require_instance
  end

  def self.get_bridge_id
    instance_manager.get_bridge_id
  end

  def self.reset_instance
    instance_manager.reset_instance
  end
end
