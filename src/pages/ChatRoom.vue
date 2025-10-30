<template>
  <div class="chat-room">
    <!-- 头部 -->
    <div class="chat-header">
      <h2>🔐 P2P 聊天室</h2>
      <div class="room-info">
        <span class="room-id">房间: {{ roomId }}</span>
        <span class="online-count">在线: {{ peers.length + 1 }}</span>
        <button class="username-display" @click="showUsernameDialog = true" title="点击修改用户名">
          👤 {{ currentUsername }}
        </button>
      </div>
      <div class="header-actions">
        <button class="btn-icon" @click="copyRoomLink" title="复制房间号">
          📋
        </button>
        <button class="btn-icon btn-danger" @click="handleLeaveRoom" title="离开房间">
          🚪
        </button>
      </div>
    </div>

    <!-- 修改用户名对话框 -->
    <div v-if="showUsernameDialog" class="dialog-overlay" @click="showUsernameDialog = false">
      <div class="dialog-content" @click.stop>
        <h3>修改用户名</h3>
        <input
          v-model="newUsername"
          type="text"
          placeholder="输入新用户名"
          maxlength="20"
          @keyup.enter="handleUpdateUsername"
          ref="usernameInput"
        />
        <div class="dialog-actions">
          <button class="btn-secondary" @click="showUsernameDialog = false">取消</button>
          <button class="btn-primary" @click="handleUpdateUsername" :disabled="!newUsername.trim()">
            确定
          </button>
        </div>
      </div>
    </div>

    <!-- 网格布局内容区 -->
    <div class="chat-content">
      <GridLayout 
        :rows="1" 
        :columns="3" 
        :gap="0"
        :default-column-ratios="[0.2, 0.75, 0.05]"
      >
        <!-- cell-0: 左侧边栏 - 用户网格 (25%) -->
        <template #cell-0>
          <UserGrid
            :media="media"
            :peers="peers"
            :current-user-id="currentUserId"
            :current-username="currentUsername"
          />
        </template>

        <!-- cell-1: 中间内容区 - 消息列表 (50%) -->
        <template #cell-1>
          <MessagePanel
            :messages="messages"
            :shared-files="sharedFiles"
            :current-user-id="currentUserId"
            :is-connected="isConnected"
            @send-message="handleSendMessage"
            @send-file="handleSendFile"
            @download-file="handleFileDownload"
          />
        </template>

        <!-- cell-2: 右侧边栏 - 媒体控制 (25%) -->
        <template #cell-2>
          <MediaControls :media="media" :user-name="currentUsername" />
        </template>
      </GridLayout>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoom } from '../composables/useRoom'
import MediaControls from '../components/MediaControls.vue'
import GridLayout from '../components/GridLayout.vue'
import UserGrid from '../components/UserGrid.vue'
import MessagePanel from '../components/MessagePanel.vue'

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
  updateUsername,
  leaveRoom,
  media,
  sharedFiles,
  sendFile,
  downloadFile,
} = useRoom(props.roomId)

const showUsernameDialog = ref(false)
const newUsername = ref('')
const usernameInput = ref<HTMLInputElement | null>(null)

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
const handleSendMessage = (text: string) => {
  sendChatMessage(text)
}

// 发送文件
const handleSendFile = async (file: File) => {
  try {
    await sendFile(file)
  } catch (error) {
    console.error('[ChatRoom] 文件发送失败:', error)
    alert('文件发送失败，请重试')
  }
}

// 处理文件下载
const handleFileDownload = async (fileId: string) => {
  try {
    await downloadFile(fileId)
  } catch (error) {
    console.error('[ChatRoom] 文件下载失败:', error)
    alert('文件下载失败，请重试')
  }
}

// 复制房间号
const copyRoomLink = () => {
  navigator.clipboard.writeText(props.roomId)
  alert('房间号已复制！')
}

// 离开房间
const handleLeaveRoom = () => {
  leaveRoom()
  emit('leave')
}

// 修改用户名
const handleUpdateUsername = async () => {
  const trimmedUsername = newUsername.value.trim()
  if (!trimmedUsername) return

  try {
    await updateUsername(trimmedUsername)
    showUsernameDialog.value = false
    newUsername.value = ''
  } catch (error) {
    console.error('修改用户名失败:', error)
    alert('修改用户名失败，请重试')
  }
}

// 监听对话框显示，自动聚焦输入框
watch(showUsernameDialog, async (show) => {
  if (show) {
    newUsername.value = currentUsername.value
    await nextTick()
    usernameInput.value?.focus()
    usernameInput.value?.select()
  }
})
</script>

<style scoped>
.chat-room {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.chat-header {
  flex-shrink: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 0 20px;
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  gap: 20px;
  z-index: 10;
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
  align-items: center;
}

.room-id {
  opacity: 0.9;
}

.online-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
}

.username-display {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  border: none;
  padding: 6px 14px;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.username-display:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.chat-content {
  flex: 1;
  overflow: hidden;
}

/* 对话框样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  min-width: 400px;
  max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog-content h3 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #333;
}

.dialog-content input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.dialog-content input:focus {
  border-color: #667eea;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  justify-content: flex-end;
}

.btn-primary,
.btn-secondary {
  padding: 10px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
}
</style>

