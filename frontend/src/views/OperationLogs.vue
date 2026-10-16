<script setup>
import { onMounted, ref } from 'vue';
import { api } from '../api.js';

const rows = ref([]);
const total = ref(0);
const page = ref(1);

async function load() {
  const result = await api.operationLogs(page.value);
  rows.value = result.data;
  total.value = result.total;
}

onMounted(load);
</script>

<template>
  <div class="panel">
    <div class="panel-head"><strong>操作日志</strong></div>
    <el-table :data="rows">
      <el-table-column prop="username" label="用户" width="120" />
      <el-table-column prop="moduleName" label="模块" width="120" />
      <el-table-column prop="method" label="方法" width="90" />
      <el-table-column prop="path" label="路径" />
      <el-table-column prop="ip" label="IP" width="140" />
      <el-table-column prop="createdAt" label="时间" width="180" />
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
