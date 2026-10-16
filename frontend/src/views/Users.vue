<script setup>
import { ElMessage, ElMessageBox } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import { api } from '../api.js';

const rows = ref([]);
const roles = ref([]);
const visible = ref(false);
const form = reactive({ id: 0, username: '', password: '', nickname: '', status: 1, roleIds: [], memberMonths: '' });

async function load() {
  const [userRes, roleRes] = await Promise.all([api.users(), api.roles()]);
  rows.value = userRes.data;
  roles.value = roleRes.data;
}

function open(row) {
  form.id = row?.id || 0;
  form.username = row?.username || '';
  form.password = '';
  form.nickname = row?.nickname || '';
  form.status = row?.status ?? 1;
  form.roleIds = row?.roleIds ? [...row.roleIds] : [];
  form.memberMonths = '';
  visible.value = true;
}

async function save() {
  try {
    await api.saveUser(form.id, {
      username: form.username,
      password: form.password,
      nickname: form.nickname,
      status: form.status,
      roleIds: form.roleIds,
      memberMonths: form.memberMonths === '' ? undefined : Number(form.memberMonths),
    });
    visible.value = false;
    await load();
  } catch (error) {
    ElMessage.error(error.message);
  }
}

async function remove(row) {
  await ElMessageBox.confirm(`删除用户 ${row.username}？`, '确认');
  await api.removeUser(row.id);
  await load();
}

onMounted(load);
</script>

<template>
  <div class="panel">
    <div class="panel-head">
      <strong>用户管理</strong>
      <el-button type="primary" color="#1f1c19" @click="open()">新建用户</el-button>
    </div>
    <el-table :data="rows">
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="nickname" label="姓名" />
      <el-table-column label="会员">
        <template #default="{ row }">{{ row.member ? '有效' : '未开通' }}</template>
      </el-table-column>
      <el-table-column label="状态">
        <template #default="{ row }">{{ row.status === 1 ? '启用' : '停用' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link @click="open(row)">编辑</el-button>
          <el-button link type="danger" @click="remove(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog v-model="visible" :title="form.id ? '编辑用户' : '新建用户'" width="460px">
      <el-form label-width="72px">
        <el-form-item label="用户名"><el-input v-model="form.username" :disabled="!!form.id" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" placeholder="编辑时留空则不修改" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.nickname" /></el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="会员">
          <el-select v-model="form.memberMonths" placeholder="不调整">
            <el-option label="不调整" value="" />
            <el-option label="开通一年" value="12" />
            <el-option label="取消会员" value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-checkbox-group v-model="form.roleIds">
            <el-checkbox v-for="role in roles" :key="role.id" :value="role.id">{{ role.name }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" color="#1f1c19" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
