<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../api.js';

const rows = ref([]);
const total = ref(0);
const page = ref(1);

async function load() {
  const result = await api.loginLogs(page.value);
  rows.value = result.data;
  total.value = result.total;
}

onMounted(load);
</script>

<template>
  <div class="panel">
    <div class="panel-head"><strong>登录日志</strong></div>
    <el-table :data="rows">
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="ip" label="IP" />
      <el-table-column label="结果">
        <template #default="{ row }">{{ row.success ? '成功' : '失败' }}</template>
      </el-table-column>
      <el-table-column prop="message" label="说明" />
      <el-table-column prop="createdAt" label="时间" />
    </el-table>
    <el-pagination
      v-model:current-page="page"
      layout="prev, pager, next"
      :total="total"
      :page-size="20"
      style="margin-top: 12px"
      @current-change="load"
    />
  </div>
</template>
