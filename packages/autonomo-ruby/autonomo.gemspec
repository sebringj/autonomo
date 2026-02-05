# frozen_string_literal: true

require_relative "lib/autonomo/version"

Gem::Specification.new do |spec|
  spec.name = "autonomo"
  spec.version = Autonomo::VERSION
  spec.authors = ["sebringj"]
  spec.email = ["jason@sebring.dev"]

  spec.summary = "AI-powered application testing - Ruby integration"
  spec.description = "Ruby integration for Autonomo - enables AI tools to interact with and test your Ruby applications"
  spec.homepage = "https://github.com/sebringj/autonomo"
  spec.license = "SEE LICENSE IN LICENSE.md"
  spec.required_ruby_version = ">= 2.7.0"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/sebringj/autonomo"

  spec.files = Dir["lib/**/*", "README.md", "LICENSE.md"]
  spec.require_paths = ["lib"]

  spec.add_dependency "webrick", "~> 1.8"
end
