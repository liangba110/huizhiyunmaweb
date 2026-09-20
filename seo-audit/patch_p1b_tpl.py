#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P1-b：contact / templates / about 扩写"""
import shutil, datetime, subprocess

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p1c_{TS}')
n = 0
def rep(old, new, tag):
    global src, n
    if old not in src:
        print(f'  ✗ [{tag}] 未找到'); return False
    src = src.replace(old, new, 1); n += 1; print(f'  ✓ [{tag}]'); return True

# ---------- templates 页扩写 ----------
OLD_TPL = """function templatesBody(templates) {
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>企业网站模板商城</h1><p>精选企业级网站模板，购买后源码交付，支持二次开发。含在线演示。</p></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">"""

NEW_TPL = """function templatesBody(templates) {
  const S = 'style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;"';
  const H2 = 'style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;"';
  const H3 = 'style="font-size:17px;color:#1e293b;margin:22px 0 8px;"';
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>企业网站模板商城</h1><p>精选企业级网站模板，购买后源码交付，支持二次开发。含在线演示。</p></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:50px 20px 0;"><h2 ${H2}>模板列表</h2><div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">"""
rep(OLD_TPL, NEW_TPL, 'templatesBody 头部+列表标题')

# templates 尾部追加详情说明
OLD_TPL_END = """</div></section>`;
}

function packagesBody(packages) {"""
NEW_TPL_END = """</div></section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>关于网站模板，你需要知道的几件事</h2>
<p>很多客户在咨询时第一句话是"你们有没有现成模板，便宜点的"。坦诚说，<strong>模板和定制是两种完全不同的产品</strong>，适用的场景也不一样。这里把区别讲清楚，方便你做决策。</p>

<h3 ${H3}>一、模板适合什么场景？</h3>
<p>如果你的需求是"先有个能对外展示的官方网站"——展示公司简介、产品服务、联系方式、新闻动态，不需要复杂的会员体系、在线交易、后台审批流程，那么模板是性价比最高的选择。我们的模板均为完整可运行的前后端代码，不是只给设计稿或静态 HTML，购买后即可部署上线，通常 1-3 个工作日就能完成。</p>
<p>模板特别适合：初创公司刚起步阶段需要一个官网撑门面；企业已有主站，需要为某个产品线或活动做一个独立的展示站；预算有限但希望视觉上不输同行。</p>

<h3 ${H3}>二、模板不适合什么场景？</h3>
<p>如果业务涉及以下任一项，模板会很快成为瓶颈，建议直接考虑定制开发：</p>
<p><strong>复杂的业务流程</strong>——比如需要多角色权限（客户、员工、管理员各自看到不同内容）、审批流转、订单状态机。模板的权限体系通常只有"管理员/普通用户"两级，改造成本可能高于重写。</p>
<p><strong>在线交易与支付</strong>——涉及购物车、优惠券、库存扣减、支付回调、退款流程的电商类需求。模板可能带简单商城功能，但缺乏针对具体业务场景的营销玩法（拼团、秒杀、分销），后期扩展会非常别扭。</p>
<p><strong>与现有系统对接</strong>——需要对接企业已有的 ERP、CRM、OA 系统，或调用第三方 API 做数据同步。这类需求需要针对性的接口开发，模板无法直接支持。</p>
<p><strong>强品牌调性要求</strong>——品牌视觉规范严格，需要高度定制的交互动效与页面结构。模板的视觉框架是固定的，强行改造往往"四不像"，不如从零设计。</p>

<h3 ${H3}>三、模板购买后的交付内容</h3>
<p>每套模板交付物包含：</p>
<p>· 完整前端源码（含所有页面与组件）<br>· 完整后端源码与数据库结构文件<br>· 部署文档（含环境要求、部署步骤、常见问题）<br>· 后台管理系统的账号与使用说明<br>· 30 天内的免费技术支持（协助部署、答疑）</p>
<p>我们不提供"加密源码"或"授权码绑定域名"这类做法——交付即完整交付，你拿到的是可以任意修改、任意部署的完整代码。</p>

<h3 ${H3}>四、模板能升级为定制吗？</h3>
<p>可以。常见的过渡方式是：先用模板上线抢占时间窗口，业务验证跑通后再基于原模板做二次开发，逐步替换核心模块。这样做的好处是前期投入小、上线快，风险可控。我们会在二次开发前做一次代码评估，给出"在模板上改"与"重写"的成本对比，由你选择更划算的方案。</p>

<h3 ${H3}>五、购买前建议先做什么？</h3>
<p>建议先看在线演示，把每个页面的交互点一遍，确认结构符合你的业务逻辑。如果演示看了还是拿不准，可以直接联系我们说明业务场景，我们会告诉你这套模板是否合适——如果确实不合适，我们会直接建议你做定制，而不是硬推模板给你。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 60px;">
<div class="content" ${S} style="text-align:center;">
<h2 ${H2}>没找到合适的模板？</h2>
<p>告诉我们你的行业与功能需求，我们可以为你定制开发，或者推荐最接近的模板加改造方案。</p>
<p style="margin-top:20px;"><a href="${SITE}/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">咨询模板或定制方案</a></p>
</div>
</section>`;
}

function packagesBody(packages) {"""
rep(OLD_TPL_END, NEW_TPL_END, 'templatesBody 详情补充')

open(GEN, 'w', encoding='utf-8').write(src)
print(f'\n共 {n} 处')
subprocess.run(f'chown www-data:www-data {GEN}', shell=True)
