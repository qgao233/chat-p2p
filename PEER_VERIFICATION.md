# 对等方验证系统

## 🔐 概述

对等方验证系统实现了**精密的质询-响应协议**，防止中间人攻击，确保真实的对等方连接。

## 🎯 验证流程

### 质询-响应协议

```
对等方 A                                    对等方 B
    │                                          │
    ├─ 1. 生成随机令牌 (tokenA)                │
    │                                          │
    ├─ 2. 用 B 的公钥加密令牌                   │
    │    encryptedToken = encrypt(tokenA, pubKeyB)
    │                                          │
    ├─ 3. 发送加密令牌 ─────────────────────────►│
    │    [VERIFICATION_REQUEST]                │
    │                                          ├─ 4. 用私钥解密令牌
    │                                          │    tokenA' = decrypt(encryptedToken, privKeyB)
    │                                          │
    │◄─ 5. 发送解密令牌 ─────────────────────────┤
    │    [VERIFICATION_RESPONSE]               │
    │                                          │
    ├─ 6. 验证令牌                              │
    │    if tokenA === tokenA':                │
    │      状态 = VERIFIED ✅                   │
    │    else:                                 │
    │      状态 = UNVERIFIED ❌                 │
```

### 验证状态

```typescript
enum PeerVerificationState {
  VERIFYING = 'VERIFYING',     // 验证进行中
  VERIFIED = 'VERIFIED',       // 验证成功 ✅
  UNVERIFIED = 'UNVERIFIED',   // 验证失败或超时 ❌
}
```

## 🔑 核心组件

### 1. PeerVerificationManager

主验证管理器，负责整个验证流程。

**初始化**:
```typescript
import { PeerVerificationManager } from '@/lib'

const verificationManager = new PeerVerificationManager(peerRoom, {
  timeout: 30000,      // 验证超时（毫秒）
  tokenLength: 32,     // 令牌长度（字节）
  namespace: ActionNamespace.GROUP
})
```

**核心方法**:

#### `initiateVerification`
启动验证过程

```typescript
await verificationManager.initiateVerification(
  peerId,        // 对等方 ID
  publicKey,     // 对等方公钥
  privateKey     // 本地私钥
)
```

#### `registerPublicKey`
注册对等方公钥

```typescript
verificationManager.registerPublicKey(peerId, publicKey)
```

#### `getVerificationState`
获取验证状态

```typescript
const state = verificationManager.getVerificationState(peerId)
// VERIFYING | VERIFIED | UNVERIFIED
```

#### `isVerified`
检查是否已验证

```typescript
if (verificationManager.isVerified(peerId)) {
  console.log('对等方已验证 ✅')
}
```

#### `getVerifiedPeers`
获取所有已验证的对等方

```typescript
const verifiedPeers = verificationManager.getVerifiedPeers()
// ['peer-1', 'peer-2', ...]
```

### 2. 验证元数据

每个对等方的验证元数据：

```typescript
interface PeerVerificationMetadata {
  peerId: string                    // 对等方 ID
  state: PeerVerificationState      // 验证状态
  localToken: string                // 本地生成的令牌
  remoteToken?: string              // 远程令牌
  encryptedLocalToken?: string      // 加密后的本地令牌
  requestId: string                 // 请求 ID
  timestamp: number                 // 开始时间
  timeoutTimer?: NodeJS.Timeout     // 超时计时器
}
```

### 3. 操作类型

验证使用两种专用操作：

```typescript
PeerAction.VERIFICATION_REQUEST   // 发送加密令牌（质询）
PeerAction.VERIFICATION_RESPONSE  // 发送解密令牌（响应）
```

## 📝 使用示例

### 基础使用

```typescript
import { PeerRoom, PeerVerificationManager } from '@/lib'
import { encryption } from '@/services/encryption'

// 1. 创建房间
const peerRoom = new PeerRoom('room-123')

// 2. 创建验证管理器
const verificationManager = new PeerVerificationManager(peerRoom)

// 3. 生成本地密钥对
const keyPair = await encryption.generateKeyPair()

// 4. 监听对等方加入
peerRoom.onPeerJoin(PeerHookType.NEW_PEER, async (peerId) => {
  console.log('新对等方加入:', peerId)
  
  // 5. 获取对等方公钥（通过元数据交换）
  const peerPublicKey = await getPeerPublicKey(peerId)
  
  // 6. 启动验证
  await verificationManager.initiateVerification(
    peerId,
    peerPublicKey,
    keyPair.privateKey
  )
})

// 7. 定期检查验证状态
setInterval(() => {
  const verifiedPeers = verificationManager.getVerifiedPeers()
  console.log('已验证的对等方:', verifiedPeers)
}, 5000)
```

### Vue3 集成

使用 `useVerification` composable：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRoom } from '@/composables/useRoom'
import { useVerification } from '@/composables/useVerification'
import { PeerHookType } from '@/lib'

const roomId = 'room-123'
const peerRoom = ref(null)

// 房间管理
const { joinRoom, currentUserId, peers } = useRoom(roomId)

// 验证管理
const {
  verifiedPeers,
  verifiedCount,
  verifyingCount,
  allVerified,
  initialize,
  startVerification,
  isVerified
} = useVerification(peerRoom)

// 加入房间并初始化验证
const handleJoinRoom = async () => {
  await joinRoom()
  initialize()
  
  // 监听新对等方
  peerRoom.value?.onPeerJoin(PeerHookType.NEW_PEER, async (peerId) => {
    const peer = peers.value.find(p => p.peerId === peerId)
    if (peer && peer.publicKey) {
      // 获取本地私钥
      const privateKey = await getPrivateKey()
      
      // 启动验证
      await startVerification(peerId, peer.publicKey, privateKey)
    }
  })
}
</script>

<template>
  <div>
    <h3>验证状态</h3>
    <p>已验证: {{ verifiedCount }}</p>
    <p>验证中: {{ verifyingCount }}</p>
    <p>全部验证: {{ allVerified ? '✅' : '❌' }}</p>
    
    <ul>
      <li v-for="peer in verifiedPeers" :key="peer.peerId">
        {{ peer.peerId }}:
        <span v-if="peer.state === 'VERIFIED'" class="verified">✅ 已验证</span>
        <span v-else-if="peer.state === 'VERIFYING'" class="verifying">⏳ 验证中</span>
        <span v-else class="unverified">❌ 未验证</span>
      </li>
    </ul>
  </div>
</template>
```

### 完整验证流程

```typescript
import { PeerRoom, PeerVerificationManager, PeerHookType } from '@/lib'
import { encryption } from '@/services/encryption'

class SecureChatRoom {
  private peerRoom: PeerRoom
  private verificationManager: PeerVerificationManager
  private keyPair: CryptoKeyPair
  
  constructor(roomId: string) {
    this.peerRoom = new PeerRoom(roomId)
    this.verificationManager = new PeerVerificationManager(this.peerRoom)
  }
  
  async initialize() {
    // 生成密钥对
    this.keyPair = await encryption.generateKeyPair()
    
    // 监听对等方加入
    this.peerRoom.onPeerJoin(PeerHookType.NEW_PEER, async (peerId) => {
      await this.handlePeerJoin(peerId)
    })
    
    // 监听对等方离开
    this.peerRoom.onPeerLeave(PeerHookType.NEW_PEER, (peerId) => {
      this.verificationManager.removePeer(peerId)
    })
  }
  
  private async handlePeerJoin(peerId: string) {
    console.log(`[安全聊天] ${peerId} 加入，开始验证...`)
    
    // 1. 交换公钥（通过元数据）
    const { sendMetadata, onMetadata } = this.peerRoom.createMetadataAction()
    
    const publicKeyString = await encryption.stringifyCryptoKey(
      this.keyPair.publicKey
    )
    
    sendMetadata({
      userId: 'local-user',
      username: 'Alice',
      publicKey: publicKeyString
    }, peerId)
    
    // 2. 接收对等方公钥
    onMetadata(async (metadata, fromPeerId) => {
      if (fromPeerId === peerId) {
        const peerPublicKey = await encryption.parseCryptoKey(
          metadata.publicKey,
          'public'
        )
        
        // 3. 启动验证
        await this.verificationManager.initiateVerification(
          peerId,
          peerPublicKey,
          this.keyPair.privateKey
        )
        
        // 4. 等待验证完成
        setTimeout(() => {
          if (this.verificationManager.isVerified(peerId)) {
            console.log(`[安全聊天] ✅ ${peerId} 验证成功`)
            this.onPeerVerified(peerId)
          } else {
            console.warn(`[安全聊天] ❌ ${peerId} 验证失败`)
            this.onPeerVerificationFailed(peerId)
          }
        }, 5000)
      }
    })
  }
  
  private onPeerVerified(peerId: string) {
    console.log(`[安全聊天] ${peerId} 可以安全通信`)
    // 允许与该对等方通信
  }
  
  private onPeerVerificationFailed(peerId: string) {
    console.warn(`[安全聊天] ${peerId} 验证失败，阻止通信`)
    // 阻止与该对等方通信
  }
  
  async sendSecureMessage(text: string) {
    // 只发送给已验证的对等方
    const verifiedPeers = this.verificationManager.getVerifiedPeers()
    
    if (verifiedPeers.length === 0) {
      console.warn('[安全聊天] 没有已验证的对等方')
      return
    }
    
    const { sendMessage } = this.peerRoom.createMessageAction()
    
    verifiedPeers.forEach(peerId => {
      sendMessage({
        id: crypto.randomUUID(),
        userId: 'local-user',
        username: 'Alice',
        text,
        timestamp: Date.now()
      }, peerId)
    })
  }
}

// 使用
const chatRoom = new SecureChatRoom('room-123')
await chatRoom.initialize()
await chatRoom.sendSecureMessage('Hello secure world!')
```

## 🛡️ 安全特性

### 1. 防止中间人攻击

- ✅ 使用非对称加密（RSA-OAEP）
- ✅ 令牌只能用私钥解密
- ✅ 无法伪造验证响应

### 2. 防止重放攻击

- ✅ 每次验证生成新令牌
- ✅ 请求 ID 唯一性检查
- ✅ 时间戳验证

### 3. 超时保护

- ✅ 默认 30 秒超时
- ✅ 超时自动标记为未验证
- ✅ 防止挂起连接

### 4. 数据隔离

- ✅ 加密令牌专用操作（VERIFICATION_REQUEST）
- ✅ 原始令牌专用操作（VERIFICATION_RESPONSE）
- ✅ 防止数据泄露

## 📊 验证流程图

```
┌─────────────────────────────────────────────────────────┐
│                  对等方验证流程                          │
└─────────────────────────────────────────────────────────┘

对等方 A                      验证管理器                  对等方 B
    │                             │                          │
    ├─ 加入房间 ──────────────────►│                          │
    │                             │◄───────────────── 加入房间 ┤
    │                             │                          │
    ├─ 交换公钥 ◄─────────────────┼─────────────────► 交换公钥 ┤
    │                             │                          │
    ├─ 生成令牌 A                 │                 生成令牌 B ┤
    │    tokenA = random()        │      tokenB = random()   │
    │                             │                          │
    ├─ 加密令牌 A                 │                 加密令牌 B ┤
    │    encrypt(tokenA, pubB)    │      encrypt(tokenB, pubA)
    │                             │                          │
    ├─ 发送加密令牌 ──────────────►│──────────────► 接收加密令牌 ┤
    │    [VERIFICATION_REQUEST]   │                          │
    │                             │                          ├─ 解密令牌 A
    │                             │                          │   decrypt(encrypted, privB)
    │                             │                          │
    │◄─ 接收解密令牌 ◄─────────────┼────────────── 发送解密令牌 ┤
    │    [VERIFICATION_RESPONSE]  │                          │
    │                             │                          │
    ├─ 验证令牌                   │                  验证令牌 ┤
    │    tokenA === received?     │      tokenB === received?
    │                             │                          │
    ├─ ✅ VERIFIED                │               ✅ VERIFIED ┤
    │                             │                          │
    └─ 安全通信 ◄─────────────────┼──────────────► 安全通信 ┘
```

## 🎯 最佳实践

### 1. 始终验证对等方

```typescript
const { sendMessage } = peerRoom.createMessageAction()

// ❌ 不好：发送给所有对等方
sendMessage(message)

// ✅ 好：只发送给已验证的对等方
const verifiedPeers = verificationManager.getVerifiedPeers()
verifiedPeers.forEach(peerId => {
  sendMessage(message, peerId)
})
```

### 2. 处理验证失败

```typescript
peerRoom.onPeerJoin(PeerHookType.NEW_PEER, async (peerId) => {
  await verificationManager.initiateVerification(peerId, publicKey, privateKey)
  
  setTimeout(() => {
    if (!verificationManager.isVerified(peerId)) {
      console.warn(`${peerId} 验证失败，断开连接`)
      // 可选：断开该对等方
    }
  }, 35000) // 超时 + 5秒缓冲
})
```

### 3. 定期检查验证状态

```typescript
setInterval(() => {
  const peers = peerRoom.getPeers()
  peers.forEach(peerId => {
    const state = verificationManager.getVerificationState(peerId)
    if (state === PeerVerificationState.UNVERIFIED) {
      console.warn(`${peerId} 未验证，限制通信`)
    }
  })
}, 10000)
```

### 4. UI 显示验证状态

```vue
<template>
  <div v-for="peer in peers" :key="peer.peerId" class="peer-item">
    <span class="peer-name">{{ peer.username }}</span>
    <span 
      v-if="isVerified(peer.peerId)" 
      class="badge verified"
      title="已验证"
    >
      🔒 验证
    </span>
    <span 
      v-else 
      class="badge unverified"
      title="未验证"
    >
      ⚠️ 未验证
    </span>
  </div>
</template>
```

## 🔧 配置选项

```typescript
interface VerificationConfig {
  timeout?: number        // 验证超时（毫秒），默认 30000
  tokenLength?: number    // 令牌长度（字节），默认 32
  namespace?: ActionNamespace  // 命名空间，默认 GROUP
}

// 自定义配置
const verificationManager = new PeerVerificationManager(peerRoom, {
  timeout: 60000,     // 60 秒超时
  tokenLength: 64,    // 64 字节令牌（更安全）
  namespace: ActionNamespace.DIRECT_MESSAGE
})
```

## 📚 API 参考

### PeerVerificationManager

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `initiateVerification` | `peerId, publicKey, privateKey` | `Promise<void>` | 启动验证 |
| `registerPublicKey` | `peerId, publicKey` | `void` | 注册公钥 |
| `getVerificationState` | `peerId` | `PeerVerificationState` | 获取状态 |
| `isVerified` | `peerId` | `boolean` | 检查验证 |
| `getVerifiedPeers` | - | `string[]` | 已验证列表 |
| `getVerificationMetadata` | `peerId` | `PeerVerificationMetadata?` | 获取元数据 |
| `removePeer` | `peerId` | `void` | 移除对等方 |
| `cleanup` | - | `void` | 清理所有 |

## 🎉 总结

对等方验证系统提供了：

- ✅ **质询-响应协议** - 防止中间人攻击
- ✅ **非对称加密** - RSA-OAEP 2048位
- ✅ **状态管理** - 3种验证状态
- ✅ **超时保护** - 自动超时机制
- ✅ **Vue3 集成** - 便捷的 composable
- ✅ **完整文档** - 详尽的使用说明

这是一个**安全、可靠、易用**的对等方验证系统！🔒

