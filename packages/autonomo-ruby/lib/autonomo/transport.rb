# frozen_string_literal: true

require "webrick"
require "json"

module Autonomo
  # Configuration for the Autonomo transport
  class TransportConfig
    attr_accessor :port, :host, :cors, :on_start, :on_command

    def initialize(port: 8080, host: "127.0.0.1", cors: true, on_start: nil, on_command: nil)
      @port = port
      @host = host
      @cors = cors
      @on_start = on_start
      @on_command = on_command
    end
  end

  # Running transport instance
  class TransportInstance
    attr_reader :url

    def initialize(url, server, thread)
      @url = url
      @server = server
      @thread = thread
    end

    def stop
      @server.shutdown
      @thread.join
    end
  end

  # HTTP transport for AI communication
  module Transport
    class << self
      # Handle an incoming HTTP request
      def handle_request(method, path, body = nil)
        # Health check
        if method == "GET" && path == "/health"
          return {
            status: 200,
            body: { status: "ok", timestamp: (Time.now.to_f * 1000).to_i }
          }
        end

        # Get current state
        if method == "GET" && path == "/state"
          return {
            status: 200,
            body: Autonomo.state.get_state.to_h
          }
        end

        # Execute command
        if method == "POST" && path == "/command"
          unless body
            return {
              status: 400,
              body: { error: "Missing request body" }
            }
          end

          command = body["command"]
          target = body["target"]
          value = body["value"]

          unless command
            return {
              status: 400,
              body: { error: "Missing command field" }
            }
          end

          result = Commands.execute(command, target, value)
          return {
            status: result.success ? 200 : 400,
            body: result.to_h
          }
        end

        # Not found
        {
          status: 404,
          body: { error: "Not found" }
        }
      end

      # Create and start HTTP transport
      def create_http_transport(config = TransportConfig.new)
        url = "http://#{config.host}:#{config.port}"

        server = WEBrick::HTTPServer.new(
          Port: config.port,
          BindAddress: config.host,
          Logger: WEBrick::Log.new("/dev/null"),
          AccessLog: []
        )

        # CORS and request handling
        server.mount_proc "/" do |req, res|
          # CORS headers
          if config.cors
            res["Access-Control-Allow-Origin"] = "*"
            res["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            res["Access-Control-Allow-Headers"] = "Content-Type"
          end

          # Handle OPTIONS
          if req.request_method == "OPTIONS"
            res.status = 200
            next
          end

          # Parse body
          body = nil
          if req.body && !req.body.empty?
            body = JSON.parse(req.body)
          end

          # Handle request
          result = handle_request(req.request_method, req.path, body)

          res.status = result[:status]
          res["Content-Type"] = "application/json"
          res.body = JSON.generate(result[:body])
        end

        thread = Thread.new { server.start }

        config.on_start&.call(url)

        TransportInstance.new(url, server, thread)
      end
    end
  end

  # Module-level helpers
  class << self
    def create_http_transport(config = TransportConfig.new)
      Transport.create_http_transport(config)
    end

    def handle_request(method, path, body = nil)
      Transport.handle_request(method, path, body)
    end
  end
end
