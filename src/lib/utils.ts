/**
 * 工具函数集合
 */

/**
 * 用户名前缀常量
 */
const USERNAME_PREFIX = 'User_'

/**
 * 获取用户名缩写
 * @param username 用户名
 * @returns 缩写字符串（中文取前两个字，英文取首字母，User_前缀取后4位）
 */
export const getUserInitials = (username: string): string => {
  if (!username) return '?'
  
  const name = username.trim()
  
  // 如果是 User_ 开头，取后面的4位
  if (name.startsWith(USERNAME_PREFIX)) {
    const suffix = name.slice(USERNAME_PREFIX.length)
    return suffix.slice(0, 4).toUpperCase()
  }
  
  // 如果是中文，取前两个字
  if (/[\u4e00-\u9fa5]/.test(name)) {
    return name.slice(0, 2)
  }
  
  // 如果是英文，取首字母（最多两个单词）
  const words = name.split(/\s+/)
  if (words.length >= 2 && words[0] && words[1]) {
    return ((words[0][0] || '') + (words[1][0] || '')).toUpperCase()
  }
  
  return name.slice(0, 2).toUpperCase()
}

/**
 * 生成默认用户名
 * @param userId 用户ID
 * @returns 格式化的用户名（User_前4位ID）
 */
export const generateDefaultUsername = (userId: string): string => {
  if (!userId) return USERNAME_PREFIX + 'Unknown'
  return USERNAME_PREFIX + userId.slice(0, 4)
}

