<script setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';

const apps = ref([]);
const menus = ref([]);
const currentId = ref(0);
const appVisible = ref(false);
const menuVisible = ref(false);
const appForm = reactive({ id: 0, code: '', name: '', sortOrder: 0 });
const menuForm = reactive({
  id: 0, parentId: 0, name: '', path: '', permission: '', menuType: 'menu', sortOrder: 0, status: 1,
});

const tree = computed(() => nest(menus.value));
const currentApp = computed(() => apps.value.find((item) => item.id === currentId.value));

function nest(list, parentId = 0) {
  return list
    .filter((item) => item.parentId === parentId)
    .map((item) => ({ ...item, children: nest(list, item.id) }));
}

async function loadApps() {
  const result = await api.apps();
  apps.value = result.data;
  if (!currentId.value && apps.value[0]) currentId.value = apps.value[0].id;
  await loadMenus();
}

async function loadMenus() {
  if (!currentId.value) return;
  const result = await api.menuList(currentId.value);
  menus.value = result.data;
}

function choose(id) {
  currentId.value = id;
  loadMenus();
}

function openApp(app) {
  appForm.id = app?.id || 0;
  appForm.code = app?.code || '';
  appForm.name = app?.name || '';
  appForm.sortOrder = app?.sortOrder || apps.value.length + 1;
  appVisible.value = true;
}

async function saveApp() {
  try {
    await api.saveApp(appForm.id, appForm);
    appVisible.value = false;
    await loadApps();
  } catch (error) {
    ElMessage.error(error.message);
  }
}

async function removeApp(app) {
  if (!app) return;
  await ElMessageBox.confirm(`删除系统 ${app.name}？`, '确认');
  try {
    await api.removeApp(app.id);
    if (currentId.value === app.id) currentId.value = 0;
    await loadApps();
  } catch (error) {
    ElMessage.error(error.message);
  }
}

function openMenu(row, parentId = 0) {
  menuForm.id = row?.id || 0;
  menuForm.parentId = row?.parentId ?? parentId;
  menuForm.name = row?.name || '';
  menuForm.path = row?.path || '';
  menuForm.permission = row?.permission || '';
  menuForm.menuType = row?.menuType || 'menu';
  menuForm.sortOrder = row?.sortOrder || 0;
  menuForm.status = row?.status ?? 1;
  menuVisible.value = true;
}

async function saveMenu() {
  try {
    await api.saveMenu(menuForm.id, { ...menuForm, appId: currentId.value });
    menuVisible.value = false;
    await loadMenus();
  } catch (error) {
    ElMessage.error(error.message);
  }
}

async function removeMenu(row) {
  await ElMessageBox.confirm(`删除菜单 ${row.name}？`, '确认');
  try {
    await api.removeMenu(row.id);
    await loadMenus();
  } catch (error) {
    ElMessage.error(error.message);
  }
}

onMounted(loadApps);
</script>

<template>
  <div class="menu-layout">
    <div class="panel">
      <div class="panel-head">
        <strong>系统</strong>
        <el-button size="small" @click="openApp()">新建</el-button>
      </div>
      <button
        v-for="app in apps"
        :key="app.id"
        class="app-item"
        :class="{ active: app.id === currentId }"
        type="button"
        @click="choose(app.id)"
      >
        <b>{{ app.name }}</b>
        <div style="color:#7a756e;font-size:12px">{{ app.code }}</div>
      </button>
    </div>
    <div class="panel">
      <div class="panel-head">
        <strong>菜单树</strong>
        <div>
          <el-button @click="openApp(currentApp)">编辑系统</el-button>
          <el-button type="danger" plain @click="removeApp(currentApp)">删除系统</el-button>
          <el-button type="primary" color="#1f1c19" @click="openMenu()">新建菜单</el-button>
        </div>
      </div>
      <el-table :data="tree" row-key="id" default-expand-all>
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="path" label="路径" />
        <el-table-column prop="menuType" label="类型" width="90" />
        <el-table-column prop="permission" label="权限码" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button link @click="openMenu(null, row.id)">加子级</el-button>
            <el-button link @click="openMenu(row)">编辑</el-button>
            <el-button link type="danger" @click="removeMenu(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
    <el-dialog v-model="appVisible" title="系统" width="420px">
      <el-form label-width="72px">
        <el-form-item label="编码"><el-input v-model="appForm.code" :disabled="!!appForm.id" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="appForm.name" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="appForm.sortOrder" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" color="#1f1c19" @click="saveApp">保存</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="menuVisible" title="菜单" width="460px">
      <el-form label-width="72px">
        <el-form-item label="名称"><el-input v-model="menuForm.name" /></el-form-item>
        <el-form-item label="路径"><el-input v-model="menuForm.path" placeholder="管理端用 /users，样机用 edit" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="menuForm.menuType">
            <el-option label="目录" value="dir" />
            <el-option label="菜单" value="menu" />
            <el-option label="按钮" value="button" />
          </el-select>
        </el-form-item>
        <el-form-item label="权限码"><el-input v-model="menuForm.permission" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="menuForm.sortOrder" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" color="#1f1c19" @click="saveMenu">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
