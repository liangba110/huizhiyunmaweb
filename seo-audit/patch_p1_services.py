#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P1 薄内容扩写（完整函数替换版）"""
import shutil, datetime, subprocess

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p1b_{TS}')
n = 0

def rep(old, new, tag):
    global src, n
    if old not in src:
        print(f'  ✗ [{tag}] 未找到锚点'); return False
    src = src.replace(old, new, 1); n += 1
    print(f'  ✓ [{tag}]'); return True

# ---------- 1) servicesBody 整体替换 ----------
OLD_SVC = """function servicesBody(services) {
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>企业建站 · 小程序 · APP开发服务</h1><p>从需求分析到上线运营的一站式数字化解决方案。</p></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
${services.map(s => `<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3>${esc(s.title)}</h3><p class="price" style="color:#dc2626;font-weight:600;font-size:16px;">参考价格：¥${Number(s.price_min).toLocaleString()} - ¥${Number(s.price_max).toLocaleString()}</p><p>${esc(trunc(s.description, 150))}</p></article>`).join('\\n')}
</div></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>常见问题</h2><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">
<h3>开发周期一般多长？</h3><p>小程序开发周期通常为4-8周，APP开发为8-16周，网站建设为2-6周，具体取决于功能复杂度和页面数量。</p>
<h3>源码是否交付？</h3><p>是的，我们坚持源码全部交付客户，不捆绑托管，让您真正掌握数字化资产。</p>
<h3>后期维护费用如何？</h3><p>免费维护期3-12个月，之后按年收取维护费用，通常为建设费用的15%-20%。</p>
</div></section>`;
}"""

NEW_SVC = """function servicesBody(services) {
  const S = 'style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;"';
  const H2 = 'style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;"';
  const H3 = 'style="font-size:17px;color:#1e293b;margin:22px 0 8px;"';
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>企业建站 · 小程序 · APP开发服务</h1><p>从需求分析到上线运营的一站式数字化解决方案。源码交付，终身维护。</p></section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:50px 20px 0;"><h2 ${H2}>服务项目与参考价格</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
${services.map(s => `<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;transition:all .3s;"><h3>${esc(s.title)}</h3><p class="price" style="color:#dc2626;font-weight:600;font-size:16px;">参考价格：¥${Number(s.price_min).toLocaleString()} - ¥${Number(s.price_max).toLocaleString()}</p><p>${esc(trunc(s.description, 150))}</p></article>`).join('\\n')}
</div></section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>三大主线服务详解</h2>

<h3 ${H3}>一、微信小程序开发</h3>
<p>微信小程序是当前中小企业获客成本最低的线上入口之一。汇智云码提供的<strong>小程序开发</strong>服务覆盖电商商城、点餐外卖、预约到店、会员管理、内容资讯、企业展示、工具类应用等主要场景，支持微信支付、微信登录、订阅消息、企业微信互通、直播带货等全部官方能力。</p>
<p>技术实现上，我们根据项目复杂度在小程序原生开发与 uni-app / Taro 跨端框架之间做选型：功能简单、追求极致体验的项目用原生；需要在微信小程序、支付宝小程序、抖音小程序、H5 多端同时上线的项目用跨端框架，一套代码多端复用，可节省 30%-40% 的开发成本。</p>
<p>小程序的开发周期通常在 2-6 周。我们需要提醒客户的是：<strong>小程序上线前必须完成 ICP 备案与微信平台审核</strong>，备案耗时约 3-20 个工作日（各省通信管理局审核速度不同），这段时间应提前规划，避免影响业务上线节点。</p>

<h3 ${H3}>二、APP 定制开发</h3>
<p>当业务需要推送通知、调用手机硬件（相机、蓝牙、NFC、定位）、离线使用，或者需要上架应用商店建立品牌认知时，APP 是比小程序更合适的选择。我们提供 iOS 与 Android 双端<strong>APP 定制开发</strong>，技术路线包括原生开发（Swift / Kotlin）、React Native 与 Flutter 跨平台开发三条路线。</p>
<p>选型建议：对性能与硬件调用要求极高的项目（如视频处理、大型游戏、复杂蓝牙设备联动）选原生；追求开发效率与成本可控、UI 交互常规的项目选 Flutter 或 React Native，一套代码双端运行，能显著压缩工期与预算。我们在需求阶段会出具具体的选型说明，把利弊讲清楚再让客户决策。</p>
<p>APP 开发周期通常 6-16 周，上架 App Store 需通过苹果审核（首次审核建议预留 1-2 周，含被驳回后修改重提的时间），安卓各应用市场审核相对宽松，一般 1-3 个工作日出结果。</p>

<h3 ${H3}>三、企业网站建设</h3>
<p>网站是企业最稳定的数字资产——它不受平台规则变动影响，不依赖第三方账号，且是百度等搜索引擎的流量主入口。我们提供的<strong>企业网站建设</strong>服务包括企业官网、品牌形象站、营销型落地页、外贸多语言站、产品展示站以及后台内容管理系统（CMS）。</p>
<p>所有网站均采用响应式设计，在电脑、平板、手机三端自适应；标配 HTTPS、SEO 基础优化（TDK、结构化数据、sitemap、robots）、访问统计接入与基础安全防护。建站周期通常 2-6 周，域名与服务器可代购也可使用客户现有资源。</p>
<p>网站上线后我们提供完整的后台使用培训，客户可自行更新新闻、产品、案例等内容，无需每次改动都找技术。这一步看似简单，但决定了网站能否长期保持活力——我们遇到过太多"上线即死站"的案例，根本原因就是客户无法自行更新内容。</p>

<h3 ${H3}>四、SaaS 系统与定制软件</h3>
<p>除上述三大主线外，我们还承接企业内部的<strong>SaaS 系统开发与定制软件</strong>项目，包括 CRM 客户管理、ERP 进销存、OA 协同办公、工单派单、数据看板、多租户 SaaS 平台等。这类项目通常涉及复杂的角色权限体系、审批流程与数据报表，需求调研阶段会更长（通常 1-2 周），开发周期 2-6 个月不等。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>常见问题</h2>
<h3 ${H3}>1. 开发周期一般多长？</h3>
<p>小程序开发周期通常为 2-6 周，APP 开发为 6-16 周，网站建设为 2-6 周，SaaS 系统为 2-6 个月。具体取决于功能复杂度和页面数量。需要提醒的是，上面说的是纯开发时间，不含备案与平台审核时间，实际排期时建议预留 2-4 周缓冲。</p>
<h3 ${H3}>2. 源码是否交付？</h3>
<p>是的，所有项目源码全部交付客户，包含前端代码、后端代码、数据库结构与部署文档。我们不采用"只给账号不给源码"的托管模式，客户完全掌握自己的数字化资产，后续可自行维护或交由任意第三方接手。</p>
<h3 ${H3}>3. 后期维护费用如何？</h3>
<p>项目交付后提供 3-12 个月免费维护期（视项目规模而定），期间修复 Bug、协助服务器迁移、应对平台规则变化均不收费。免费期结束后可按年签订维护协议，费用通常为建设费用的 15%-20%；也可以选择不签维护协议，需要时按次付费。</p>
<h3 ${H3}>4. 可以先做一部分功能试试吗？</h3>
<p>可以。我们支持分期开发：先交付核心功能上线验证业务模式，跑通后再迭代次要功能。这种方式能显著降低前期投入风险，尤其适合业务模式尚在摸索阶段的创业项目。</p>
<h3 ${H3}>5. 已有系统能二次开发吗？</h3>
<p>可以，但需要先做代码评估。如果原系统技术栈过旧、代码结构混乱，二次开发的成本可能接近重做，这种情况我们会如实告知并给出两套方案对比，由客户选择。我们不会为了接单而隐瞒技术风险。</p>
<h3 ${H3}>6. 需求变更怎么处理？</h3>
<p>开发过程中提出新需求是常态。我们按"人天"计价：小改动（1-2 天工作量）通常免费包含；较大改动或新增功能模块，评估工时后出具增量报价单，确认后执行。所有变更都会在项目群里书面记录，避免后期扯皮。</p>
<h3 ${H3}>7. 你们在青岛，外地客户怎么合作？</h3>
<p>公司 60% 以上客户来自山东省外。合作方式为线上为主：需求沟通用微信/视频会议，原型与设计稿在线评审，开发过程每周同步进度，验收后远程协助部署。必要时可安排驻场开发，差旅费用实报实销。多年实践下来，远程协作的效率与本地合作没有实质差别。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 60px;">
<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;text-align:center;">
<h2 ${H2}>不确定该选哪种方案？</h2>
<p>把您的业务需求告诉我们，我们会免费给出技术选型建议和参考报价，不签约也没关系。</p>
<p style="margin-top:20px;"><a href="${SITE}/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">免费获取方案与报价</a></p>
</div>
</section>`;
}"""
rep(OLD_SVC, NEW_SVC, 'servicesBody 扩写(1292→约3000字)')

open(GEN, 'w', encoding='utf-8').write(src)
print(f'\n共 {n} 处修改')
subprocess.run(f'chown www-data:www-data {GEN}', shell=True)
