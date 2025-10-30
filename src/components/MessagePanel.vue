<template>
  <div class="message-panel">
    <!-- 消息列表 -->
    <div class="messages" ref="messagesContainer">
      <!-- 合并后的消息（按时间排序） -->
      <div
        v-for="item in sortedMessages"
        :key="item.id"
        :class="['message', item.type === 'file' ? 'message-file' : '', item.userId === currentUserId ? 'message-own' : 'message-peer']"
      >
        <div 
          class="message-header"
          :class="item.userId === currentUserId ? 'message-header-own' : 'message-header-peer'"
        >
          <span class="message-username">{{ item.username }}</span>
          <span class="message-time">{{ formatTime(item.timestamp) }}</span>
        </div>
        
        <!-- 文本消息内容 -->
        <div v-if="item.type === 'text'" class="message-content">{{ item.text }}</div>
        
        <!-- 文件消息内容 -->
        <div v-else class="message-file-content">
          <!-- 内联媒体显示 -->
          <InlineMedia
            v-if="item.isInline && item.blobUrl"
            :media-url="item.blobUrl"
            :file-name="item.name"
            :file-type="item.fileType"
            :file-size="item.size"
          />
          
          <!-- 内联媒体加载中 -->
          <div v-else-if="item.isInline && !item.blobUrl" class="file-loading">
            <div class="spinner"></div>
            <div class="loading-text">正在加载媒体...</div>
          </div>
          
          <!-- 普通文件显示 -->
          <div v-else class="file-info">
            <div class="file-icon">📄</div>
            <div class="file-details">
              <div class="file-name">{{ item.name }}</div>
              <div class="file-size">{{ formatFileSize(item.size) }}</div>
            </div>
          </div>
          
          <!-- 下载按钮 -->
          <DownloadFileButton
            :file-id="item.id"
            :file-name="item.name"
            @download="handleFileDownload"
          />
        </div>
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
      <input
        ref="fileInput"
        type="file"
        style="display: none"
        @change="handleFileSelect"
        multiple
      />
      <button 
        class="btn-attachment" 
        @click="triggerFileSelect" 
        :disabled="!isConnected"
        title="发送文件"
      >
        📎
      </button>
      <button @click="handleSend" :disabled="!isConnected || !messageText.trim()">
        发送
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import type { Message } from '../lib/types'
import type { SharedFile } from '../composables/useFileShare'
import InlineMedia from './InlineMedia.vue'
import DownloadFileButton from './DownloadFileButton.vue'

interface Props {
  messages: Message[]
  sharedFiles: SharedFile[]
  currentUserId: string
  isConnected: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  sendMessage: [text: string]
  sendFile: [file: File]
  downloadFile: [fileId: string]
}>()

const messageText = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// 合并文本消息和文件消息，按时间戳排序
const sortedMessages = computed(() => {
  // 转换文本消息
  const textMessages = props.messages.map(msg => ({
    ...msg,
    type: 'text' as const
  }))
  
  // 转换文件消息
  const fileMessages = props.sharedFiles.map(file => ({
    id: file.id,
    type: 'file' as const,
    userId: file.userId,
    username: file.username,
    timestamp: file.timestamp,
    name: file.name,
    size: file.size,
    fileType: file.type,
    isInline: file.isInline,
    blobUrl: file.blobUrl
  }))
  
  // 合并并按时间戳排序
  return [...textMessages, ...fileMessages].sort((a, b) => a.timestamp - b.timestamp)
})

// 发送消息
const handleSend = () => {
  if (messageText.value.trim()) {
    emit('sendMessage', messageText.value)
    messageText.value = ''
    scrollToBottom()
  }
}

// 触发文件选择
const triggerFileSelect = () => {
  fileInput.value?.click()
}

// 处理文件选择
const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  
  if (files && files.length > 0) {
    console.log('[MessagePanel] 选中文件:', Array.from(files).map(f => f.name))
    
    // 发送所有选中的文件
    for (const file of Array.from(files)) {
      emit('sendFile', file)
    }
    
    // 清空文件输入，以便可以重复选择同一文件
    target.value = ''
  }
}

// 处理文件下载
const handleFileDownload = (fileId: string) => {
  emit('downloadFile', fileId)
}

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
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
watch(sortedMessages, () => {
  console.log('[MessagePanel] 消息更新，总数:', sortedMessages.value.length)
  scrollToBottom()
}, { deep: true })

// 暴露方法供父组件调用
defineExpose({
  scrollToBottom
})
</script>

<style scoped>
.message-panel {
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
}

/* 消息列表样式 */
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

.message-file {
  max-width: 80%;
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
  margin-bottom: 4px;
  font-size: 12px;
}

.message-header-own {
  justify-content: flex-end;
}

.message-header-peer {
  justify-content: flex-start;
}

.message-username {
  font-weight: 600;
  margin-right: 10px;
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

/* 文件消息样式 */
.message-file-content {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-own .message-file-content {
  border-bottom-right-radius: 4px;
}

.message-peer .message-file-content {
  border-bottom-left-radius: 4px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9f9f9;
}

.file-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 600;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.file-size {
  font-size: 12px;
  color: #999;
}

.file-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: #f9f9f9;
  gap: 12px;
}

.file-loading .spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 14px;
  color: #666;
}

.message-input {
  flex-shrink: 0;
  display: flex;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
  background: white;
}

.message-input input[type="text"] {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 24px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.message-input input[type="text"]:focus {
  border-color: #667eea;
}

.message-input input[type="text"]:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.btn-attachment {
  width: 48px;
  height: 48px;
  padding: 0;
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
  border: 2px solid #e0e0e0;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-attachment:hover:not(:disabled) {
  background: rgba(102, 126, 234, 0.2);
  border-color: #667eea;
  transform: scale(1.05);
}

.btn-attachment:active:not(:disabled) {
  transform: scale(0.95);
}

.btn-attachment:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.message-input button:not(.btn-attachment) {
  padding: 12px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, opacity 0.2s;
  flex-shrink: 0;
}

.message-input button:not(.btn-attachment):hover:not(:disabled) {
  transform: translateY(-2px);
}

.message-input button:not(.btn-attachment):active:not(:disabled) {
  transform: translateY(0);
}

.message-input button:not(.btn-attachment):disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

