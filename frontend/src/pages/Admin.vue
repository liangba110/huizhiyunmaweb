<template>
  <div class="admin-page">
    <div v-if="!token" class="login-wrap">
      <div class="login-box">
        <div class="login-logo">汇</div>
        <h2>汇智云码 管理后台</h2>
        <form @submit.prevent="login">
          <div class="form-group">
            <label>用户名</label>
            <input v-model="loginForm.username" required>
          </div>
          <div class="form-group">
            <label>密码</label>
            <input v-model="loginForm.password" type="password" required>
          </div>
          <button type="submit" class="btn btn-primary btn-block" :disabled="logging">
            {{ logging ? '登录中...' : '登 录' }}
          </button>
        </form>
      </div>
    </div>

    <div v-else class="admin-wrap">
      <aside class="sidebar">
        <div class="sidebar-logo">汇智云码</div>
        <nav>
          <a v-for="t in tabs" :key="t.key" :class="{ active: activeTab === t.key }" @click="activeTab = t.key">
            {{ t.icon }} {{ t.label }}
          </a>
        </nav>
        <a class="home-btn" href="/">🏠 返回首页</a>
        <button class="logout-btn" @click="logout">退出登录</button>
      </aside>

      <main class="admin-main">
        <header class="admin-header">
          <h2>{{ currentTabLabel }}</h2>
          <span class="admin-info">👤 {{ adminInfo.username }}</span>
        </header>

        <!-- 服务管理 -->
        <div v-if="activeTab === 'services'" class="panel">
          <button class="btn btn-primary" @click="openServiceForm()">+ 新增服务</button>
          <table class="data-table">
            <thead><tr><th>ID</th><th>图标</th><th>标题</th><th>价格区间</th><th>排序</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="s in services" :key="s.id">
                <td>{{ s.id }}</td>
                <td style="font-size:24px">{{ s.icon }}</td>
                <td>{{ s.title }}</td>
                <td>¥{{ s.price_min }} - {{ s.price_max }}</td>
                <td>{{ s.sort_order }}</td>
                <td><span :class="['badge', s.status === 1 ? 'badge-on' : 'badge-off']">{{ s.status === 1 ? '上架' : '下架' }}</span></td>
                <td>
                  <button class="btn-link" @click="openServiceForm(s)">编辑</button>
                  <button class="btn-link danger" @click="delService(s.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 案例管理 -->
        <div v-if="activeTab === 'cases'" class="panel">
          <button class="btn btn-primary" @click="openCaseForm()">+ 新增案例</button>
          <table class="data-table">
            <thead><tr><th>ID</th><th>标题</th><th>分类</th><th>客户</th><th>浏览</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="c in cases" :key="c.id">
                <td>{{ c.id }}</td>
                <td>{{ c.title }}</td>
                <td><span class="badge badge-on">{{ c.category }}</span></td>
                <td>{{ c.client }}</td>
                <td>{{ c.view_count }}</td>
                <td>
                  <button class="btn-link" @click="openCaseForm(c)">编辑</button>
                  <button class="btn-link danger" @click="delCase(c.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 文章管理 -->
        <div v-if="activeTab === 'articles'" class="panel">
          <button class="btn btn-primary" @click="openArticleForm()">+ 新增文章</button>
          <table class="data-table">
            <thead><tr><th>ID</th><th>标题</th><th>分类</th><th>作者</th><th>浏览</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="a in articles" :key="a.id">
                <td>{{ a.id }}</td>
                <td>{{ a.title }}</td>
                <td>{{ a.category }}</td>
                <td>{{ a.author }}</td>
                <td>{{ a.view_count }}</td>
                <td><span :class="['badge', a.status === 1 ? 'badge-on' : 'badge-off']">{{ a.status === 1 ? '已发布' : '草稿' }}</span></td>
                <td>
                  <button class="btn-link" @click="openArticleForm(a)">编辑</button>
                  <button class="btn-link danger" @click="delArticle(a.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 留言管理 -->
        <div v-if="activeTab === 'contacts'" class="panel">
          <table class="data-table">
            <thead><tr><th>ID</th><th>姓名</th><th>电话</th><th>公司</th><th>服务</th><th>状态</th><th>提交时间</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="c in contacts" :key="c.id">
                <td>{{ c.id }}</td>
                <td>{{ c.name }}</td>
                <td>{{ c.phone }}</td>
                <td>{{ c.company }}</td>
                <td>{{ c.service_type }}</td>
                <td>
                  <select :value="c.status" @change="updateContactStatus(c.id, $event.target.value)">
                    <option :value="0">未处理</option>
                    <option :value="1">已联系</option>
                    <option :value="2">已成交</option>
                    <option :value="3">已关闭</option>
                  </select>
                </td>
                <td>{{ formatDate(c.created_at) }}</td>
                <td>
                  <button class="btn-link danger" @click="delContact(c.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 客服对话（AI线索） -->
        <div v-if="activeTab === 'chatLead'" class="panel">
          <div class="panel-head">
            <h3>AI 在线客服线索（{{ chatLeads.length }}）</h3>
            <button class="btn btn-sm" @click="loadChatLeads">刷新</button>
          </div>
          <p class="muted-hint">来自网站右下角 AI 客服的对话线索，含客户联系方式与完整聊天记录。</p>
          <table class="data-table">
            <thead><tr><th>ID</th><th>称呼</th><th>电话</th><th>微信/邮箱</th><th>状态</th><th>消息数</th><th>时间</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-if="chatLeads.length === 0"><td colspan="8" style="text-align:center;color:#94a3b8">暂无客服线索</td></tr>
              <tr v-for="l in chatLeads" :key="l.id">
                <td>{{ l.id }}</td>
                <td>{{ l.client_name || '—' }}</td>
                <td>{{ l.client_phone || '—' }}</td>
                <td>{{ l.client_wechat || l.client_email || '—' }}</td>
                <td>
                  <button class="btn-link" :class="{danger:l.lead_status===0, success:l.lead_status===2}" @click="viewChatDetail(l)">
                    {{ ['未成交','意向','已成交'][l.lead_status] || l.lead_status }}
                  </button>
                </td>
                <td>{{ l.msg_count }}</td>
                <td>{{ formatDate(l.created_at) }}</td>
                <td><button class="btn-link" @click="viewChatDetail(l)">查看对话</button></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 公司信息 -->
        <div v-if="activeTab === 'company'" class="panel">
          <form @submit.prevent="saveCompany" class="company-form">
            <div v-for="(v, k) in companyForm" :key="k" class="form-group">
              <label>{{ k }}</label>
              <textarea v-if="String(v).length > 50" v-model="companyForm[k]" rows="3"></textarea>
              <input v-else v-model="companyForm[k]">
            </div>
            <button type="submit" class="btn btn-primary">保存</button>
          </form>
        </div>

        <!-- 模板订单 -->
        <div v-if="activeTab === 'tplOrders'" class="panel">
          <div style="margin-bottom:16px;display:flex;gap:8px;flex-wrap:wrap">
            <button :class="['btn', tplOrderFilter === '' ? 'btn-primary' : '']" @click="tplOrderFilter='';loadTplOrders()">全部</button>
            <button :class="['btn', tplOrderFilter === '0' ? 'btn-primary' : '']" @click="tplOrderFilter='0';loadTplOrders()">待支付</button>
            <button :class="['btn', tplOrderFilter === '1' ? 'btn-primary' : '']" @click="tplOrderFilter='1';loadTplOrders()">待确认</button>
            <button :class="['btn', tplOrderFilter === '2' ? 'btn-primary' : '']" @click="tplOrderFilter='2';loadTplOrders()">已确认</button>
            <button :class="['btn', tplOrderFilter === '4' ? 'btn-primary' : '']" @click="tplOrderFilter='4';loadTplOrders()">已取消</button>
          </div>
          <table class="data-table">
            <thead><tr><th>订单号</th><th>模板</th><th>等级</th><th>金额</th><th>客户</th><th>时间</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="o in tplOrders" :key="o.id">
                <td style="font-family:monospace;font-size:12px">{{ o.order_no }}</td>
                <td>{{ o.template_name }}</td>
                <td><span :class="['badge', levelCls(o.level)]">{{ levelLabel(o.level) }}</span></td>
                <td><strong>¥{{ fmtAmt(o.amount) }}</strong></td>
                <td>{{ o.customer_name || '—' }}<br><small>{{ o.customer_phone || '' }}</small></td>
                <td style="font-size:12px">{{ fmtDate(o.created_at) }}</td>
                <td><span :class="['badge', oStatusCls(o.status)]">{{ tplOMap[o.status] }}</span></td>
                <td>
                  <template v-if="o.status === 1">
                    <button class="btn-link" style="color:#059669" @click="confirmTplOrder(o.id)">✅ 确认到账</button>
                  </template>
                  <template v-if="[0].includes(o.status)">
                    <button class="btn-link danger" @click="cancelTplOrder(o.id)">取消</button>
                  </template>
                </td>
              </tr>
              <tr v-if="tplOrders.length === 0"><td colspan="8" style="text-align:center;padding:40px;color:#94A3B8">暂无模板订单</td></tr>
            </tbody>
          </table>
        </div>

        <!-- 套餐订单 -->
        <div v-if="activeTab === 'pkgOrders'" class="panel">
          <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button :class="['btn', pkgOrderFilter === '' ? 'btn-primary' : '']" @click="pkgOrderFilter='';loadPkgOrders()">全部</button>
              <button :class="['btn', pkgOrderFilter === '0' ? 'btn-primary' : '']" @click="pkgOrderFilter='0';loadPkgOrders()">待付款</button>
              <button :class="['btn', pkgOrderFilter === '1' ? 'btn-primary' : '']" @click="pkgOrderFilter='1';loadPkgOrders()">待确认</button>
              <button :class="['btn', pkgOrderFilter === '2' ? 'btn-primary' : '']" @click="pkgOrderFilter='2';loadPkgOrders()">已成交</button>
            </div>
            <button class="btn" @click="loadPkgOrders">刷新</button>
          </div>
          <table class="data-table">
            <thead><tr><th>订单号</th><th>套餐</th><th>金额</th><th>客户</th><th>行业</th><th>时间</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="o in pkgOrders" :key="o.id">
                <td style="font-family:monospace;font-size:12px">{{ o.order_no }}</td>
                <td>{{ o.package_name }}</td>
                <td><strong>¥{{ fmtAmt(o.price) }}</strong></td>
                <td>{{ o.name || '—' }}<br><small>{{ o.phone || '' }}</small></td>
                <td>{{ o.industry }}</td>
                <td style="font-size:12px">{{ fmtDate(o.created_at) }}</td>
                <td><span :class="['badge', oStatusCls(o.status)]">{{ ['待付款','待确认','已成交'][o.status] || o.status }}</span></td>
                <td>
                  <select :value="o.status" @change="updatePkgOrder(o.id, $event.target.value)" style="padding:4px;border:1px solid #e2e8f0;border-radius:4px">
                    <option :value="0">待付款</option>
                    <option :value="1">待确认</option>
                    <option :value="2">已成交</option>
                  </select>
                </td>
              </tr>
              <tr v-if="pkgOrders.length === 0"><td colspan="8" style="text-align:center;padding:40px;color:#94A3B8">暂无套餐订单</td></tr>
            </tbody>
          </table>
        </div>

        <!-- 模板管理 -->
        <div v-if="activeTab === 'tpls'" class="panel">
          <button class="btn btn-primary" @click="openTplForm()">+ 新增模板</button>
          <table class="data-table" style="margin-top:16px">
            <thead><tr><th>名称</th><th>标识</th><th>等级</th><th>价格</th><th>下载</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="t in tpls" :key="t.id">
                <td>{{ t.name }}</td>
                <td style="font-family:monospace;font-size:11px">{{ t.slug }}</td>
                <td><span :class="['badge', levelCls(t.level)]">{{ levelLabel(t.level) }}</span></td>
                <td><strong>¥{{ fmtAmt(t.price) }}</strong></td>
                <td>{{ t.download_count }}</td>
                <td><span :class="['badge', t.status === 1 ? 'badge-on' : 'badge-off']">{{ t.status === 1 ? '上架' : '下架' }}</span></td>
                <td>
                  <button class="btn-link" @click="openTplForm(t)">编辑</button>
                  <button class="btn-link danger" @click="delTpl(t.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 商城配置 -->
        <div v-if="activeTab === 'tplConfig'" class="panel">
          <div class="company-form">
            <div class="form-group"><label>网站名称</label><input v-model="tplConfigForm.site_name"></div>
            <div class="form-group"><label>微信收款码链接</label><input v-model="tplConfigForm.payment_wechat_qr" placeholder="/uploads/wechat_qr.jpg"></div>
            <button class="btn btn-primary" @click="saveTplConfig">保存</button>
          </div>
        </div>
      </main>

      <!-- 弹窗：服务表单 -->
      <div v-if="showServiceForm" class="modal-mask" @click.self="showServiceForm = false">
        <div class="modal">
          <h3>{{ serviceForm.id ? '编辑服务' : '新增服务' }}</h3>
          <form @submit.prevent="saveService">
            <div class="form-group"><label>标题</label><input v-model="serviceForm.title" required></div>
            <div class="form-group"><label>副标题</label><input v-model="serviceForm.subtitle"></div>
            <div class="form-group"><label>图标 (emoji)</label><input v-model="serviceForm.icon" placeholder="📱"></div>
            <div class="form-group"><label>描述</label><textarea v-model="serviceForm.description" rows="3"></textarea></div>
            <div class="form-group"><label>特性 (用 | 分隔)</label><input v-model="serviceForm.features"></div>
            <div class="form-row">
              <div class="form-group"><label>价格下限</label><input v-model.number="serviceForm.price_min" type="number"></div>
              <div class="form-group"><label>价格上限</label><input v-model.number="serviceForm.price_max" type="number"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>排序</label><input v-model.number="serviceForm.sort_order" type="number"></div>
              <div class="form-group"><label>状态</label><select v-model.number="serviceForm.status"><option :value="1">上架</option><option :value="0">下架</option></select></div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn" @click="showServiceForm = false">取消</button>
              <button type="submit" class="btn btn-primary">保存</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 弹窗：案例表单 -->
      <div v-if="showCaseForm" class="modal-mask" @click.self="showCaseForm = false">
        <div class="modal">
          <h3>{{ caseForm.id ? '编辑案例' : '新增案例' }}</h3>
          <form @submit.prevent="saveCase">
            <div class="form-group"><label>标题</label><input v-model="caseForm.title" required></div>
            <div class="form-row">
              <div class="form-group"><label>客户</label><input v-model="caseForm.client"></div>
              <div class="form-group"><label>分类</label><input v-model="caseForm.category"></div>
            </div>
            <div class="form-group"><label>简介</label><textarea v-model="caseForm.description" rows="2"></textarea></div>
            <div class="form-group"><label>技术栈</label><input v-model="caseForm.technologies"></div>
            <div class="form-group"><label>项目链接</label><input v-model="caseForm.project_url"></div>
            <div class="form-row">
              <div class="form-group"><label>排序</label><input v-model.number="caseForm.sort_order" type="number"></div>
              <div class="form-group"><label>状态</label><select v-model.number="caseForm.status"><option :value="1">上架</option><option :value="0">下架</option></select></div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn" @click="showCaseForm = false">取消</button>
              <button type="submit" class="btn btn-primary">保存</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 弹窗：模板表单 -->
      <div v-if="showTplForm" class="modal-mask" @click.self="showTplForm = false">
        <div class="modal" style="max-width:700px">
          <h3>{{ tplForm.id ? '编辑模板' : '新增模板' }}</h3>
          <form @submit.prevent="saveTpl">
            <div class="form-row">
              <div class="form-group"><label>名称 <span style="color:red">*</span></label><input v-model="tplForm.name" required></div>
              <div class="form-group"><label>标识(slug) <span style="color:red">*</span></label><input v-model="tplForm.slug" required placeholder="my-template"></div>
            </div>
            <div class="form-group"><label>描述</label><textarea v-model="tplForm.description" rows="3"></textarea></div>
            <div class="form-group"><label>功能特性（每行一个）</label><textarea v-model="tplForm.featuresText" rows="4" placeholder="响应式设计&#10;SEO优化&#10;联系表单"></textarea></div>
            <div class="form-row">
              <div class="form-group"><label>分类</label><input v-model="tplForm.category" placeholder="企业官网"></div>
              <div class="form-group"><label>演示链接</label><input v-model="tplForm.demo_url" placeholder="https://"></div>
            </div>
            <div class="form-row">
              <div class="form-group"><label>等级 <span style="color:red">*</span></label>
                <select v-model="tplForm.level">
                  <option value="standard">基础版</option>
                  <option value="pro">专业版</option>
                  <option value="enterprise">至尊版</option>
                </select>
              </div>
              <div class="form-group"><label>价格 <span style="color:red">*</span></label><input v-model.number="tplForm.price" type="number" step="0.01" required></div>
            </div>
            <div class="form-group"><label>预览图链接（逗号分隔）</label><input v-model="tplForm.preview_images" placeholder="/uploads/tpl_preview.jpg"></div>
            <div class="form-group"><label>下载文件链接</label><input v-model="tplForm.download_url" placeholder="/uploads/templates/my-template.zip"></div>
            <div class="form-row">
              <div class="form-group"><label>排序</label><input v-model.number="tplForm.sort_order" type="number"></div>
              <div class="form-group"><label>状态</label><select v-model.number="tplForm.status"><option :value="1">上架</option><option :value="0">下架</option></select></div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn" @click="showTplForm = false">取消</button>
              <button type="submit" class="btn btn-primary">保存</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 弹窗：文章表单 -->
      <div v-if="showArticleForm" class="modal-mask" @click.self="showArticleForm = false">
        <div class="modal">
          <h3>{{ articleForm.id ? '编辑文章' : '新增文章' }}</h3>
          <form @submit.prevent="saveArticle">
            <div class="form-group"><label>标题</label><input v-model="articleForm.title" required></div>
            <div class="form-row">
              <div class="form-group"><label>分类</label><input v-model="articleForm.category"></div>
              <div class="form-group"><label>作者</label><input v-model="articleForm.author"></div>
            </div>
            <div class="form-group"><label>摘要</label><textarea v-model="articleForm.summary" rows="2"></textarea></div>
            <div class="form-group"><label>正文 (支持 HTML)</label><textarea v-model="articleForm.content" rows="6"></textarea></div>
            <div class="form-row">
              <div class="form-group"><label>置顶</label><select v-model.number="articleForm.is_top"><option :value="1">是</option><option :value="0">否</option></select></div>
              <div class="form-group"><label>状态</label><select v-model.number="articleForm.status"><option :value="1">发布</option><option :value="0">草稿</option></select></div>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn" @click="showArticleForm = false">取消</button>
              <button type="submit" class="btn btn-primary">保存</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 弹窗：客服对话详情 -->
      <div v-if="showChatDetail" class="modal-mask" @click.self="closeChatDetail">
        <div class="modal chat-detail-modal">
          <div class="modal-head">
            <h3>客服对话详情</h3>
            <button class="btn-link danger" @click="closeChatDetail">✕ 关闭</button>
          </div>
          <div v-if="chatDetailSession" class="chat-lead-info">
            客户：{{ chatDetailSession.client_name || '未留名' }} · 电话：{{ chatDetailSession.client_phone || '—' }} · 微信/邮箱：{{ chatDetailSession.client_wechat || chatDetailSession.client_email || '—' }}
          </div>
          <div class="chat-detail-body">
            <div v-for="(m, i) in chatDetail" :key="i" class="chat-msg" :class="m.role">
              <span class="chat-msg-role">{{ m.role === 'user' ? '客户' : (m.role === 'assistant' ? 'AI小汇' : '系统') }}</span>
              <div class="chat-msg-content" v-html="escapeHtml(m.content)"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import axios from 'axios';

const token = ref(localStorage.getItem('admin_token') || '');
const adminInfo = ref({});
const loginForm = reactive({ username: '', password: '' });
const logging = ref(false);

const tabs = [
  { key: 'services', label: '服务管理', icon: '⚙️' },
  { key: 'cases', label: '案例管理', icon: '📁' },
  { key: 'articles', label: '文章管理', icon: '📝' },
  { key: 'contacts', label: '咨询留言', icon: '💬' },
  { key: 'chatLead', label: '客服对话', icon: '🤖' },
  { key: 'company', label: '公司信息', icon: '🏢' },
  { key: 'tplOrders', label: '模板订单', icon: '📦' },
  { key: 'pkgOrders', label: '套餐订单', icon: '🛒' },
  { key: 'tpls', label: '模板管理', icon: '📁' },
  { key: 'tplConfig', label: '商城配置', icon: '⚡' }
];
const activeTab = ref('services');
const currentTabLabel = computed(() => tabs.find(t => t.key === activeTab.value)?.label || '');

// 模板订单常量
const tplOMap = { 0: '待支付', 1: '待确认', 2: '已确认', 3: '已完成', 4: '已取消' };
function oStatusCls(s) { return { 0: 'badge-off', 1: 'badge-warn', 2: 'badge-on', 3: 'badge-on', 4: 'badge-off' }[s] || 'badge-off'; }
function levelLabel(l) { return { standard: '基础版', pro: '专业版', enterprise: '至尊版' }[l] || l; }
function levelCls(l) { return { standard: 'badge-off', pro: 'badge-warn', enterprise: 'badge-on' }[l] || 'badge-off'; }
function fmtAmt(v) { return v ? Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) : '0.00'; }
function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

axios.defaults.headers.common['Authorization'] = token.value ? `Bearer ${token.value}` : '';

async function login() {
  logging.value = true;
  try {
    const { data } = await axios.post('/api/auth/login', loginForm);
    if (data.code === 0) {
      token.value = data.data.token;
      adminInfo.value = data.data.admin;
      localStorage.setItem('admin_token', token.value);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token.value}`;
      loadAll();
    } else {
      alert(data.message);
    }
  } catch (e) { alert('登录失败'); }
  finally { logging.value = false; }
}

function logout() {
  token.value = '';
  localStorage.removeItem('admin_token');
  delete axios.defaults.headers.common['Authorization'];
}

// 服务
const services = ref([]);
const showServiceForm = ref(false);
const serviceForm = reactive({ id: null, title: '', subtitle: '', icon: '', description: '', features: '', price_min: 0, price_max: 0, sort_order: 0, status: 1 });
function openServiceForm(s) {
  Object.assign(serviceForm, s || { id: null, title: '', subtitle: '', icon: '', description: '', features: '', price_min: 0, price_max: 0, sort_order: 0, status: 1 });
  showServiceForm.value = true;
}
async function saveService() {
  if (serviceForm.id) await axios.put(`/api/services/${serviceForm.id}`, serviceForm);
  else await axios.post('/api/services', serviceForm);
  showServiceForm.value = false;
  loadServices();
}
async function delService(id) {
  if (!confirm('确认删除？')) return;
  await axios.delete(`/api/services/${id}`);
  loadServices();
}
async function loadServices() {
  const { data } = await axios.get('/api/services');
  if (data.code === 0) services.value = data.data;
}

// 案例
const cases = ref([]);
const showCaseForm = ref(false);
const caseForm = reactive({ id: null, title: '', client: '', category: '', description: '', technologies: '', project_url: '', sort_order: 0, status: 1 });
function openCaseForm(c) {
  Object.assign(caseForm, c || { id: null, title: '', client: '', category: '', description: '', technologies: '', project_url: '', sort_order: 0, status: 1 });
  showCaseForm.value = true;
}
async function saveCase() {
  if (caseForm.id) await axios.put(`/api/cases/${caseForm.id}`, caseForm);
  else await axios.post('/api/cases', caseForm);
  showCaseForm.value = false;
  loadCases();
}
async function delCase(id) {
  if (!confirm('确认删除？')) return;
  await axios.delete(`/api/cases/${id}`);
  loadCases();
}
async function loadCases() {
  const { data } = await axios.get('/api/cases', { params: { pageSize: 100 } });
  if (data.code === 0) cases.value = data.data.list;
}

// 文章
const articles = ref([]);
const showArticleForm = ref(false);
const articleForm = reactive({ id: null, title: '', category: '', summary: '', content: '', author: '汇智云码', is_top: 0, status: 1 });
function openArticleForm(a) {
  Object.assign(articleForm, a || { id: null, title: '', category: '', summary: '', content: '', author: '汇智云码', is_top: 0, status: 1 });
  showArticleForm.value = true;
}
async function saveArticle() {
  if (articleForm.id) await axios.put(`/api/articles/${articleForm.id}`, articleForm);
  else await axios.post('/api/articles', articleForm);
  showArticleForm.value = false;
  loadArticles();
}
async function delArticle(id) {
  if (!confirm('确认删除？')) return;
  await axios.delete(`/api/articles/${id}`);
  loadArticles();
}
async function loadArticles() {
  const { data } = await axios.get('/api/articles', { params: { pageSize: 100 } });
  if (data.code === 0) articles.value = data.data.list;
}

// 留言
const contacts = ref([]);
async function loadContacts() {
  const { data } = await axios.get('/api/contacts', { params: { pageSize: 100 } });
  if (data.code === 0) contacts.value = data.data.list;
}
async function updateContactStatus(id, status) {
  await axios.put(`/api/contacts/${id}`, { status: +status });
}
async function delContact(id) {
  if (!confirm('确认删除？')) return;
  await axios.delete(`/api/contacts/${id}`);
  loadContacts();
}

// AI 客服对话线索
const chatLeads = ref([]);
const chatDetail = ref([]);
const showChatDetail = ref(false);
const chatDetailSession = ref(null);
async function loadChatLeads() {
  try {
    const { data } = await axios.get('/api/chat/leads');
    if (data.code === 0) chatLeads.value = data.data;
  } catch(e) {}
}
async function viewChatDetail(lead) {
  try {
    chatDetailSession.value = lead;
    const { data } = await axios.get(`/api/chat/${lead.session_key}`);
    if (data.code === 0) { chatDetail.value = data.data; showChatDetail.value = true; }
  } catch(e) { alert('加载对话失败'); }
}
function closeChatDetail() { showChatDetail.value = false; }

// 公司
const companyForm = reactive({});

// 模板订单
const tplOrders = ref([]);
const tplOrderFilter = ref('');
const tplConfigForm = reactive({ site_name: '', payment_wechat_qr: '' });
async function loadTplOrders() {
  try {
    const params = { pageSize: 100 };
    if (tplOrderFilter.value !== '') params.status = tplOrderFilter.value;
    const { data } = await axios.get('/api/templates/admin/orders', { params });
    if (data.code === 0) {
      // 后端返回的是数组 data.data；兼容 {list} 和 数组 两种结构
      tplOrders.value = Array.isArray(data.data) ? data.data : (data.data && data.data.list) || [];
    }
  } catch(e) {}
}
async function confirmTplOrder(id) {
  if (!confirm('确认已到账？确认后买家可下载模板')) return;
  await axios.put(`/api/templates/admin/order/${id}`, { status: 2 });
  loadTplOrders();
}
async function cancelTplOrder(id) {
  if (!confirm('确认取消？')) return;
  await axios.put(`/api/templates/admin/order/${id}`, { status: 4 });
  loadTplOrders();
}

// 套餐订单
const pkgOrders = ref([]);
const pkgOrderFilter = ref('');
async function loadPkgOrders() {
  try {
    const { data } = await axios.get('/api/packages/admin/orders');
    if (data.code === 0) {
      let list = data.data;
      if (pkgOrderFilter.value !== '') list = list.filter(o => String(o.status) === pkgOrderFilter.value);
      pkgOrders.value = list;
    }
  } catch(e) {}
}
async function updatePkgOrder(id, status) {
  await axios.put(`/api/packages/admin/orders/${id}`, { status: +status });
  loadPkgOrders();
}

// 模板管理
const tpls = ref([]);
const showTplForm = ref(false);
const tplForm = reactive({ id: null, name: '', slug: '', description: '', featuresText: '', preview_images: '', demo_url: '', category: '', level: 'standard', price: 200, download_url: '', status: 1, sort_order: 0 });
async function loadTpls() {
  try {
    const { data } = await axios.get('/api/templates/admin/list');
    if (data.code === 0) tpls.value = data.data;
  } catch(e) {}
}
function openTplForm(t) {
  if (t) {
    Object.assign(tplForm, {
      id: t.id, name: t.name, slug: t.slug, description: t.description,
      featuresText: Array.isArray(t.features) ? t.features.join('\n') : '',
      preview_images: Array.isArray(t.preview_images) ? t.preview_images.join(',') : (t.preview_images || ''),
      demo_url: t.demo_url || '', category: t.category || '', level: t.level, price: t.price,
      download_url: t.download_url || '', status: t.status ?? 1, sort_order: t.sort_order ?? 0
    });
  } else {
    Object.assign(tplForm, { id: null, name: '', slug: '', description: '', featuresText: '', preview_images: '', demo_url: '', category: '', level: 'standard', price: 200, download_url: '', status: 1, sort_order: 0 });
  }
  showTplForm.value = true;
}
async function saveTpl() {
  try {
    const features = tplForm.featuresText.split('\n').filter(Boolean);
    await axios.post('/api/templates/admin/save', { ...tplForm, features });
    showTplForm.value = false;
    loadTpls();
  } catch(e) { alert('保存失败'); }
}
async function delTpl(id) {
  if (!confirm('确定删除？')) return;
  await axios.delete(`/api/templates/admin/${id}`);
  loadTpls();
}

async function loadTplConfig() {
  try {
    const { data } = await axios.get('/api/config');
    if (data.code === 0) Object.assign(tplConfigForm, data.data);
  } catch(e) {}
}
async function saveTplConfig() {
  try {
    await axios.put('/api/config', tplConfigForm);
    alert('保存成功');
  } catch(e) { alert('保存失败'); }
}

async function loadCompany() {
  const { data } = await axios.get('/api/company');
  if (data.code === 0) Object.assign(companyForm, data.data);
}
async function saveCompany() {
  await axios.put('/api/company', companyForm);
  alert('保存成功');
}

function formatDate(d) { return d ? new Date(d).toLocaleString('zh-CN') : ''; }
function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

function loadAll() {
  loadServices();
  loadCases();
  loadArticles();
  loadContacts();
  loadChatLeads();
  loadCompany();
  loadTplOrders();
  loadPkgOrders();
  loadTpls();
  loadTplConfig();
}

onMounted(() => { if (token.value) loadAll(); });
watch(activeTab, (v) => {
  if (v === 'services') loadServices();
  if (v === 'cases') loadCases();
  if (v === 'articles') loadArticles();
  if (v === 'contacts') loadContacts();
  if (v === 'company') loadCompany();
  if (v === 'tplOrders') loadTplOrders();
  if (v === 'pkgOrders') loadPkgOrders();
  if (v === 'tpls') loadTpls();
  if (v === 'tplConfig') loadTplConfig();
});
</script>

<style scoped>
.login-wrap { min-height: 100vh; background: linear-gradient(135deg, #1E40AF, #3B82F6); display: flex; align-items: center; justify-content: center; padding: 24px; }
.login-box { background: white; border-radius: 16px; padding: 48px; width: 100%; max-width: 400px; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
.login-logo { width: 56px; height: 56px; background: linear-gradient(135deg, var(--primary), var(--primary-light)); color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; margin: 0 auto 16px; }
.login-box h2 { text-align: center; color: var(--primary-dark); margin-bottom: 32px; font-size: 22px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 14px; margin-bottom: 6px; font-weight: 500; }
.form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px 14px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; font-family: inherit; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.admin-wrap { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
.sidebar { background: #0F172A; color: #94A3B8; padding: 24px 0; display: flex; flex-direction: column; }
.sidebar-logo { color: white; font-size: 20px; font-weight: 700; text-align: center; padding: 0 24px 24px; border-bottom: 1px solid #1E293B; }
.sidebar nav { flex: 1; padding: 16px 0; }
.sidebar nav a { display: block; padding: 12px 24px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.sidebar nav a:hover { background: rgba(255,255,255,0.05); color: white; }
.sidebar nav a.active { background: var(--primary); color: white; }
.logout-btn { margin: 16px; padding: 10px; background: transparent; color: #94A3B8; border: 1px solid #334155; border-radius: 6px; cursor: pointer; }
.logout-btn:hover { background: #1E293B; color: white; }
.home-btn { display: block; margin: 0 16px 8px; padding: 10px; background: rgba(255,255,255,0.06); color: #CBD5E1; text-decoration: none; text-align: center; border: 1px solid #334155; border-radius: 6px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
.home-btn:hover { background: var(--primary); color: white; border-color: var(--primary); }

.admin-main { background: var(--bg-soft); }
.admin-header { background: white; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
.admin-header h2 { font-size: 20px; color: var(--primary-dark); }
.admin-info { font-size: 14px; color: var(--text-light); }

.panel { padding: 32px; }
.panel > .btn { margin-bottom: 16px; }
.data-table { width: 100%; background: white; border-radius: 12px; overflow: hidden; border-collapse: collapse; box-shadow: var(--shadow); }
.data-table th, .data-table td { padding: 14px 16px; text-align: left; border-bottom: 1px solid var(--border); font-size: 14px; }
.data-table th { background: var(--bg-soft); font-weight: 600; color: var(--primary-dark); }
.data-table tbody tr:hover { background: var(--bg-soft); }
.badge { padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.badge-on { background: rgba(16, 185, 129, 0.1); color: #059669; }
.badge-off { background: rgba(107, 114, 128, 0.1); color: #6B7280; }
.badge-warn { background: rgba(245, 158, 11, 0.1); color: #D97706; }
.btn-link { background: transparent; border: none; color: var(--primary); cursor: pointer; margin-right: 12px; font-size: 14px; }
.btn-link.danger { color: #DC2626; }
.btn-link:hover { text-decoration: underline; }

.company-form { background: white; padding: 24px; border-radius: 12px; box-shadow: var(--shadow); max-width: 800px; }

.modal-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 999; padding: 24px; }
.modal { background: white; border-radius: 12px; padding: 32px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.modal h3 { font-size: 20px; margin-bottom: 20px; color: var(--primary-dark); }
.modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
.modal .btn { background: var(--bg-soft); color: var(--text); }
.modal .btn-primary { background: var(--primary); color: white; }

@media (max-width: 768px) {
  .admin-wrap { grid-template-columns: 1fr; }
  .sidebar { display: none; }
}

/* AI 客服对话 */
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-head h3 { margin: 0; }
.chat-lead-info { background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #3730a3; margin-bottom: 14px; }
.chat-detail-body { max-height: 55vh; overflow-y: auto; background: #f8fafc; border-radius: 8px; padding: 14px; border: 1px solid #e5e7eb; }
.chat-msg { margin-bottom: 12px; }
.chat-msg .chat-msg-role { font-size: 11px; color: #64748b; font-weight: 600; margin-bottom: 2px; display: block; }
.chat-msg-content { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; font-size: 13px; line-height: 1.6; color: #1f2937; }
.chat-msg.user .chat-msg-content { background: #1E40AF; color: #fff; border-color: #1E40AF; }
.chat-msg.user .chat-msg-role { color: #1E40AF; }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.muted-hint { color: #94a3b8; font-size: 13px; margin-bottom: 14px; }
.btn-link.success { color: #059669; }
</style>