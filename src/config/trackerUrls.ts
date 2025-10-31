/**
 * WebTorrent Tracker URLs 配置
 * 用于 P2P 文件传输
 * 
 * 注意：
 * - WebSocket trackers (wss://) 适用于浏览器环境
 * - 使用多个 tracker 提高连接成功率
 * - 这些是公共 tracker，定期检查可用性
 */

export const trackerUrls = [
  // 主要 WebSocket trackers（推荐）
  'wss://tracker.openwebtorrent.com',
  
  // 备用 WebSocket trackers
  'wss://tracker.fastcast.nz',
  
  // 公共 WebTorrent trackers
  'wss://tracker.webtorrent.dev',
  'wss://tracker.files.fm:7073/announce',
  
  // 如果需要，可以添加自己的 tracker
  // 'wss://your-tracker.example.com',
]

export default trackerUrls


