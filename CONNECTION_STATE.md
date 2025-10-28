# 连接状态管理系统

## 概述

连接状态管理系统通过**多种处理程序类型**维护全面的连接状态，允许不同场景的事件处理程序独立管理，互不干扰。

## 对等方事件钩子类型

### `PeerHookType` 枚举

```typescript
export enum PeerHookType {
  NEW_PEER = 'NEW_PEER',           // 新对等方加入房间时触发
  AUDIO = 'AUDIO',                 // 管理音频流事件
  VIDEO = 'VIDEO',                 // 管理视频流事件
  SCREEN = 'SCREEN',               // 管理屏幕共享事件
  FILE_SHARE = 'FILE_SHARE',       // 处理文件传输启动
}
```

### 钩子类型说明

| 钩子类型 | 用途 | 触发时机 |
|---------|------|----------|
| `NEW_PEER` | 基础连接管理 | 新用户加入/离开房间 |
| `AUDIO` | 音频流管理 | 音频流添加/移除 |
| `VIDEO` | 视频流管理 | 视频流添加/移除 |
| `SCREEN` | 屏幕共享管理 | 屏幕共享开始/结束 |
| `FILE_SHARE` | 文件传输管理 | 文件传输发起/完成 |

## 架构设计

### 存储结构

```typescript
class PeerRoom {
  // 使用 Map<HookType, Set<Handler>> 存储不同类型的处理程序
  private peerJoinHandlers: Map<PeerHookType, Set<PeerJoinHandler>>
  private peerLeaveHandlers: Map<PeerHookType, Set<PeerLeaveHandler>>
  private peerStreamHandlers: Map<PeerHookType, Set<PeerStreamHandler>>
}
```

**优势**:
- ✅ **类型隔离** - 不同类型的处理程序互不干扰
- ✅ **独立管理** - 可以单独添加/移除某类型的处理程序
- ✅ **多处理程序** - 同一类型可以注册多个处理程序
- ✅ **易于清理** - 可以按类型批量清理

### 事件流转

```
WebRTC 事件
    ↓
Trystero Room
    ↓
PeerRoom 统一分发
    ↓
┌───────┬───────┬───────┬───────┬───────┐
│NEW_PEER│AUDIO │VIDEO │SCREEN │FILE_SHARE│
└───┬───┴───┬───┴───┬───┴───┬───┴───┬───┘
    │       │       │       │       │
  Set<H>  Set<H>  Set<H>  Set<H>  Set<H>
    │       │       │       │       │
  执行    执行    执行    执行    执行
```

## 核心 API

### 1. 注册事件监听器

#### `onPeerJoin` - 监听用户加入

```typescript
onPeerJoin(hookType: PeerHookType, handler: (peerId: string) => void)
```

**示例**:
```typescript
// 基础连接管理
peerRoom.onPeerJoin(PeerHookType.NEW_PEER, (peerId) => {
  console.log('新用户加入:', peerId)
  // 发送欢迎消息、同步状态等
})

// 视频流管理
peerRoom.onPeerJoin(PeerHookType.VIDEO, (peerId) => {
  console.log('准备接收视频流:', peerId)
  // 初始化视频显示区域
})

// 文件传输管理
peerRoom.onPeerJoin(PeerHookType.FILE_SHARE, (peerId) => {
  console.log('文件传输通道就绪:', peerId)
  // 初始化文件传输UI
})
```

#### `onPeerLeave` - 监听用户离开

```typescript
onPeerLeave(hookType: PeerHookType, handler: (peerId: string) => void)
```

**示例**:
```typescript
// 基础连接管理
peerRoom.onPeerLeave(PeerHookType.NEW_PEER, (peerId) => {
  console.log('用户离开:', peerId)
  // 清理用户数据
})

// 视频流管理
peerRoom.onPeerLeave(PeerHookType.VIDEO, (peerId) => {
  console.log('视频流断开:', peerId)
  // 移除视频显示
})
```

#### `onPeerStream` - 监听流事件

```typescript
onPeerStream(hookType: PeerHookType, handler: (stream: MediaStream, peerId: string, metadata?: any) => void)
```

**示例**:
```typescript
// 音频流处理
peerRoom.onPeerStream(PeerHookType.AUDIO, (stream, peerId, metadata) => {
  console.log('收到音频流:', peerId)
  const audioElement = new Audio()
  audioElement.srcObject = stream
  audioElement.play()
})

// 视频流处理
peerRoom.onPeerStream(PeerHookType.VIDEO, (stream, peerId, metadata) => {
  console.log('收到视频流:', peerId)
  const videoElement = document.getElementById(`video-${peerId}`)
  videoElement.srcObject = stream
})

// 屏幕共享处理
peerRoom.onPeerStream(PeerHookType.SCREEN, (stream, peerId, metadata) => {
  console.log('收到屏幕共享:', peerId)
  const screenElement = document.getElementById('screen-share')
  screenElement.srcObject = stream
})
```

### 2. 移除事件监听器

#### `offPeerJoin` - 移除加入监听器

```typescript
offPeerJoin(hookType: PeerHookType)
```

#### `offPeerLeave` - 移除离开监听器

```typescript
offPeerLeave(hookType: PeerHookType)
```

#### `offPeerStream` - 移除流监听器

```typescript
offPeerStream(hookType: PeerHookType)
```

**示例**:
```typescript
// 停止视频功能时清理相关监听器
const stopVideo = () => {
  peerRoom.offPeerJoin(PeerHookType.VIDEO)
  peerRoom.offPeerLeave(PeerHookType.VIDEO)
  peerRoom.offPeerStream(PeerHookType.VIDEO)
}
```

### 3. 批量清理

#### `flush` - 清空所有监听器

```typescript
flush()
```

#### `flushHookType` - 清空特定类型

```typescript
flushHookType(hookType: PeerHookType)
```

**示例**:
```typescript
// 清空所有文件传输相关的监听器
peerRoom.flushHookType(PeerHookType.FILE_SHARE)
```

## 使用场景

### 场景 1: 基础聊天功能

```typescript
const setupBasicChat = (peerRoom: PeerRoom) => {
  // 用户加入
  peerRoom.onPeerJoin(PeerHookType.NEW_PEER, async (peerId) => {
    // 发送用户元数据
    await sendMetadata(peerId)
    
    // 显示通知
    showNotification(`${peerId} 加入了房间`)
  })

  // 用户离开
  peerRoom.onPeerLeave(PeerHookType.NEW_PEER, (peerId) => {
    // 移除用户
    removePeer(peerId)
    
    // 显示通知
    showNotification(`${peerId} 离开了房间`)
  })
}
```

### 场景 2: 视频通话功能

```typescript
const setupVideoChat = (peerRoom: PeerRoom) => {
  // 用户加入 - 准备视频UI
  peerRoom.onPeerJoin(PeerHookType.VIDEO, (peerId) => {
    createVideoElement(peerId)
  })

  // 接收视频流
  peerRoom.onPeerStream(PeerHookType.VIDEO, (stream, peerId) => {
    const videoElement = document.getElementById(`video-${peerId}`)
    videoElement.srcObject = stream
    videoElement.play()
  })

  // 用户离开 - 清理视频UI
  peerRoom.onPeerLeave(PeerHookType.VIDEO, (peerId) => {
    removeVideoElement(peerId)
  })

  // 发送本地视频流
  const startVideo = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    peerRoom.addStream(stream, undefined, { type: PeerStreamType.VIDEO })
  }
}
```

### 场景 3: 屏幕共享功能

```typescript
const setupScreenShare = (peerRoom: PeerRoom) => {
  // 接收屏幕共享流
  peerRoom.onPeerStream(PeerHookType.SCREEN, (stream, peerId) => {
    const screenElement = document.getElementById('screen-share')
    screenElement.srcObject = stream
    screenElement.style.display = 'block'
  })

  // 屏幕共享结束
  peerRoom.onPeerLeave(PeerHookType.SCREEN, (peerId) => {
    const screenElement = document.getElementById('screen-share')
    screenElement.srcObject = null
    screenElement.style.display = 'none'
  })

  // 开始屏幕共享
  const startScreenShare = async () => {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    peerRoom.addStream(stream, undefined, { type: PeerStreamType.SCREEN })
    
    // 监听用户停止共享
    stream.getVideoTracks()[0].onended = () => {
      peerRoom.removeStream(stream)
    }
  }
}
```

### 场景 4: 文件传输功能

```typescript
const setupFileShare = (peerRoom: PeerRoom) => {
  // 用户加入 - 初始化文件传输通道
  peerRoom.onPeerJoin(PeerHookType.FILE_SHARE, (peerId) => {
    initFileTransferChannel(peerId)
  })

  // 用户离开 - 清理文件传输
  peerRoom.onPeerLeave(PeerHookType.FILE_SHARE, (peerId) => {
    cleanupFileTransfer(peerId)
  })

  // 发送文件
  const sendFile = (file: File, targetPeerId: string) => {
    // 使用 FILE_OFFER 操作
    const [sendOffer] = peerRoom.makeAction(
      PeerAction.FILE_OFFER,
      ActionNamespace.DIRECT_MESSAGE
    )
    
    sendOffer({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    }, targetPeerId)
  }
}
```

## 完整示例

### Vue3 组件集成

```typescript
import { onMounted, onUnmounted } from 'vue'
import { PeerRoom, PeerHookType, PeerStreamType } from './lib/PeerRoom'

export const useVideoChat = (roomId: string) => {
  let peerRoom: PeerRoom | null = null
  const videoElements = new Map<string, HTMLVideoElement>()

  onMounted(() => {
    peerRoom = new PeerRoom(roomId, { rtcConfig })

    // 基础连接
    peerRoom.onPeerJoin(PeerHookType.NEW_PEER, (peerId) => {
      console.log('用户加入:', peerId)
    })

    peerRoom.onPeerLeave(PeerHookType.NEW_PEER, (peerId) => {
      console.log('用户离开:', peerId)
    })

    // 视频流
    peerRoom.onPeerJoin(PeerHookType.VIDEO, (peerId) => {
      const videoEl = document.createElement('video')
      videoEl.id = `video-${peerId}`
      videoEl.autoplay = true
      document.body.appendChild(videoEl)
      videoElements.set(peerId, videoEl)
    })

    peerRoom.onPeerStream(PeerHookType.VIDEO, (stream, peerId) => {
      const videoEl = videoElements.get(peerId)
      if (videoEl) {
        videoEl.srcObject = stream
      }
    })

    peerRoom.onPeerLeave(PeerHookType.VIDEO, (peerId) => {
      const videoEl = videoElements.get(peerId)
      if (videoEl) {
        videoEl.remove()
        videoElements.delete(peerId)
      }
    })
  })

  onUnmounted(() => {
    if (peerRoom) {
      peerRoom.leave()
    }
  })

  const startVideo = async () => {
    if (!peerRoom) return
    
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    peerRoom.addStream(stream, undefined, { type: PeerStreamType.VIDEO })
  }

  const stopVideo = () => {
    if (!peerRoom) return
    
    // 清理视频相关的所有监听器
    peerRoom.flushHookType(PeerHookType.VIDEO)
  }

  return {
    startVideo,
    stopVideo
  }
}
```

## 最佳实践

### 1. 按功能模块组织

```typescript
// 将不同功能的监听器分开管理
const setupChat = (peerRoom: PeerRoom) => {
  peerRoom.onPeerJoin(PeerHookType.NEW_PEER, handleChatJoin)
  peerRoom.onPeerLeave(PeerHookType.NEW_PEER, handleChatLeave)
}

const setupVideo = (peerRoom: PeerRoom) => {
  peerRoom.onPeerJoin(PeerHookType.VIDEO, handleVideoJoin)
  peerRoom.onPeerStream(PeerHookType.VIDEO, handleVideoStream)
  peerRoom.onPeerLeave(PeerHookType.VIDEO, handleVideoLeave)
}

const setupAudio = (peerRoom: PeerRoom) => {
  peerRoom.onPeerJoin(PeerHookType.AUDIO, handleAudioJoin)
  peerRoom.onPeerStream(PeerHookType.AUDIO, handleAudioStream)
  peerRoom.onPeerLeave(PeerHookType.AUDIO, handleAudioLeave)
}
```

### 2. 及时清理资源

```typescript
// 功能禁用时清理相关监听器
const disableVideo = () => {
  peerRoom.offPeerJoin(PeerHookType.VIDEO)
  peerRoom.offPeerLeave(PeerHookType.VIDEO)
  peerRoom.offPeerStream(PeerHookType.VIDEO)
}

// 组件卸载时清理所有
onUnmounted(() => {
  peerRoom.flush()
  peerRoom.leave()
})
```

### 3. 错误处理

```typescript
peerRoom.onPeerStream(PeerHookType.VIDEO, (stream, peerId, metadata) => {
  try {
    if (!stream.active) {
      console.warn('收到非活动流')
      return
    }
    
    // 处理流...
  } catch (error) {
    console.error('处理视频流失败:', error)
  }
})
```

### 4. 类型安全

```typescript
// 使用枚举确保类型安全
peerRoom.onPeerJoin(PeerHookType.VIDEO, (peerId) => {
  // TypeScript 会检查类型
})

// ❌ 错误：字符串不是 PeerHookType
// peerRoom.onPeerJoin('video', handler)
```

## 性能考虑

### 优势
- ✅ **高效分发** - 只触发相关类型的处理程序
- ✅ **内存优化** - 使用 Set 避免重复
- ✅ **按需清理** - 可以单独清理某类型

### 注意事项
- ⚠️ **避免过多处理程序** - 同一类型不要注册太多
- ⚠️ **及时移除** - 不用的处理程序要及时清理
- ⚠️ **异步处理** - 处理程序中的异步操作要妥善处理

## 总结

连接状态管理系统通过**类型化的事件钩子**提供了：

1. ✅ **清晰的职责分离** - 不同功能使用不同钩子类型
2. ✅ **灵活的管理** - 可以独立添加/移除/清理
3. ✅ **类型安全** - TypeScript 枚举保证类型正确
4. ✅ **易于扩展** - 添加新功能只需新增钩子类型

这是一个**强大、灵活、类型安全**的连接状态管理系统！🚀

