<template>
  <div class="min-h-screen bg-gray-950 flex flex-col items-center p-4">
    <header class="w-full max-w-7xl mb-6">
      <h1 class="text-2xl font-bold text-green-400 text-center">棋类 AI 对弈与棋谱回放系统</h1>
      <p class="text-center text-gray-500 text-sm mt-1">五子棋 · Minimax + Alpha-Beta 剪枝 · 教学模式</p>
    </header>

    <div class="flex flex-col xl:flex-row gap-6 max-w-7xl w-full items-start justify-center">
      <!-- Left Sidebar - Teaching Panel -->
      <div v-if="store.teachingConfig.enabled" class="w-full xl:w-80 space-y-4 order-2 xl:order-1">
        <TeachingPanel @select-position="handleSelectPosition" />
      </div>

      <!-- Board -->
      <div class="flex-shrink-0 order-1 xl:order-2">
        <GameBoard :selected-position="selectedPosition" />
      </div>

      <!-- Right Sidebar -->
      <div class="w-full xl:w-80 space-y-4 order-3">
        <!-- Game Status -->
        <div class="bg-gray-900 rounded-xl p-4 border border-gray-700">
          <h3 class="text-lg font-bold text-green-400 mb-3">游戏状态</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-400">状态</span>
              <span class="text-white">
                {{ statusText }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">当前回合</span>
              <span class="flex items-center gap-1">
                <span class="inline-block w-3 h-3 rounded-full" :class="store.currentPlayer === 1 ? 'bg-gray-800 border border-gray-600' : 'bg-white'"></span>
                {{ store.currentPlayer === 1 ? '黑棋' : '白棋' }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-400">手数</span>
              <span class="text-white">{{ store.currentMoveCount }}</span>
            </div>
            <div v-if="store.winner !== null" class="flex justify-between">
              <span class="text-gray-400">结果</span>
              <span class="font-bold" :class="store.winner === 1 ? 'text-gray-300' : store.winner === 2 ? 'text-white' : 'text-yellow-400'">
                {{ store.winner === 1 ? '黑棋胜' : store.winner === 2 ? '白棋胜' : '平局' }}
              </span>
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <button
              @click="store.startGame()"
              class="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors text-sm font-medium"
            >
              {{ store.status === 'playing' ? '重新开始' : '开始游戏' }}
            </button>
          </div>
        </div>

        <!-- AI Settings -->
        <div class="bg-gray-900 rounded-xl p-4 border border-gray-700">
          <h3 class="text-lg font-bold text-green-400 mb-3">AI 设置</h3>
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-400">启用 AI</span>
              <button
                @click="store.aiConfig.enabled = !store.aiConfig.enabled"
                class="w-12 h-6 rounded-full transition-colors relative"
                :class="store.aiConfig.enabled ? 'bg-green-600' : 'bg-gray-700'"
              >
                <span
                  class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                  :class="store.aiConfig.enabled ? 'left-6' : 'left-0.5'"
                />
              </button>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-400">AI 执</span>
              <div class="flex gap-2">
                <button
                  @click="store.aiConfig.playerColor = 2"
                  class="px-3 py-1 text-xs rounded transition-colors"
                  :class="store.aiConfig.playerColor === 2 ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'"
                >白棋</button>
                <button
                  @click="store.aiConfig.playerColor = 1"
                  class="px-3 py-1 text-xs rounded transition-colors"
                  :class="store.aiConfig.playerColor === 1 ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400'"
                >黑棋</button>
              </div>
            </div>
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-sm text-gray-400">搜索深度</span>
                <span class="text-sm text-white">{{ store.aiConfig.depth }}</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                v-model.number="store.aiConfig.depth"
                class="w-full accent-green-500"
              />
              <div class="flex justify-between text-xs text-gray-600">
                <span>1 (快)</span>
                <span>4 (强)</span>
              </div>
            </div>
            <div v-if="store.isAiThinking" class="flex items-center gap-2 text-yellow-400 text-sm">
              <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              AI 思考中...
            </div>
          </div>
        </div>

        <!-- Teaching Mode Toggle -->
        <div class="bg-gray-900 rounded-xl p-4 border border-gray-700">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-lg font-bold text-green-400 flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              教学模式
            </h3>
            <button
              @click="store.toggleTeachingMode()"
              class="w-12 h-6 rounded-full transition-colors relative"
              :class="store.teachingConfig.enabled ? 'bg-green-600' : 'bg-gray-700'"
            >
              <span
                class="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
                :class="store.teachingConfig.enabled ? 'left-6' : 'left-0.5'"
              />
            </button>
          </div>
          <p class="text-xs text-gray-500">
            {{ store.teachingConfig.enabled
              ? '教学模式已开启，落子后将自动分析局面并给出策略提示'
              : '开启教学模式，边下边学五子棋基础策略' }}
          </p>
        </div>

        <!-- Replay Panel -->
        <ReplayPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from './store/game';
import GameBoard from './components/GameBoard.vue';
import ReplayPanel from './components/ReplayPanel.vue';
import TeachingPanel from './components/TeachingPanel.vue';

const store = useGameStore();

const selectedPosition = ref<[number, number] | null>(null);

const statusText = computed(() => {
  switch (store.status) {
    case 'idle': return '等待开始';
    case 'playing': return '对弈中';
    case 'finished': return '已结束';
    case 'replaying': return '回放中';
    default: return '';
  }
});

function handleSelectPosition(row: number, col: number) {
  selectedPosition.value = [row, col];
  setTimeout(() => {
    selectedPosition.value = null;
  }, 2000);
}
</script>
