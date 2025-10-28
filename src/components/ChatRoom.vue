<template>
  <div class="chat-room">
    <!-- 头部 -->
    <div class="chat-header">
      <h2>🔐 P2P 聊天室</h2>
      <div class="room-info">
        <span class="room-id">房间: {{ roomId }}</span>
        <span class="online-count">在线: {{ peers.length + 1 }}</span>
      </div>
      <div class="header-actions">
        <button class="btn-icon" @click="copyRoomLink" title="复制房间链接">
          📋
        </button>
        <button class="btn-icon btn-danger" @click="handleLeaveRoom" title="离开房间">
          🚪
        </button>
      </div>
    </div>

    <!-- 左侧边栏 - 用户列表 -->
    <div class="chat-sidebar">
      <div class="user-list">
        <h3>在线用户</h3>
        <!-- 自己 -->
        <div class="user-item me">
          <div class="user-avatar">👤</div>
          <div class="user-info">
            <div class="username">{{ currentUsername }} (你)</div>
            <div class="user-id">{{ currentUserId.slice(0, 8) }}</div>
          </div>
        </div>
        <!-- 其他用户 -->
        <div v-for="peer in peers" :key="peer.peerId" class="user-item">
          <div class="user-avatar">👥</div>
          <div class="user-info">
            <div class="username">
              {{ peer.username }}
              <span v-if="peer.connectionType" class="connection-badge" :class="peer.connectionType">
                {{ peer.connectionType === 'DIRECT' ? '🔗' : '🔄' }}
              </span>
            </div>
            <div class="user-id">{{ peer.userId.slice(0, 8) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主要内容区 -->
    <div class="chat-main">
      <!-- 消息列表 -->
      <div class="messages" ref="messagesContainer">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['message', msg.userId === currentUserId ? 'message-own' : 'message-peer']"
        >
          <div class="message-header">
            <span class="message-username">{{ msg.username }}</span>
            <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
          </div>
          <div class="message-content">{{ msg.text }}</div>
        </div>
      </div>

      <!-- 输入框 -->
      <div class="message-input">
        <input
          v-model="messageText"
          @keyup.enter="handleSend"
          type="text"
          placeholder="输入消息... (按 Enter 发送)"
          :disabled="!isConnected"
        />
        <button @click="handleSend" :disabled="!isConnected || !messageText.trim()">
          发送
        </button>
      </div>
    </div>

    <!-- 右侧边栏 - 媒体控制 -->
    <div class="media-sidebar">
      <MediaControls :media="media" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoom } from '../composables/useRoom'
import MediaControls from './MediaControls.vue'

const props = defineProps<{
  roomId: string
}>()

const emit = defineEmits<{
  leave: []
}>()

const {
  messages,
  peers,
  currentUserId,
  currentUsername,
  isConnected,
  joinRoom,
  sendChatMessage,
  leaveRoom,
  media,
} = useRoom(props.roomId)

const messageText = ref('')
const messagesContainer = ref<HTMLElement | null>(null)

// 组件挂载时加入房间
onMounted(() => {
  console.log('[ChatRoom] 组件已挂载，加入房间')
  joinRoom()
})

// 组件卸载前离开房间
onBeforeUnmount(() => {
  console.log('[ChatRoom] 组件即将卸载，离开房间')
  leaveRoom()
})

// 发送消息
const handleSend = () => {
  if (messageText.value.trim()) {
    sendChatMessage(messageText.value)
    messageText.value = ''
    scrollToBottom()
  }
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 监听新消息，自动滚动
watch(messages, () => {
  scrollToBottom()
})

// 复制房间链接
const copyRoomLink = () => {
  const url = new URL(window.location.href)
  url.searchParams.set('room', props.roomId)
  navigator.clipboard.writeText(url.toString())
  alert('房间链接已复制！')
}

// 离开房间
const handleLeaveRoom = () => {
  leaveRoom()
  emit('leave')
}
</script>

<style scoped>
.chat-room {
  display: grid;
  grid-template-columns: 250px 1fr 80px;
  grid-template-rows: 60px 1fr;
  height: 100vh;
  background: #f5f5f5;
}

.chat-header {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  gap: 20px;
}

.chat-header h2 {
  margin: 0;
  font-size: 20px;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.btn-icon {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  font-size: 18px;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.btn-icon:hover {
  transform: scale(1.1);
  background: rgba(255, 255, 255, 0.3);
}

.btn-danger:hover {
  background: rgba(255, 59, 48, 0.3);
}

.room-info {
  display: flex;
  gap: 20px;
  font-size: 14px;
}

.room-id {
  opacity: 0.9;
}

.online-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
}

.chat-sidebar {
  background: white;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
}

.user-list {
  padding: 20px;
}

.media-sidebar {
  background: white;
  border-left: 1px solid #e0e0e0;
  overflow: hidden;
}

.user-list h3 {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #666;
  text-transform: uppercase;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: #f8f8f8;
}

.user-item.me {
  background: linear-gradient(135deg, #667eea22 0%, #764ba222 100%);
  border: 1px solid #667eea44;
}

.user-avatar {
  font-size: 24px;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.username {
  font-weight: 600;
  font-size: 14px;
  color: #333;
}

.user-id {
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.connection-badge {
  font-size: 10px;
  margin-left: 4px;
  opacity: 0.7;
}

.connection-badge.DIRECT {
  opacity: 1;
}

.connection-badge.RELAY {
  opacity: 0.6;
}

.chat-main {
  display: flex;
  flex-direction: column;
  background: white;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-own {
  align-self: flex-end;
}

.message-peer {
  align-self: flex-start;
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
}

.message-username {
  font-weight: 600;
  color: #667eea;
}

.message-time {
  color: #999;
}

.message-content {
  padding: 12px 16px;
  border-radius: 12px;
  word-wrap: break-word;
  line-height: 1.5;
}

.message-own .message-content {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message-peer .message-content {
  background: #f0f0f0;
  color: #333;
  border-bottom-left-radius: 4px;
}

.message-input {
  display: flex;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background: white;
}

.message-input input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.message-input input:focus {
  border-color: #667eea;
}

.message-input input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.message-input button {
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
}

.message-input button:hover:not(:disabled) {
  transform: translateY(-2px);
}

.message-input button:active:not(:disabled) {
  transform: translateY(0);
}

.message-input button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

