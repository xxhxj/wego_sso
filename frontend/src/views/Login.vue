<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, clearToken, getToken, setToken } from '../api.js';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const error = ref('');
const form = reactive({ username: 'admin', password: 'admin123' });

function safeRedirect(token) {
  const target = String(route.query.redirect || '');
  if (!target) return false;
  try {
    const url = new URL(target);
    if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') return false;
    url.searchParams.set('token', token);
    location.assign(url.toString());
    return true;
  } catch {
    return false;
  }
}

async function enter(token) {
  setToken(token);
  if (safeRedirect(token)) return;
  const menus = await api.menus('sso');
  if (menus.data?.length) {
    await router.push('/users');
    return;
  }
  const cad = await api.menus('wego-cad');
  if (cad.data?.length) {
    location.assign('http://127.0.0.1:5175/');
    return;
  }
  location.assign('http://127.0.0.1:5173/');
}

async function submit() {
  loading.value = true;
  error.value = '';
  try {
    const result = await api.login(form);
    await enter(result.token);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (route.query.logout) clearToken();
  const token = getToken();
  if (!token || route.query.logout) return;
  try {
    await api.me();
    await enter(token);
  } catch {
    clearToken();
  }
});
</script>

<template>
  <div class="login-page">
    <section class="login-copy">
      <h1>统一登录</h1>
      <p>用户、角色、菜单和审计都在这里。包装样机和三维建模只校验这里发出的令牌，并按菜单决定能打开哪些页面。</p>
    </section>
    <section class="login-panel">
      <form class="login-card" @submit.prevent="submit">
        <h2>登录</h2>
        <p class="hint">管理员 admin / admin123，样机 designer / designer123，建模 maker / maker123</p>
        <el-input v-model="form.username" placeholder="用户名" style="margin-bottom: 12px" />
        <el-input v-model="form.password" type="password" show-password placeholder="密码" style="margin-bottom: 12px" />
        <el-alert v-if="error" :title="error" type="error" :closable="false" style="margin-bottom: 12px" />
        <el-button type="primary" native-type="submit" :loading="loading" style="width: 100%" color="#1f1c19">
          进入
        </el-button>
      </form>
    </section>
  </div>
</template>
