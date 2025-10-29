<template>
  <div ref="containerRef" class="grid-layout">
    <div
      class="grid-container"
      :style="{
        display: 'grid',
        gridTemplateColumns: columnSizes.join(' '),
        gridTemplateRows: rowSizes.join(' '),
        gap: `${gap}px`,
        width: '100%',
        height: '100%'
      }"
    >
      <!-- 渲染 m*n 个格子 -->
      <div
        v-for="cellIndex in totalCells"
        :key="`cell-${cellIndex}`"
        class="grid-cell"
      >
        <slot :name="`cell-${cellIndex - 1}`"></slot>
      </div>
    </div>

    <!-- 垂直分隔线（调整列宽） -->
    <div
      v-for="colIndex in columns - 1"
      :key="`col-${colIndex}`"
      class="resize-handle resize-handle-vertical"
      :style="{
        left: `${getColumnPosition(colIndex - 1)}px`,
        height: '100%'
      }"
      @mousedown="(e) => startResize(e, 'column', colIndex - 1)"
    ></div>

    <!-- 水平分隔线（调整行高） -->
    <div
      v-for="rowIndex in rows - 1"
      :key="`row-${rowIndex}`"
      class="resize-handle resize-handle-horizontal"
      :style="{
        top: `${getRowPosition(rowIndex - 1)}px`,
        width: '100%'
      }"
      @mousedown="(e) => startResize(e, 'row', rowIndex - 1)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  rows?: number
  columns?: number
  gap?: number
}

const props = withDefaults(defineProps<Props>(), {
  rows: 2,
  columns: 2,
  gap: 8
})

const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const containerHeight = ref(0)

// 计算总格子数
const totalCells = computed(() => props.rows * props.columns)

// 存储每列和每行的比例（0-1之间）
const columnRatios = ref<number[]>([])
const rowRatios = ref<number[]>([])

// 调整状态
const resizing = ref<{
  type: 'column' | 'row'
  index: number
  startPos: number
  startRatios: number[]
} | null>(null)

// 初始化比例
const initializeRatios = () => {
  // 平均分配每列和每行
  columnRatios.value = Array(props.columns).fill(1 / props.columns)
  rowRatios.value = Array(props.rows).fill(1 / props.rows)
}

// 计算实际的列宽和行高（CSS grid template values）
const columnSizes = computed(() => {
  return columnRatios.value.map(ratio => `${ratio * 100}%`)
})

const rowSizes = computed(() => {
  return rowRatios.value.map(ratio => `${ratio * 100}%`)
})

// 获取列分隔线的位置
const getColumnPosition = (colIndex: number): number => {
  const totalGap = (props.columns - 1) * props.gap
  const availableWidth = containerWidth.value - totalGap
  
  let position = 0
  // 计算第 colIndex 列的右边界位置
  for (let i = 0; i <= colIndex; i++) {
    position += columnRatios.value[i] * availableWidth
    if (i < colIndex) {
      position += props.gap
    }
  }
  
  return position
}

// 获取行分隔线的位置
const getRowPosition = (rowIndex: number): number => {
  const totalGap = (props.rows - 1) * props.gap
  const availableHeight = containerHeight.value - totalGap
  
  let position = 0
  // 计算第 rowIndex 行的下边界位置
  for (let i = 0; i <= rowIndex; i++) {
    position += rowRatios.value[i] * availableHeight
    if (i < rowIndex) {
      position += props.gap
    }
  }
  
  return position
}

// 开始调整大小
const startResize = (e: MouseEvent, type: 'column' | 'row', index: number) => {
  e.preventDefault()
  
  resizing.value = {
    type,
    index,
    startPos: type === 'column' ? e.clientX : e.clientY,
    startRatios: type === 'column' ? [...columnRatios.value] : [...rowRatios.value]
  }
  
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.body.style.cursor = type === 'column' ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'
}

// 鼠标移动
const onMouseMove = (e: MouseEvent) => {
  if (!resizing.value || !containerRef.value) return
  
  const { type, index, startPos, startRatios } = resizing.value
  
  if (type === 'column') {
    const delta = e.clientX - startPos
    const totalGap = (props.columns - 1) * props.gap
    const availableWidth = containerWidth.value - totalGap
    const deltaRatio = delta / availableWidth
    
    // 调整相邻两列的比例
    const newLeftRatio = startRatios[index] + deltaRatio
    const newRightRatio = startRatios[index + 1] - deltaRatio
    
    // 确保比例不小于最小值（例如5%）
    const minRatio = 0.05
    if (newLeftRatio >= minRatio && newRightRatio >= minRatio) {
      const newRatios = [...columnRatios.value]
      newRatios[index] = newLeftRatio
      newRatios[index + 1] = newRightRatio
      columnRatios.value = newRatios
    }
  } else {
    const delta = e.clientY - startPos
    const totalGap = (props.rows - 1) * props.gap
    const availableHeight = containerHeight.value - totalGap
    const deltaRatio = delta / availableHeight
    
    // 调整相邻两行的比例
    const newTopRatio = startRatios[index] + deltaRatio
    const newBottomRatio = startRatios[index + 1] - deltaRatio
    
    // 确保比例不小于最小值
    const minRatio = 0.05
    if (newTopRatio >= minRatio && newBottomRatio >= minRatio) {
      const newRatios = [...rowRatios.value]
      newRatios[index] = newTopRatio
      newRatios[index + 1] = newBottomRatio
      rowRatios.value = newRatios
    }
  }
}

// 鼠标释放
const onMouseUp = () => {
  if (resizing.value) {
    resizing.value = null
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }
}

// 更新容器尺寸
const updateContainerSize = () => {
  if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect()
    containerWidth.value = rect.width
    containerHeight.value = rect.height
  }
}

// ResizeObserver 监听容器尺寸变化
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  initializeRatios()
  updateContainerSize()
  
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerSize()
    })
    resizeObserver.observe(containerRef.value)
  }
  
  window.addEventListener('resize', updateContainerSize)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  window.removeEventListener('resize', updateContainerSize)
  
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value)
    resizeObserver.disconnect()
  }
})
</script>

<style scoped>
.grid-layout {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.grid-container {
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
}

.grid-cell {
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
  z-index: 1;
}

.resize-handle {
  position: absolute;
  z-index: 100;
  background: transparent;
  transition: background-color 0.2s;
}

.resize-handle:hover {
  background-color: rgba(59, 130, 246, 0.5);
}

.resize-handle-vertical {
  top: 0;
  width: 12px;
  cursor: col-resize;
  transform: translateX(-6px);
}

/* 增加一个视觉提示线 */
.resize-handle-vertical::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(200, 200, 200, 0.3);
  transform: translateX(-50%);
  transition: background-color 0.2s;
}

.resize-handle-vertical:hover::before {
  background: rgba(59, 130, 246, 0.8);
}

.resize-handle-horizontal {
  left: 0;
  height: 12px;
  cursor: row-resize;
  transform: translateY(-6px);
}

/* 增加一个视觉提示线 */
.resize-handle-horizontal::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 2px;
  background: rgba(200, 200, 200, 0.3);
  transform: translateY(-50%);
  transition: background-color 0.2s;
}

.resize-handle-horizontal:hover::before {
  background: rgba(59, 130, 246, 0.8);
}

.resize-handle:active {
  background-color: rgba(59, 130, 246, 0.5);
}
</style>

