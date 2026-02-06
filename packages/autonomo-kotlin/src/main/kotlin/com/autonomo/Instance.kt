package com.autonomo

import java.util.UUID

/**
 * Platform type for the instance
 */
enum class Platform(val value: String) {
    WEB("web"),
    MOBILE("mobile"),
    DESKTOP("desktop")
}

/**
 * Configuration for initializing an app instance
 */
data class InstanceConfig(
    val name: String,
    val platform: Platform,
    val instanceId: String? = null,
    val version: String? = null,
    val meta: Map<String, Any>? = null
)

/**
 * Information about this app instance
 */
data class InstanceInfo(
    val instanceId: String,
    val name: String,
    val bridgeId: String,
    val platform: Platform,
    val version: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val meta: Map<String, Any>? = null
) {
    fun toMap(): Map<String, Any?> = buildMap {
        put("instanceId", instanceId)
        put("name", name)
        put("bridgeId", bridgeId)
        put("platform", platform.value)
        put("createdAt", createdAt)
        version?.let { put("version", it) }
        meta?.let { put("meta", it) }
    }
}

/**
 * Singleton instance manager
 *
 * Manages the unique identity of this app instance.
 */
object InstanceManager {
    @Volatile
    private var currentInstance: InstanceInfo? = null
    private val lock = Any()

    /**
     * Generate a short unique ID
     */
    private fun generateInstanceId(): String {
        return UUID.randomUUID().toString().take(8)
    }

    /**
     * Initialize this app instance.
     *
     * Call once at app startup. Each process gets a unique instance ID.
     *
     * ```kotlin
     * // In Application.onCreate() or Activity.onCreate()
     * InstanceManager.initInstance(InstanceConfig(
     *     name = "my-app",
     *     platform = Platform.MOBILE
     * ))
     * ```
     */
    fun initInstance(config: InstanceConfig): InstanceInfo {
        synchronized(lock) {
            val instanceId = config.instanceId ?: generateInstanceId()
            val info = InstanceInfo(
                instanceId = instanceId,
                name = config.name,
                bridgeId = "${config.name}-$instanceId",
                platform = config.platform,
                version = config.version,
                meta = config.meta
            )
            currentInstance = info
            println("[Autonomo] Instance initialized: ${info.bridgeId}")
            return info
        }
    }

    /**
     * Get the current instance info
     */
    fun getInstance(): InstanceInfo? {
        synchronized(lock) {
            return currentInstance
        }
    }

    /**
     * Get the current instance info or throw
     */
    fun requireInstance(): InstanceInfo {
        synchronized(lock) {
            return currentInstance
                ?: throw IllegalStateException("Autonomo instance not initialized. Call initInstance() first.")
        }
    }

    /**
     * Get just the bridge ID
     */
    fun getBridgeId(): String? {
        synchronized(lock) {
            return currentInstance?.bridgeId
        }
    }

    /**
     * Reset the instance (mainly for testing)
     */
    fun resetInstance() {
        synchronized(lock) {
            currentInstance = null
        }
    }
}
