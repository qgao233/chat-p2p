/**
 * WebTorrent Tracker URLs 配置
 * 用于 P2P 文件传输
 */

export const trackerUrls = [
  // WebSocket trackers
  'wss://tracker.openwebtorrent.com',
  'wss://tracker.webtorrent.dev',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.files.fm:7073/announce',
  
  // Additional reliable trackers
  'wss://tracker.webtorrent.io',
  
  // HTTP trackers as fallback
  'https://tracker.openwebtorrent.com/announce',
]

export default trackerUrls

