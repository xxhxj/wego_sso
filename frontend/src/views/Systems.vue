<script setup>
import { onMounted, ref } from 'vue';
import { api, getToken } from '../api.js';

const apps = ref([]);
const error = ref('');

onMounted(async () => {
  try {
    const result = await api.portals();
    apps.value = result.data || [];
  } catch (err) {
    error.value = err.message;
  }
});

function openSystem(app) {
  if (!app.entryUrl) return;
  const url = new URL(app.entryUrl);
  const token = getToken();
  if (token) url.searchParams.set('token', token);
  window.open(url.toString(), '_blank', 'noopener');
}
</script>

<template>
  <div>
    <div class="panel-head">
      <strong>系统列表</strong>
    </div>
    <p class="hint">点一个已对接的系统，会在新标签页打开它的首页，并带上当前登录令牌。地址在「菜单配置」里编辑对应系统。</p>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <div class="system-grid">
      <button
        v-for="app in apps"
        :key="app.id"
        class="system-card"
        :class="{ current: !app.entryUrl }"
        type="button"
        :disabled="!app.entryUrl"
        @click="openSystem(app)"
      >
        <b>{{ app.name }}</b>
        <span>{{ app.code }}</span>
        <small>{{ app.entryUrl || '不跳转' }}</small>
        <em>{{ app.entryUrl ? '新标签页打开' : '当前系统' }}</em>
      </button>
    </div>
  </div>
</template>
