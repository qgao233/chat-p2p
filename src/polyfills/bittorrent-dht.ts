/**
 * bittorrent-dht polyfill for browser
 * WebTorrent 在浏览器环境中不需要 DHT（Distributed Hash Table）
 * 因为浏览器使用 WebRTC 和 tracker 服务器进行节点发现
 */

import { EventEmitter } from 'events'

/**
 * 空的 DHT Client 实现
 * 在浏览器环境中，DHT 功能被禁用
 */
export class Client extends EventEmitter {
  constructor() {
    super()
    console.log('[DHT Polyfill] DHT is disabled in browser environment')
  }

  listen() {
    // 空实现
  }

  destroy() {
    // 空实现
  }

  addNode() {
    // 空实现
  }

  lookup() {
    // 空实现
  }

  announce() {
    // 空实现
  }
}

// 默认导出
export default {
  Client
}

