/**
 * 公共房间工具函数
 * 根据当前网站域名生成唯一的公共房间 UUID
 */

import { v5 as uuidv5 } from 'uuid'

// UUID v5 命名空间（使用 DNS 命名空间）
const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

/**
 * 获取当前网站域名
 */
const getCurrentDomain = (): string => {
  // 在浏览器环境中获取域名
  if (typeof window !== 'undefined') {
    return window.location.hostname
  }
  return 'localhost'
}

/**
 * 根据域名生成公共房间 UUID
 * 使用 UUID v5 确保同一域名总是生成相同的 UUID
 */
export const getPublicRoomId = (): string => {
  const domain = getCurrentDomain()
  const publicRoomId = uuidv5(domain, DNS_NAMESPACE)
  console.log('[PublicRoom] 域名:', domain, '-> 公共房间ID:', publicRoomId)
  return publicRoomId
}

/**
 * 检查给定的房间ID是否是当前域名的公共房间
 */
export const isPublicRoom = (roomId: string): boolean => {
  return roomId === getPublicRoomId()
}

/**
 * 获取当前域名（用于显示）
 */
export const getCurrentDomainDisplay = (): string => {
  return getCurrentDomain()
}

