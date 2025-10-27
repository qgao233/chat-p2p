# 🔐 P2P 加密聊天 - MVP 版本

基于 Chitchatter 核心架构的最小化可行产品（MVP），使用 Vue3 + TypeScript 实现的端到端加密 P2P 聊天应用。

## ✨ 核心特性

- **🔒 端到端加密**：基于 RSA-OAEP 加密算法，消息仅存在于通信双方的浏览器中
- **🌐 点对点直连**：使用 WebRTC 技术建立 P2P 连接，无需中心服务器
- **⚡ 实时通讯**：基于 Trystero 库实现的高效实时消息传输
- **💾 零服务器存储**：所有消息都在内存中，关闭浏览器后自动清除
- **🎨 现代化 UI**：响应式设计，支持多用户在线显示

## 🏗️ 核心架构

```
┌─────────────────────────────────────────────────────────┐
│                      应用层 (Vue3)                       │
│  ┌─────────────┐              ┌──────────────┐          │
│  │  App.vue    │              │ ChatRoom.vue │          │
│  └──────┬──────┘              └───────┬──────┘          │
└─────────┼──────────────────────────────┼────────────────┘
          │                              │
┌─────────┼──────────────────────────────┼────────────────┐
│         │      Composable 层           │                │
│  ┌──────▼─────────────────────────────▼──────┐          │
│  │           useRoom.ts                      │          │
│  │  - 房间状态管理                            │          │
│  │  - 消息收发                                │          │
│  │  - 用户管理                                │          │
│  └──────┬──────────────────────┬──────────────┘          │
└─────────┼──────────────────────┼────────────────────────┘
          │                      │
┌─────────┼──────────────────────┼────────────────────────┐
│         │    核心服务层         │                        │
│  ┌──────▼──────────┐    ┌──────▼──────────┐            │
│  │  PeerRoom.ts    │    │ encryption.ts   │            │
│  │  - P2P 连接     │    │ - RSA 加密      │            │
│  │  - 房间管理     │    │ - 密钥管理      │            │
│  │  - 消息通道     │    │ - 加解密操作    │            │
│  └──────┬──────────┘    └─────────────────┘            │
└─────────┼─────────────────────────────────────────────┘
          │
┌─────────▼─────────────────────────────────────────────┐
│              底层技术栈                                │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Trystero   │  │   WebRTC     │  │  Web Crypto  │ │
│  │  P2P 连接   │  │  实时通信    │  │  浏览器加密  │ │
│  └─────────────┘  └──────────────┘  └──────────────┘ │
└───────────────────────────────────────────────────────┘
```

## 📋 工作原理

### 1️⃣ **连接建立**
```typescript
用户 A 浏览器 → WebTorrent Tracker ← 用户 B 浏览器
              (通过房间 ID 匹配)
```

### 2️⃣ **P2P 直连**
```typescript
用户 A ←────── WebRTC 直连 ──────→ 用户 B
      (如果失败，使用 TURN 中继)
```

### 3️⃣ **加密通信**
```typescript
用户 A: 生成密钥对 → 交换公钥 ← 用户 B: 生成密钥对
用户 A: 用 B 的公钥加密 → 发送 → 用 B 的私钥解密
```

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 📁 项目结构

```
chat-p2p/
├── src/
│   ├── components/          # Vue 组件
│   │   └── ChatRoom.vue     # 聊天室主界面
│   ├── composables/         # Vue3 Composables
│   │   └── useRoom.ts       # 房间逻辑管理
│   ├── lib/                 # 核心库
│   │   └── PeerRoom.ts      # P2P 房间类
│   ├── services/            # 服务层
│   │   └── encryption.ts    # 加密服务
│   ├── config/              # 配置
│   │   └── rtc.ts           # WebRTC 配置
│   └── App.vue              # 应用入口
├── package.json
└── vite.config.ts
```

## 🔑 核心类说明

### `PeerRoom` - P2P 房间管理器
```typescript
class PeerRoom {
  constructor(roomId: string, config?: RoomConfig)
  onPeerJoin(handler: (peerId: string) => void)
  onPeerLeave(handler: (peerId: string) => void)
  createMessageAction(): { sendMessage, onMessage }
  createMetadataAction(): { sendMetadata, onMetadata }
  getPeers(): string[]
  leave(): void
}
```

### `EncryptionService` - 加密服务
```typescript
class EncryptionService {
  generateKeyPair(): Promise<CryptoKeyPair>
  stringifyCryptoKey(key: CryptoKey): Promise<string>
  parseCryptoKey(keyString: string, type: 'public' | 'private'): Promise<CryptoKey>
  encryptString(publicKey: CryptoKey, plaintext: string): Promise<ArrayBuffer>
  decryptString(privateKey: CryptoKey, encrypted: ArrayBuffer): Promise<string>
}
```

### `useRoom` - Vue3 Composable
```typescript
function useRoom(roomId: string) {
  return {
    messages: Ref<Message[]>
    peers: Ref<Peer[]>
    currentUserId: Ref<string>
    currentUsername: Ref<string>
    isConnected: Ref<boolean>
    joinRoom: () => Promise<void>
    sendChatMessage: (text: string) => void
    updateUsername: (name: string) => Promise<void>
    leaveRoom: () => void
  }
}
```

## 🔧 技术栈

- **前端框架**: Vue 3 (Composition API)
- **语言**: TypeScript
- **构建工具**: Vite
- **P2P 库**: Trystero (基于 WebTorrent)
- **实时通信**: WebRTC
- **加密**: Web Crypto API (RSA-OAEP)
- **本地存储**: localforage
- **UUID**: uuid

## 🌟 特色功能

### 自动密钥管理
- 首次访问自动生成 RSA 密钥对
- 密钥持久化存储在浏览器本地
- 自动在 peers 之间交换公钥

### 房间系统
- 支持创建随机房间（UUID）
- 支持加入指定房间 ID
- URL 参数共享房间链接
- 一键复制房间邀请链接

### 用户体验
- 实时在线用户列表
- 消息时间戳显示
- 自动滚动到最新消息
- 现代化渐变 UI 设计

## 🔒 安全性

### 加密机制
- **RSA-OAEP**: 2048 位非对称加密
- **SHA-256**: 哈希算法
- **端到端**: 消息在发送端加密，接收端解密

### 隐私保护
- 消息不经过服务器
- 不持久化聊天记录
- 密钥仅存储在本地浏览器
- 房间 ID 可自定义，不公开

## ⚠️ 限制与注意事项

1. **浏览器兼容性**: 需要支持 WebRTC 和 Web Crypto API 的现代浏览器
2. **网络要求**: 某些网络环境可能无法建立 P2P 连接（需要 TURN 服务器）
3. **消息不持久化**: 关闭浏览器后所有消息清除
4. **房间安全**: 房间 ID 是唯一的安全凭证，需妥善分享

## 📝 使用示例

### 创建房间
1. 打开应用
2. 点击"创建新房间"
3. 复制房间链接分享给朋友

### 加入房间
1. 获取房间链接或房间 ID
2. 输入房间 ID 点击"加入房间"
3. 开始聊天

## 🛠️ 开发计划

- [ ] 文件传输功能
- [ ] 视频/音频通话
- [ ] 屏幕共享
- [ ] 更多加密算法支持
- [ ] 移动端适配优化
- [ ] 多语言支持

## 📄 许可证

本项目基于 Chitchatter 的核心理念开发，用于学习和演示目的。

## 🙏 致谢

- [Chitchatter](https://github.com/jeremyckahn/chitchatter) - 核心架构灵感来源
- [Trystero](https://github.com/dmotz/trystero) - P2P 连接库
- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架

---

**🎉 享受私密、安全的 P2P 聊天体验！**
