/**
 * RTC 配置验证模块
 * 对 RTCConfiguration 实施全面验证，确保配置安全可靠
 */

/**
 * 验证 ICE 服务器 URL 格式
 * 支持的协议: stun, turn, turns
 */
const isValidIceServerUrl = (url: string): boolean => {
  if (typeof url !== 'string' || url.length === 0) {
    return false
  }

  // 支持的协议
  const validProtocols = ['stun:', 'turn:', 'turns:']
  
  // 检查是否以有效协议开头
  const hasValidProtocol = validProtocols.some(protocol => url.startsWith(protocol))
  if (!hasValidProtocol) {
    return false
  }

  try {
    // 尝试解析 URL
    // STUN/TURN URL 格式: protocol:host:port
    const urlPattern = /^(stun|turns?):[^:]+:\d+$/
    
    // 如果不匹配标准格式，尝试更宽松的验证
    if (!urlPattern.test(url)) {
      // 允许不带端口的 URL (使用默认端口)
      const simplePattern = /^(stun|turns?):[^:]+$/
      if (!simplePattern.test(url)) {
        return false
      }
    }

    return true
  } catch (error) {
    return false
  }
}

/**
 * 验证 ICE 服务器配置
 */
const isValidIceServer = (server: any): server is RTCIceServer => {
  if (!server || typeof server !== 'object') {
    return false
  }

  // 验证 urls 字段
  if (!server.urls) {
    return false
  }

  // urls 可以是字符串或字符串数组
  const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
  
  // 验证每个 URL
  if (!urls.every((url: string) => isValidIceServerUrl(url))) {
    return false
  }

  // 如果有 username，必须是字符串
  if (server.username !== undefined && typeof server.username !== 'string') {
    return false
  }

  // 如果有 credential，必须是字符串
  if (server.credential !== undefined && typeof server.credential !== 'string') {
    return false
  }

  // 如果有 credentialType，必须是有效值
  if (server.credentialType !== undefined) {
    const validTypes = ['password', 'oauth']
    if (!validTypes.includes(server.credentialType)) {
      return false
    }
  }

  return true
}

/**
 * 验证完整的 RTCConfiguration
 * @param data - 待验证的配置对象
 * @returns 是否为有效的 RTCConfiguration
 */
export const isValidRTCConfiguration = (data: any): data is RTCConfiguration => {
  // 基础类型检查
  if (!data || typeof data !== 'object') {
    return false
  }

  // 验证 iceServers（必需）
  if (!Array.isArray(data.iceServers)) {
    return false
  }

  // 至少需要一个 ICE 服务器
  if (data.iceServers.length === 0) {
    return false
  }

  // 验证每个 ICE 服务器结构和 URL
  for (const server of data.iceServers) {
    if (!isValidIceServer(server)) {
      return false
    }
  }

  // 验证可选字段
  if (data.iceTransportPolicy !== undefined) {
    const validPolicies = ['all', 'relay']
    if (!validPolicies.includes(data.iceTransportPolicy)) {
      return false
    }
  }

  if (data.bundlePolicy !== undefined) {
    const validPolicies = ['balanced', 'max-compat', 'max-bundle']
    if (!validPolicies.includes(data.bundlePolicy)) {
      return false
    }
  }

  if (data.rtcpMuxPolicy !== undefined) {
    const validPolicies = ['negotiate', 'require']
    if (!validPolicies.includes(data.rtcpMuxPolicy)) {
      return false
    }
  }

  if (data.iceCandidatePoolSize !== undefined) {
    if (typeof data.iceCandidatePoolSize !== 'number' || 
        data.iceCandidatePoolSize < 0 || 
        data.iceCandidatePoolSize > 255) {
      return false
    }
  }

  return true
}

/**
 * 验证并清理 RTCConfiguration
 * 移除无效字段，返回安全的配置
 */
export const sanitizeRTCConfiguration = (data: any): RTCConfiguration | null => {
  if (!isValidRTCConfiguration(data)) {
    return null
  }

  // 创建清理后的配置
  const sanitized: RTCConfiguration = {
    iceServers: (data.iceServers || []).filter(isValidIceServer)
  }

  // 添加可选字段
  if (data.iceTransportPolicy) {
    sanitized.iceTransportPolicy = data.iceTransportPolicy
  }

  if (data.bundlePolicy) {
    sanitized.bundlePolicy = data.bundlePolicy
  }

  if (data.rtcpMuxPolicy) {
    sanitized.rtcpMuxPolicy = data.rtcpMuxPolicy
  }

  if (typeof data.iceCandidatePoolSize === 'number') {
    sanitized.iceCandidatePoolSize = data.iceCandidatePoolSize
  }

  return sanitized
}

/**
 * 创建默认的 RTCConfiguration
 * 使用公共 STUN 服务器
 */
export const createDefaultRTCConfiguration = (): RTCConfiguration => {
  return {
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
        ]
      }
    ]
  }
}

/**
 * 合并 RTCConfiguration
 * 将用户配置与默认配置合并
 */
export const mergeRTCConfiguration = (
  userConfig?: RTCConfiguration,
  defaultConfig?: RTCConfiguration
): RTCConfiguration => {
  const base = defaultConfig || createDefaultRTCConfiguration()
  
  if (!userConfig) {
    return base
  }

  // 验证用户配置
  const sanitized = sanitizeRTCConfiguration(userConfig)
  if (!sanitized) {
    console.warn('用户提供的 RTC 配置无效，使用默认配置')
    return base
  }

  // 合并 ICE 服务器
  const mergedIceServers = [
    ...(base.iceServers || []),
    ...(sanitized.iceServers || [])
  ]

  return {
    ...base,
    ...sanitized,
    iceServers: mergedIceServers
  }
}

/**
 * 验证错误类型
 */
export enum RTCValidationError {
  INVALID_TYPE = 'INVALID_TYPE',
  MISSING_ICE_SERVERS = 'MISSING_ICE_SERVERS',
  EMPTY_ICE_SERVERS = 'EMPTY_ICE_SERVERS',
  INVALID_ICE_SERVER = 'INVALID_ICE_SERVER',
  INVALID_URL = 'INVALID_URL',
  INVALID_POLICY = 'INVALID_POLICY',
  INVALID_POOL_SIZE = 'INVALID_POOL_SIZE',
}

/**
 * 详细验证结果
 */
export interface RTCValidationResult {
  valid: boolean
  errors: Array<{
    type: RTCValidationError
    message: string
    field?: string
  }>
}

/**
 * 详细验证 RTCConfiguration
 * 返回所有验证错误
 */
export const validateRTCConfiguration = (data: any): RTCValidationResult => {
  const result: RTCValidationResult = {
    valid: true,
    errors: []
  }

  // 基础类型检查
  if (!data || typeof data !== 'object') {
    result.valid = false
    result.errors.push({
      type: RTCValidationError.INVALID_TYPE,
      message: 'RTCConfiguration 必须是对象类型'
    })
    return result
  }

  // 验证 iceServers
  if (!data.iceServers) {
    result.valid = false
    result.errors.push({
      type: RTCValidationError.MISSING_ICE_SERVERS,
      message: '缺少 iceServers 字段',
      field: 'iceServers'
    })
    return result
  }

  if (!Array.isArray(data.iceServers)) {
    result.valid = false
    result.errors.push({
      type: RTCValidationError.INVALID_TYPE,
      message: 'iceServers 必须是数组',
      field: 'iceServers'
    })
    return result
  }

  if (data.iceServers.length === 0) {
    result.valid = false
    result.errors.push({
      type: RTCValidationError.EMPTY_ICE_SERVERS,
      message: 'iceServers 不能为空',
      field: 'iceServers'
    })
    return result
  }

  // 验证每个 ICE 服务器
  data.iceServers.forEach((server: any, index: number) => {
    if (!isValidIceServer(server)) {
      result.valid = false
      result.errors.push({
        type: RTCValidationError.INVALID_ICE_SERVER,
        message: `ICE 服务器 [${index}] 配置无效`,
        field: `iceServers[${index}]`
      })
    }
  })

  // 验证可选字段
  if (data.iceTransportPolicy !== undefined) {
    const validPolicies = ['all', 'relay']
    if (!validPolicies.includes(data.iceTransportPolicy)) {
      result.valid = false
      result.errors.push({
        type: RTCValidationError.INVALID_POLICY,
        message: `无效的 iceTransportPolicy: ${data.iceTransportPolicy}`,
        field: 'iceTransportPolicy'
      })
    }
  }

  if (data.iceCandidatePoolSize !== undefined) {
    if (typeof data.iceCandidatePoolSize !== 'number' || 
        data.iceCandidatePoolSize < 0 || 
        data.iceCandidatePoolSize > 255) {
      result.valid = false
      result.errors.push({
        type: RTCValidationError.INVALID_POOL_SIZE,
        message: 'iceCandidatePoolSize 必须在 0-255 之间',
        field: 'iceCandidatePoolSize'
      })
    }
  }

  return result
}

