<script setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import { nextTick, onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';

const rows = ref([]);
const tree = ref([]);
const treeRef = ref();
const visible = ref(false);
const form = reactive({ id: 0, code: '', name: '', remark: '', status: 1 });

function nest(list, parentId = 0) {
  return list
    .filter((item) => item.parentId === parentId)
    .map((item) => ({ id: item.id, label: item.name, children: nest(list, item.id) }));
}

async function load() {
  const [roleRes, appRes, menuRes] = await Promise.all([api.roles(), api.apps(), api.menuList('')]);
  rows.value = roleRes.data;
  tree.value = appRes.data.map((app) => ({
    id: `app-${app.id}`,
    label: app.name,
    children: nest(menuRes.data.filter((item) => item.appId === app.id)),
  }));
}

async function open(row) {
  form.id = row?.id || 0;
  form.code = row?.code || '';
  form.name = row?.name || '';
  form.remark = row?.remark || '';
  form.status = row?.status ?? 1;
  visible.value = true;
  await nextTick();
  treeRef.value?.setCheckedKeys(row?.menuIds || []);
}

async function save() {
  const menuIds = (treeRef.value?.getCheckedKeys(false) || []).filter((id) => typeof id === 'number');
  try {
    await api.saveRole(form.id, { ...form, menuIds });
    visible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error.message);
  }
}

async function remove(row) {
  await ElMessageBox.confirm(`删除角色 ${row.name}？`, '确认');
  try {
    await api.removeRole(row.id);
    await load();
  } catch (error) {
    ElMessage.error(error.message);
  }
}

onMounted(load);
</script>

<template>
  <div class="panel">
    <div class="panel-head">
      <strong>角色配置</strong>
      <el-button type="primary" color="#1f1c19" @click="open()">新建角色</el-button>
    </div>
    <el-table :data="rows">
      <el-table-column prop="code" label="编码" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="remark" label="说明" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link @click="open(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="visible" :title="form.id ? '编辑角色' : '新建角色'" width="560px">
      <el-form label-width="72px">
        <el-form-item label="编码"><el-input v-model="form.code" :disabled="!!form.id" /></el-form-item>
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="form.remark" /></el-form-item>
        <el-form-item label="菜单">
          <el-tree ref="treeRef" :data="tree" node-key="id" show-checkbox default-expand-all style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" color="#1f1c19" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
