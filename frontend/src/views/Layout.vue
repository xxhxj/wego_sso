<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, clearToken } from '../api.js';

const router = useRouter();
const nickname = ref('');
const menus = ref([]);

function visible(nodes) {
  return (nodes || []).filter((node) => node.menuType !== 'button' && node.status !== 0);
}

onMounted(async () => {
  const me = await api.me();
  nickname.value = me.nickname || me.username;
  const result = await api.menus('sso');
  menus.value = result.data || [];
});

function logout() {
  clearToken();
  router.push('/login?logout=1');
}
</script>

<template>
  <div class="shell">
    <aside class="sider">
      <div class="sider-brand">单点登录</div>
      <el-menu :default-active="$route.path" background-color="#221f1c" text-color="#f4efe8" active-text-color="#f0c36a" router>
        <template v-for="item in visible(menus)" :key="item.id">
          <el-sub-menu v-if="item.menuType === 'dir'" :index="String(item.id)">
            <template #title>{{ item.name }}</template>
            <el-menu-item v-for="child in visible(item.children)" :key="child.id" :index="child.path">
              {{ child.name }}
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.path">{{ item.name }}</el-menu-item>
        </template>
      </el-menu>
    </aside>
    <section class="main">
      <header class="top">
        <span>已登录的系统从「系统列表」进入</span>
        <div>
          <span style="margin-right: 12px">{{ nickname }}</span>
          <el-button link @click="logout">退出</el-button>
        </div>
      </header>
      <div class="content">
        <router-view />
      </div>
    </section>
  </div>
</template>
