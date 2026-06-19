<template>
  <div v-if="store.teachingConfig.enabled" class="bg-gray-900 rounded-xl p-4 border border-green-700/50">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-lg font-bold text-green-400 flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
        </svg>
        教学模式
      </h3>
      <div class="flex items-center gap-2">
        <span class="text-xs text-gray-500">难度:</span>
        <select
          v-model="store.teachingConfig.difficulty"
          @change="store.updateAnalysis()"
          class="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-700 focus:outline-none focus:border-green-500"
        >
          <option value="beginner">入门</option>
          <option value="intermediate">进阶</option>
          <option value="advanced">高级</option>
        </select>
      </div>
    </div>

    <div v-if="store.teachingContent" class="space-y-4">
      <div class="bg-gray-800/50 rounded-lg p-3 border-l-4 border-green-500">
        <p class="text-sm font-medium text-green-400">{{ store.teachingContent.situation }}</p>
      </div>

      <div v-if="store.teachingContent.explanation.length > 0" class="space-y-2">
        <h4 class="text-sm font-semibold text-gray-300 flex items-center gap-1">
          <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          局面讲解
        </h4>
        <div class="pl-5 space-y-1">
          <p
            v-for="(exp, idx) in store.teachingContent.explanation"
            :key="idx"
            class="text-sm text-gray-400 leading-relaxed"
          >
            {{ exp }}
          </p>
        </div>
      </div>

      <div v-if="store.teachingContent.strategyTips.length > 0" class="space-y-2">
        <h4 class="text-sm font-semibold text-gray-300 flex items-center gap-1">
          <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
          </svg>
          策略提示
        </h4>
        <div class="pl-5 space-y-1">
          <p
            v-for="(tip, idx) in store.teachingContent.strategyTips"
            :key="idx"
            class="text-sm text-yellow-400/90 leading-relaxed"
          >
            {{ tip }}
          </p>
        </div>
      </div>

      <div v-if="store.teachingContent.nextHints.length > 0 && store.teachingConfig.showHints" class="space-y-2">
        <h4 class="text-sm font-semibold text-gray-300 flex items-center gap-1">
          <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          下一步推荐
        </h4>
        <div class="pl-5 space-y-2">
          <div
            v-for="(hint, idx) in store.teachingContent.nextHints.slice(0, 3)"
            :key="idx"
            class="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-green-600/50 transition-colors cursor-pointer"
            @click="handleHintClick(hint)"
          >
            <div class="flex items-start justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-600 text-white text-xs font-bold">
                    {{ idx + 1 }}
                  </span>
                  <span class="text-sm font-medium text-white">
                    {{ formatPosition(hint.position) }}
                  </span>
                  <span
                    class="text-xs px-2 py-0.5 rounded-full"
                    :class="getPriorityClass(hint.priority)"
                  >
                    {{ getPriorityLabel(hint.priority) }}
                  </span>
                </div>
                <p class="text-xs text-gray-400 mt-1 ml-7">{{ hint.reason }}</p>
                <p class="text-xs text-green-400/80 mt-1 ml-7">策略：{{ hint.strategy }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="store.teachingContent.keyPoints.length > 0" class="space-y-2">
        <h4 class="text-sm font-semibold text-gray-300 flex items-center gap-1">
          <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
          </svg>
          知识点
        </h4>
        <div class="pl-5 space-y-1">
          <div
            v-for="(point, idx) in store.teachingContent.keyPoints"
            :key="idx"
            class="flex items-start gap-2"
          >
            <span class="text-purple-400 mt-0.5">•</span>
            <p class="text-sm text-purple-300/90 leading-relaxed">{{ point }}</p>
          </div>
        </div>
      </div>

      <div v-if="store.boardAnalysis && store.teachingConfig.showHighlights" class="space-y-2">
        <h4 class="text-sm font-semibold text-gray-300 flex items-center gap-1">
          <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
          棋盘标记说明
        </h4>
        <div class="pl-5 grid grid-cols-2 gap-2 text-xs">
          <div class="flex items-center gap-2">
            <span class="inline-block w-3 h-3 rounded-full bg-red-500/60 border border-red-400"></span>
            <span class="text-gray-400">威胁点（需防守）</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-block w-3 h-3 rounded-full bg-green-500/60 border border-green-400"></span>
            <span class="text-gray-400">机会点（可进攻）</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-block w-3 h-3 rounded-full bg-blue-500/60 border border-blue-400"></span>
            <span class="text-gray-400">推荐点</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-block w-3 h-3 rounded-full bg-yellow-500/60 border border-yellow-400"></span>
            <span class="text-gray-400">防守要点</span>
          </div>
        </div>
      </div>

      <div class="flex gap-2 pt-2 border-t border-gray-800">
        <button
          @click="store.teachingConfig.showHighlights = !store.teachingConfig.showHighlights"
          class="flex-1 py-1.5 text-xs rounded-lg transition-colors"
          :class="store.teachingConfig.showHighlights
            ? 'bg-green-600/20 text-green-400 border border-green-600/50'
            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'"
        >
          {{ store.teachingConfig.showHighlights ? '✓ 显示标记' : '隐藏标记' }}
        </button>
        <button
          @click="store.teachingConfig.showHints = !store.teachingConfig.showHints"
          class="flex-1 py-1.5 text-xs rounded-lg transition-colors"
          :class="store.teachingConfig.showHints
            ? 'bg-green-600/20 text-green-400 border border-green-600/50'
            : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'"
        >
          {{ store.teachingConfig.showHints ? '✓ 显示提示' : '隐藏提示' }}
        </button>
      </div>
    </div>

    <div v-else class="text-center py-8 text-gray-500 text-sm">
      <p>开始游戏后，教学模式将自动分析局面</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../store/game';
import type { NextHint } from '../types';

const store = useGameStore();

const emit = defineEmits<{
  (e: 'select-position', row: number, col: number): void;
}>();

function formatPosition(pos: [number, number]): string {
  const [row, col] = pos;
  return `${String.fromCharCode(65 + col)}${15 - row}`;
}

function getPriorityClass(priority: number): string {
  if (priority >= 90) return 'bg-red-600/30 text-red-400 border border-red-600/50';
  if (priority >= 80) return 'bg-orange-600/30 text-orange-400 border border-orange-600/50';
  if (priority >= 60) return 'bg-yellow-600/30 text-yellow-400 border border-yellow-600/50';
  return 'bg-gray-600/30 text-gray-400 border border-gray-600/50';
}

function getPriorityLabel(priority: number): string {
  if (priority >= 90) return '最高';
  if (priority >= 80) return '高';
  if (priority >= 60) return '中';
  return '低';
}

function handleHintClick(hint: NextHint) {
  emit('select-position', hint.position[0], hint.position[1]);
}
</script>
