# PeerRoom 快速参考指南

## 🚀 快速开始

### 安装依赖
```bash
npm install trystero uuid localforage
```

### 基础使用

```typescript
import { PeerRoom, ActionNamespace, PeerHookType } from '@/lib'

// 1. 创建房间
const peerRoom = new PeerRoom('room-123', {
  appId: 'my-app',
  rtcConfig: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  }
})

// 2. 监听事件
peerRoom.onPeerJoin(PeerHookType.NEW_PEER, (peerId) => {
  console.log('用户加入:', peerId)
})

// 3. 创建消息通道
const { sendMessage, onMessage } = peerRoom.createMessageAction()

// 4. 发送消息
sendMessage({
  id: uuid(),
  userId: 'user-123',
  username: 'Alice',
  text: 'Hello!',
  timestamp: Date.now()
})

// 5. 接收消息
onMessage((message, peerId) => {
  console.log(`${message.username}: ${message.text}`)
})

// 6. 清理
peerRoom.leave()
```

## 📚 核心概念

### 1. 命名空间
```typescript
ActionNamespace.GROUP          // 群组消息
ActionNamespace.DIRECT_MESSAGE // 直接消息
```

### 2. 钩子类型
```typescript
PeerHookType.NEW_PEER    // 基础连接
PeerHookType.AUDIO       // 音频流
PeerHookType.VIDEO       // 视频流
PeerHookType.SCREEN      // 屏幕共享
PeerHookType.FILE_SHARE  // 文件传输
```

### 3. 操作类型（14 种）
```typescript
PeerAction.MESSAGE                 // 文本消息
PeerAction.MEDIA_MESSAGE          // 媒体分享
PeerAction.PEER_METADATA          // 用户信息
PeerAction.TYPING_STATUS_CHANGE   // 输入状态
PeerAction.AUDIO_CHANGE           // 音频状态
PeerAction.VIDEO_CHANGE           // 视频状态
PeerAction.SCREEN_SHARE           // 屏幕共享
PeerAction.FILE_OFFER             // 文件传输
PeerAction.MESSAGE_TRANSCRIPT     // 消息记录
PeerAction.VERIFICATION_REQUEST   // 验证请求
PeerAction.VERIFICATION_RESPONSE  // 验证响应
PeerAction.PEER_NAME_CHANGE       // 用户名变更
PeerAction.ROOM_JOIN              // 加入房间
PeerAction.ROOM_LEAVE             // 离开房间
```

### 4. 流类型
```typescript
PeerStreamType.AUDIO   // 音频流
PeerStreamType.VIDEO   // 视频流
PeerStreamType.SCREEN  // 屏幕流
```

## 🎯 常用 API

### 事件管理

```typescript
// 注册事件
peerRoom.onPeerJoin(PeerHookType.NEW_PEER, handler)
peerRoom.onPeerLeave(PeerHookType.NEW_PEER, handler)
peerRoom.onPeerStream(PeerHookType.VIDEO, handler)

// 移除事件
peerRoom.offPeerJoin(PeerHookType.NEW_PEER)
peerRoom.offPeerLeave(PeerHookType.NEW_PEER)
peerRoom.offPeerStream(PeerHookType.VIDEO)
```

### 消息操作

```typescript
// 文本消息
const { sendMessage, onMessage } = peerRoom.createMessageAction()

// 用户元数据
const { sendMetadata, onMetadata } = peerRoom.createMetadataAction()

// 输入状态
const { sendTyping, onTyping } = peerRoom.createTypingAction()

// 媒体消息
const { sendMedia, onMedia } = peerRoom.createMediaAction()
```

### 音视频操作

```typescript
// 音频状态
const { sendAudioChange, onAudioChange } = peerRoom.createAudioChangeAction()
sendAudioChange({ isEnabled: true })

// 视频状态
const { sendVideoChange, onVideoChange } = peerRoom.createVideoChangeAction()
sendVideoChange({ isEnabled: true })

// 屏幕共享
const { sendScreenShare, onScreenShare } = peerRoom.createScreenShareAction()
sendScreenShare({ isSharing: true })
```

### 流管理

```typescript
// 添加流
const stream = await navigator.mediaDevices.getUserMedia({ video: true })
peerRoom.addStream(stream, undefined, { type: PeerStreamType.VIDEO })

// 移除流
peerRoom.removeStream(stream)

// 监听流
peerRoom.onPeerStream(PeerHookType.VIDEO, (stream, peerId, metadata) => {
  videoElement.srcObject = stream
})
```

### 文件传输

```typescript
// 文件传输
const { sendFileOffer, onFileOffer } = peerRoom.createFileOfferAction()

sendFileOffer({
  id: uuid(),
  fileName: 'document.pdf',
  fileSize: 1024000,
  fileType: 'application/pdf'
})

onFileOffer((offer, peerId) => {
  console.log(`收到文件: ${offer.fileName}`)
})
```

### 连接分析

```typescript
// 获取连接类型
const types = await peerRoom.getPeerConnectionTypes()
// { 'peer-id': 'DIRECT' } 或 { 'peer-id': 'RELAY' }

// 获取所有 peers
const peers = peerRoom.getPeers()
// ['peer-1', 'peer-2', ...]
```

### 清理

```typescript
// 清空所有事件
peerRoom.flush()

// 清空特定类型
peerRoom.flushHookType(PeerHookType.VIDEO)

// 离开房间
peerRoom.leave()
```

## 🔧 高级用法

### 直接消息（一对一）

```typescript
const { sendMessage, onMessage } = peerRoom.createMessageAction(
  ActionNamespace.DIRECT_MESSAGE
)

// 发送给特定 peer
sendMessage(message, targetPeerId)
```

### 自定义操作

```typescript
const [send, receive, progress, cleanup] = peerRoom.makeAction<MyData>(
  PeerAction.MESSAGE,
  ActionNamespace.GROUP
)

send({ myField: 'value' })
receive((data, peerId) => {
  console.log(data.myField)
})
```

### 验证流程

```typescript
// 发送验证请求
const { sendVerifyRequest, onVerifyRequest } = 
  peerRoom.createVerificationRequestAction()

sendVerifyRequest({
  requestId: uuid(),
  challenge: 'random-string'
})

// 响应验证
const { sendVerifyResponse, onVerifyResponse } = 
  peerRoom.createVerificationResponseAction()

onVerifyRequest((request, peerId) => {
  sendVerifyResponse({
    requestId: request.requestId,
    response: signChallenge(request.challenge),
    verified: 'true'
  }, peerId)
})
```

### 用户名变更

```typescript
const { sendNameChange, onNameChange } = 
  peerRoom.createPeerNameChangeAction()

sendNameChange({
  userId: 'user-123',
  newName: 'New Name'
})

onNameChange((change, peerId) => {
  updateUserName(peerId, change.newName)
})
```

### 房间通知

```typescript
// 加入通知
const { sendRoomJoin, onRoomJoin } = peerRoom.createRoomJoinAction()
sendRoomJoin({
  userId: 'user-123',
  username: 'Alice',
  timestamp: Date.now()
})

// 离开通知
const { sendRoomLeave, onRoomLeave } = peerRoom.createRoomLeaveAction()
sendRoomLeave({
  userId: 'user-123',
  username: 'Alice',
  timestamp: Date.now()
})
```

## 🎨 Vue3 集成

```typescript
import { ref, onMounted, onUnmounted } from 'vue'
import { PeerRoom, PeerHookType } from '@/lib'

export const useChat = (roomId: string) => {
  const messages = ref([])
  const peers = ref([])
  let peerRoom: PeerRoom | null = null

  onMounted(() => {
    peerRoom = new PeerRoom(roomId)

    // 监听用户
    peerRoom.onPeerJoin(PeerHookType.NEW_PEER, (peerId) => {
      peers.value.push(peerId)
    })

    peerRoom.onPeerLeave(PeerHookType.NEW_PEER, (peerId) => {
      peers.value = peers.value.filter(p => p !== peerId)
    })

    // 监听消息
    const { sendMessage, onMessage } = peerRoom.createMessageAction()
    onMessage((msg) => {
      messages.value.push(msg)
    })
  })

  onUnmounted(() => {
    peerRoom?.leave()
  })

  return { messages, peers }
}
```

## 🛡️ RTC 配置验证

```typescript
import {
  isValidRTCConfiguration,
  sanitizeRTCConfiguration,
  createDefaultRTCConfiguration,
  mergeRTCConfiguration
} from '@/lib'

// 快速验证
if (isValidRTCConfiguration(config)) {
  // 使用配置
}

// 清理配置
const clean = sanitizeRTCConfiguration(config)

// 默认配置
const defaultConfig = createDefaultRTCConfiguration()

// 合并配置
const merged = mergeRTCConfiguration(userConfig, defaultConfig)
```

## 📊 类型定义

### Message
```typescript
interface Message {
  id: string
  userId: string
  username: string
  text: string
  timestamp: number
}
```

### UserMetadata
```typescript
interface UserMetadata {
  userId: string
  username: string
  publicKey: string
}
```

### FileOffer
```typescript
interface FileOffer {
  id: string
  fileName: string
  fileSize: number
  fileType: string
}
```

## 🔗 相关文档

- [架构重构文档](./ARCHITECTURE_REFACTOR.md) - 详细架构说明
- [架构检查清单](./ARCHITECTURE_CHECKLIST.md) - 完整性检查
- [连接状态管理](./CONNECTION_STATE.md) - 事件钩子系统
- [README](./README.md) - 项目介绍

## 💡 最佳实践

### 1. 始终清理资源
```typescript
onUnmounted(() => {
  peerRoom.leave()
})
```

### 2. 使用类型化钩子
```typescript
// ✅ 好
peerRoom.onPeerJoin(PeerHookType.NEW_PEER, handler)

// ❌ 避免直接使用字符串
```

### 3. 使用命名空间隔离
```typescript
// 群组消息
const groupMsg = peerRoom.createMessageAction(ActionNamespace.GROUP)

// 直接消息
const dmMsg = peerRoom.createMessageAction(ActionNamespace.DIRECT_MESSAGE)
```

### 4. 错误处理
```typescript
try {
  const types = await peerRoom.getPeerConnectionTypes()
} catch (error) {
  console.error('获取连接类型失败:', error)
}
```

### 5. 流管理
```typescript
// 添加流时提供元数据
peerRoom.addStream(stream, undefined, { type: PeerStreamType.VIDEO })

// 监听流时检查元数据
peerRoom.onPeerStream(PeerHookType.VIDEO, (stream, peerId, metadata) => {
  if (metadata?.type === PeerStreamType.VIDEO) {
    // 处理视频流
  }
})
```

## 🎯 总结

PeerRoom 提供了：
- ✅ 28 个公共 API 方法
- ✅ 14 种操作类型
- ✅ 5 种钩子类型
- ✅ 完整的类型安全
- ✅ 灵活的命名空间
- ✅ 强大的流管理
- ✅ 连接类型检测
- ✅ RTC 配置验证

**开始使用，享受 P2P 通信的乐趣！** 🚀

