plugins {
    kotlin("jvm") version "1.9.22"
    `maven-publish`
}

group = "com.autonomo"
version = "0.1.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.7.3")
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
}

kotlin {
    jvmToolchain(17)
}

publishing {
    publications {
        create<MavenPublication>("maven") {
            groupId = "com.autonomo"
            artifactId = "autonomo"
            version = "0.1.0"
            
            from(components["java"])
            
            pom {
                name.set("Autonomo")
                description.set("AI-powered application testing - Kotlin/JVM integration")
                url.set("https://github.com/sebringj/autonomo")
                licenses {
                    license {
                        name.set("SEE LICENSE IN LICENSE.md")
                        url.set("https://github.com/sebringj/autonomo/blob/main/LICENSE.md")
                    }
                }
            }
        }
    }
}
