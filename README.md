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
│   ├── lib/                      # 核心库（模块化架构 ⭐）
│   │   ├── index.ts              # 统一导出入口
│   │   ├── types.ts              # 类型定义中心
│   │   ├── PeerRoom.ts           # 主协调器
│   │   ├── res/                  # 资源管理器
│   │   │   ├── EventManager.ts       # 事件管理器
│   │   │   ├── ActionManager.ts      # 动作管理器
│   │   │   ├── StreamManager.ts      # 流管理器
│   │   │   ├── ConnectionManager.ts  # 连接分析器
│   │   │   └── PeerVerificationManager.ts # 对等方验证管理器
│   │   └── rtcValidation.ts      # RTC 配置验证管理器
│   ├── composables/              # Vue3 Composables
│   │   └── useRoom.ts            # 房间逻辑管理（集成验证功能）
│   ├── components/               # Vue 组件
│   │   └── ChatRoom.vue          # 聊天室主界面
│   ├── services/                 # 服务层
│   │   └── encryption.ts         # 加密服务
│   ├── config/                   # 配置
│   │   └── rtc.ts                # WebRTC 配置
│   └── App.vue                   # 应用入口
├── package.json
└── vite.config.ts
```

**架构特点**:
- ✅ **模块化设计** - 按职责拆分为 7 个独立模块
- ✅ **单一职责** - 每个模块不超过 160 行
- ✅ **易于测试** - 独立模块可单独测试
- ✅ **便于扩展** - 新功能可独立添加

详见: [架构重构文档](./ARCHITECTURE_REFACTOR.md)

## 🔑 核心类说明

### `PeerRoom` - P2P 房间管理器

支持 **14 种操作类型** 和 **命名空间隔离**：

```typescript
class PeerRoom {
  constructor(roomId: string, config?: RoomConfig)
  
  // 事件监听（支持类型化钩子）
  onPeerJoin(hookType: PeerHookType, handler: (peerId: string) => void)
  onPeerLeave(hookType: PeerHookType, handler: (peerId: string) => void)
  onPeerStream(hookType: PeerHookType, handler: (stream, peerId, metadata) => void)
  
  // 核心方法：创建命名空间操作
  makeAction<T>(action: PeerAction, namespace: ActionNamespace): PeerAction
  
  // 简化接口
  createMessageAction(namespace?: ActionNamespace): { sendMessage, onMessage }
  createMetadataAction(namespace?: ActionNamespace): { sendMetadata, onMetadata }
  createTypingAction(namespace?: ActionNamespace): { sendTyping, onTyping }
  createMediaAction(namespace?: ActionNamespace): { sendMedia, onMedia }
  
  // 流管理
  addStream(stream: MediaStream, targetPeers?, metadata?: { type: PeerStreamType })
  removeStream(stream: MediaStream, targetPeers?)
  
  // 连接检测
  getPeerConnectionTypes(): Promise<Record<string, PeerConnectionType>>
  
  // 工具方法
  getPeers(): string[]
  leave(): void
}
```

**命名空间**:
- `ActionNamespace.GROUP` (`g`) - 群组消息
- `ActionNamespace.DIRECT_MESSAGE` (`dm`) - 直接消息

**操作类型** (14 种):
- `MESSAGE` - 文本消息
- `MEDIA_MESSAGE` - 媒体分享
- `PEER_METADATA` - 用户信息
- `TYPING_STATUS_CHANGE` - 输入状态
- `AUDIO_CHANGE` - 音频状态
- `VIDEO_CHANGE` - 视频状态
- `SCREEN_SHARE` - 屏幕共享
- `FILE_OFFER` - 文件传输
- 等等...

**流管理**:
```typescript
// 添加媒体流（自动排队，防止竞争条件）
peerRoom.addStream(videoStream, targetPeers, { type: PeerStreamType.VIDEO })

// 移除媒体流
peerRoom.removeStream(videoStream)

// 监听流事件
peerRoom.onPeerStream((stream, peerId, metadata) => {
  console.log('收到流:', metadata?.type)
})
```

**连接类型检测**:
```typescript
// 获取连接类型（DIRECT 或 RELAY）
const connectionTypes = await peerRoom.getPeerConnectionTypes()
console.log(connectionTypes) // { 'peer-id': 'DIRECT' }
```

**事件钩子系统**:
```typescript
// 基础连接管理
peerRoom.onPeerJoin(PeerHookType.NEW_PEER, (peerId) => {
  console.log('用户加入:', peerId)
})

// 视频流管理
peerRoom.onPeerStream(PeerHookType.VIDEO, (stream, peerId) => {
  videoElement.srcObject = stream
})

// 屏幕共享管理
peerRoom.onPeerStream(PeerHookType.SCREEN, (stream, peerId) => {
  screenElement.srcObject = stream
})

// 文件传输管理
peerRoom.onPeerJoin(PeerHookType.FILE_SHARE, (peerId) => {
  initFileTransfer(peerId)
})
```

详见:
- [连接状态管理文档](./CONNECTION_STATE.md) - 事件钩子系统完整说明
- [RTC 配置验证文档](./RTC_VALIDATION.md) - 配置验证系统完整说明

### `RTCValidationManager` - RTC 配置验证管理器

提供完整的 RTCConfiguration 验证、清理和合并功能：

```typescript
class RTCValidationManager {
  // 验证配置是否有效
  isValidRTCConfiguration(data: any): data is RTCConfiguration
  
  // 清理并返回安全的配置
  sanitizeRTCConfiguration(data: any): RTCConfiguration | null
  
  // 创建默认配置
  createDefaultRTCConfiguration(): RTCConfiguration
  
  // 合并用户配置与默认配置
  mergeRTCConfiguration(
    userConfig?: RTCConfiguration,
    defaultConfig?: RTCConfiguration
  ): RTCConfiguration
  
  // 详细验证并返回错误信息
  validateRTCConfiguration(data: any): RTCValidationResult
}

// 使用单例实例
import { rtcValidationManager } from './lib'

const config = rtcValidationManager.createDefaultRTCConfiguration()
const isValid = rtcValidationManager.isValidRTCConfiguration(config)

// 或使用便捷函数（向后兼容）
import { isValidRTCConfiguration } from './lib'
const isValid = isValidRTCConfiguration(config)
```

**特性**:
- ✅ 验证 ICE 服务器 URL 格式（stun/turn/turns）
- ✅ 验证认证凭据（username/credential）
- ✅ 验证传输策略（iceTransportPolicy/bundlePolicy）
- ✅ 自动清理无效配置
- ✅ 提供详细的验证错误信息
- ✅ 支持配置合并

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

集成了房间管理和对等方验证功能的完整 Composable：

```typescript
function useRoom(roomId: string) {
  return {
    // 状态
    messages: Ref<Message[]>
    peers: Ref<Peer[]>  // 包含验证状态
    currentUserId: Ref<string>
    currentUsername: Ref<string>
    isConnected: Ref<boolean>
    
    // 验证统计（计算属性）
    verifiedPeersCount: ComputedRef<number>
    verifyingPeersCount: ComputedRef<number>
    unverifiedPeersCount: ComputedRef<number>
    allPeersVerified: ComputedRef<boolean>
    
    // 房间方法
    joinRoom: () => Promise<void>
    sendChatMessage: (text: string) => void
    updateUsername: (name: string) => Promise<void>
    leaveRoom: () => void
    
    // 验证方法
    startVerification: (peerId: string) => Promise<void>
    getVerificationState: (peerId: string) => PeerVerificationState
    isVerified: (peerId: string) => boolean
    updatePeerVerificationState: (peerId: string) => void
  }
}
```

**Peer 接口**:
```typescript
interface Peer {
  peerId: string
  userId: string
  username: string
  publicKey: CryptoKey | null
  connectionType?: PeerConnectionType
  verificationState?: PeerVerificationState  // 验证状态
  isVerified?: boolean                       // 是否已验证
}
```

**特性**:
- ✅ 自动密钥管理和持久化
- ✅ 自动启动对等方验证
- ✅ 实时更新验证状态
- ✅ 集成连接类型检测
- ✅ 提供验证统计信息

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
