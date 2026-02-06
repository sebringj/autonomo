# frozen_string_literal: true

require_relative "autonomo/version"
require_relative "autonomo/registry"
require_relative "autonomo/actions"
require_relative "autonomo/state"
require_relative "autonomo/instance"
require_relative "autonomo/commands"
require_relative "autonomo/transport"

module Autonomo
  class Error < StandardError; end
end
