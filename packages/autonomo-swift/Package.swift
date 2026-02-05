// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Autonomo",
    platforms: [
        .iOS(.v15),
        .macOS(.v12),
        .tvOS(.v15),
        .watchOS(.v8)
    ],
    products: [
        .library(
            name: "Autonomo",
            targets: ["Autonomo"]
        ),
    ],
    targets: [
        .target(
            name: "Autonomo",
            path: "Sources"
        ),
        .testTarget(
            name: "AutonomoTests",
            dependencies: ["Autonomo"],
            path: "Tests"
        ),
    ]
)
