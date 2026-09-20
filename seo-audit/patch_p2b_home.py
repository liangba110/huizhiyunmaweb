#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2-b：首页内容扩充+内链 / solutions索引页扩写 / 面包屑结构化数据落地"""
import shutil, datetime, subprocess

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p2b_{TS}')
n = 0
def rep(old, new, tag):
    global src, n
    if old not in src:
        print('  X [%s] 未找到锚点' % tag); return False
    src = src.replace(old, new, 1); n += 1; print('  OK [%s]' % tag); return True

# ============ 1) 首页扩写：加实质正文 + FAQ + 内链到 /packages /solutions /about ============
OLD_HOME_TAIL = """<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">
  <h2>最新资讯</h2>
  ${cardGrid(articles.slice(0, 6).map(a => ({ href: `/articles/${a.id}`, title: a.title, meta: a.published_at ? String(a.published_at).slice(0, 10) : '', summary: a.summary })), 'article')}
</section>
`;
}"""

NEW_HOME_TAIL = """<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">
  <h2>最新资讯</h2>
  ${cardGrid(articles.slice(0, 6).map(a => ({ href: `/articles/${a.id}`, title: a.title, meta: a.published_at ? String(a.published_at).slice(0, 10) : '', summary: a.summary })), 'article')}
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:20px 20px 0;">
  <div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
    <h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">我们能为你做什么</h2>
    <p>汇智云码科技是一家位于青岛的软件开发公司，自 2018 年起专注为中小企业提供数字化解决方案。我们不接硬件开发、不做纯设计外包，把精力集中在三件最擅长的事上：<strong>微信小程序开发、APP 定制开发、企业网站建设</strong>。此外承接企业内部的 SaaS 系统与定制管理软件开发。</p>

    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">微信小程序开发</h3>
    <p>小程序是我们做得最多的品类。扫码点餐、电商商城、预约到店、会员管理、企业展示、工具应用——这些场景我们都有成熟的技术积累，不是从零摸索。技术路线上，功能简单的项目用微信原生开发保证体验，需要同时覆盖微信、支付宝、抖音多端的项目用 uni-app 或 Taro 跨端框架，一套代码复用，能省下三到四成开发成本。小程序开发周期通常 2-6 周，但请注意<strong>上线前必须完成 ICP 备案</strong>，各省审核速度不同，快则 3 天慢则 20 个工作日，这个时间要提前算进你的上线计划。</p>

    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">APP 定制开发</h3>
    <p>需要推送通知、调用相机蓝牙定位等硬件能力、离线可用，或者要上架应用商店建立品牌认知时，APP 比小程序更合适。我们提供 iOS 与 Android 双端开发，覆盖原生（Swift / Kotlin）、React Native、Flutter 三条技术路线。选型没有标准答案：追求极致性能与复杂硬件联动的选原生，追求开发效率与成本可控的选 Flutter 或 React Native。我们会在需求阶段出具书面选型说明，把每条路线的利弊、工期与费用差异讲清楚，再让你决策。APP 开发周期通常 6-16 周。</p>

    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">企业网站建设</h3>
    <p>网站是企业最稳定的数字资产——不依赖任何平台规则、不会被封号、是搜索引擎流量的主入口。我们建设的企业官网全部采用响应式设计，电脑平板手机三端自适应，标配 HTTPS、SEO 基础优化（标题描述、结构化数据、sitemap、robots）、访问统计与基础安全防护。建站周期 2-6 周，上线后提供后台使用培训，你可以自行更新新闻、产品、案例，不必每次改文字都找技术。这一点看似简单，却是很多"上线即死站"的根源。</p>

    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">为什么选择我们</h3>
    <p><strong>自有团队直营交付。</strong>需求分析、设计、开发、测试、运维全部由公司正式员工完成，不转包。外包行业最大的问题就是层层转包导致质量衰减与工期失控，我们从结构上避免了这一点。</p>
    <p><strong>源码完整交付。</strong>交付物包含完整前后端源码、数据库脚本、部署文档。不做"只给账号不给源码"的技术锁定，你可以自由选择后续由谁维护。</p>
    <p><strong>价格明码标价。</strong>标准化套餐在官网公开标价，定制项目出具逐项列明的报价单，签约后不加价（需求变更除外）。</p>
    <p><strong>行业经验可复用。</strong>已服务餐饮、零售、教育、医疗、房产、汽车、旅游、酒店、美业、家政、婚庆、物流、农业、制造等 14 个行业，对行业业务流程有现成认知，能显著缩短需求沟通周期。</p>

    <p style="margin-top:24px;text-align:center;">
      <a href="${SITE}/packages" style="display:inline-block;padding:12px 28px;background:#dc2626;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;margin-right:12px;">查看明码标价套餐</a>
      <a href="${SITE}/solutions" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;margin-right:12px;">行业解决方案</a>
      <a href="${SITE}/about" style="display:inline-block;padding:12px 28px;background:#fff;color:#2563eb;border:2px solid #2563eb;border-radius:8px;font-weight:bold;text-decoration:none;">了解公司团队</a>
    </p>
  </div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:20px 20px 0;">
  <div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
    <h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">常见问题</h2>
    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">开发一个项目大概要多少钱？</h3>
    <p>价格取决于功能量，没有一个"起步价"能回答这个问题。我们官网的<a href="${SITE}/packages">开发套餐页面</a>按小程序、APP、网站三大类目给出了标准化配置的明码标价，可以据此判断大概区间。定制项目在需求确认后出具逐项报价单，列明每项功能的工时与费用。需要提醒的是：看到"小程序 3000 元全包"这类报价时请谨慎——这类通常是模板改字，无法承载真实业务逻辑，后期改造成本往往高于重做。</p>
    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">开发周期多久？</h3>
    <p>网站建设 2-6 周，小程序 2-6 周，APP 6-16 周，SaaS 系统 2-6 个月。以上是纯开发时间，不含 ICP 备案与平台审核时间（建议预留 2-4 周缓冲）。我们支持分期开发——先交付核心功能上线验证业务，跑通后再迭代次要功能，这样能降低前期投入风险。</p>
    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">源码会交付吗？后期维护怎么算？</h3>
    <p>源码全部交付，包含前后端代码、数据库结构与部署文档。验收后提供 3-12 个月免费维护期（视项目规模而定），期间修复 Bug、协助服务器迁移、应对平台规则变化均不收费。免费期结束后可签年度维护协议（通常为建设费用的 15%-20%），或按次付费。</p>
    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">你们在青岛，外地客户怎么合作？</h3>
    <p>公司六成以上客户来自山东省外。合作方式以线上为主：需求沟通用微信或视频会议，原型设计稿在线评审，开发过程每周同步进度，验收后远程协助部署。多年实践下来，远程协作与本地合作在效率上没有实质差别。必要时也可安排驻场，差旅实报实销。</p>
    <h3 style="font-size:17px;color:#1e293b;margin:22px 0 8px;">需求还没想清楚，可以先聊聊吗？</h3>
    <p>可以，而且我们建议这样做。需求和方案梳理完全免费，不签约也没有关系。实际经验中，客户最初描述的需求与最终实现的功能常有 30%-50% 的差异，这个差异在写代码之前暴露出来，比开发到一半再改要省太多成本。<a href="${SITE}/contact">把大致想法告诉我们</a>，我们会帮你把需求理清楚。</p>
  </div>
</section>
`;
}"""
rep(OLD_HOME_TAIL, NEW_HOME_TAIL, '首页扩充正文+FAQ+内链')

# ============ 2) solutions 索引页扩写 ============
OLD_NAV = """  const navHtml = '<section class="hero" style="background:linear-gradient(135deg,#1e3a8a,#3730a3,#6d28d9);color:#fff;padding:80px 20px;text-align:center;"><h1>行业解决方案 - 数字化转型</h1><p>汇智云码科技为各行业提供专业的数字化解决方案</p></section>' +
    '<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;">' +
    '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">' +
    INDUSTRIES.map(ind => '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;"><h3><a href="' + SITE + '/solutions/' + ind.slug + '">' + ind.name + '行业解决方案</a></h3><p>' + ind.description + '</p></article>').join('\\n') +
    '</div></section>';"""

NEW_NAV = """  const _S = 'style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;"';
  const _H2 = 'style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;"';
  const _H3 = 'style="font-size:17px;color:#1e293b;margin:22px 0 8px;"';
  const navHtml = '<section class="hero" style="background:linear-gradient(135deg,#1e3a8a,#3730a3,#6d28d9);color:#fff;padding:80px 20px;text-align:center;"><h1>行业解决方案 - 数字化转型</h1><p>汇智云码科技为 14 个行业提供专业的数字化解决方案，均为源码交付、终身维护。</p></section>' +
    '<section class="section" style="max-width:1200px;margin:0 auto;padding:50px 20px 0;">' +
    '<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">' +
    INDUSTRIES.map(ind => '<article class="card" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;"><h3><a href="' + SITE + '/solutions/' + ind.slug + '">' + ind.name + '行业解决方案</a></h3><p>' + ind.description + '</p></article>').join('\\n') +
    '</div></section>' +
    '<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;"><div class="content" ' + _S + '>' +
    '<h2 ' + _H2 + '>为什么按行业提供方案，而不是卖通用产品？</h2>' +
    '<p>同一个功能需求，在不同行业里的实现方式差异远比想象中大。以"预约"这个看起来最通用的功能为例：</p>' +
    '<p><strong>美业门店的预约</strong>核心是技师排班与工位占用，顾客要指定熟悉的技师，系统必须能避开已被占用的时段；<strong>医院的预约挂号</strong>核心是号源分配与科室分流，需要分时段、限号数、支持退号改约；<strong>家政的预约</strong>核心是人员调度，要考虑服务人员的地理位置、技能标签与在途时间；<strong>婚庆的预约</strong>核心其实是档期锁定，摄影师、司仪、场地的档期不能撞车。</p>' +
    '<p>如果把上面这些塞进一套通用系统，结果必然是一个什么都能做、但什么都不好用的产品。所以我们的做法是：<strong>先按行业沉淀出经过验证的功能集合与业务规则，再在此基础上做企业个性化调整</strong>。这样既避免了从零设计带来的试错成本，又保留了适配具体业务的灵活度。</p>' +
    '<p>如果你所在的行业不在下面这 14 个之列，也没关系——我们的能力底座是通用的开发能力，行业方案只是加快沟通效率的起点，不是可选范围的边界。</p>' +
    '</div></section>' +
    '<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;"><div class="content" ' + _S + '>' +
    '<h2 ' + _H2 + '>行业方案怎么选：先看痛点，不看功能清单</h2>' +
    '<p>我们建议客户在选择方案时，先不要看功能列表，而是先回答三个问题：</p>' +
    '<p><strong>第一个问题：现在最让你头疼的是什么？</strong>是客户留不住、是内部协作乱、还是账目对不上？把最痛的那一个问题写下来，围绕它选功能。很多企业上系统的失败原因不是功能不够，而是一下子上太多，员工用不过来，最后全都闲置。</p>' +
    '<p><strong>第二个问题：谁会用这个系统？</strong>是终端客户、是门店员工、还是总部管理者？不同角色的使用意愿差异极大。面向客户的功能要考虑"扫码即用、三步完成"，面向员工的功能要考虑"能不能减少他们的工作量"——如果新系统让员工的工作变多而不是变少，推行必然失败。</p>' +
    '<p><strong>第三个问题：能接受多长的上线周期？</strong>如果业务等不起，就应该先做能快速上线的核心模块，其余延后。我们发现很多项目之所以失控，是因为把 6 个月的功能量压进 2 个月的工期，结果要么延期，要么质量打折。</p>' +
    '<p>把这三个问题想清楚，再看行业页面里的功能模块列表，就能快速判断哪些是必需的、哪些可以放到第二阶段。如果拿不准，<a href="' + SITE + '/contact">联系我们</a>，我们会免费帮你做一轮需求梳理。</p>' +
    '</div></section>' +
    '<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 0;"><div class="content" ' + _S + '>' +
    '<h2 ' + _H2 + '>各行业常见项目的周期与投入参考</h2>' +
    '<p>下表是基于我们实际交付经验的大致区间，仅作预算与排期参考。真实报价必须基于具体功能清单评估，不同企业的功能量差异可能达到数倍。</p>' +
    '<p><strong>餐饮 · 扫码点餐 + 会员营销</strong>：3-6 周，属于功能边界清晰、可标准化程度高的品类，是小程序最典型也最容易见效的场景。</p>' +
    '<p><strong>零售 · 商城 + 分销裂变</strong>：5-10 周，涉及订单、库存、佣金结算多条链路，商品规格与营销玩法的复杂度是工期的主要变量。</p>' +
    '<p><strong>教育 · 课程 + 学员 + 直播</strong>：6-12 周，直播模块的技术方案选择（自研 vs 接入第三方）会显著影响工期与成本。</p>' +
    '<p><strong>医疗 · 预约挂号 + 报告查询</strong>：6-12 周，工期很大程度上取决于能否对接医院内部系统，院方信息科的配合进度往往是关键路径。</p>' +
    '<p><strong>房产 · 房源 + VR 看房 + 客户管理</strong>：6-12 周，VR 内容的拍摄制作需要单独安排时间，与软件开发可以并行。</p>' +
    '<p><strong>物流 · 运单跟踪 + 车队调度</strong>：8-16 周，是 14 个行业中复杂度较高的一类，涉及实时位置、多端协同与复杂结算逻辑。</p>' +
    '<p><strong>制造 · 生产排程 + 设备管理 + 质量追溯</strong>：8-20 周，通常需要与现有 ERP 对接，老旧设备的联网改造也需要实地勘察，是周期最长、最需要谨慎评估的品类。</p>' +
    '<p>比较简单的品类（如企业展示型网站、基础预约系统）通常在 2-4 周内即可完成。如果你需要更精确的评估，把功能和期望上线时间告诉我们，我们可以给出针对性的排期建议。</p>' +
    '</div></section>' +
    '<section class="section" style="max-width:1200px;margin:0 auto;padding:40px 20px 60px;"><div class="content" ' + _S + ' style="text-align:center;">' +
    '<h2 ' + _H2 + '>相关服务与资源</h2>' +
    '<p><a href="' + SITE + '/services">全部开发服务详解</a> ｜ <a href="' + SITE + '/packages">明码标价开发套餐</a> ｜ <a href="' + SITE + '/cases">交付案例</a> ｜ <a href="' + SITE + '/templates">网站模板商城</a> ｜ <a href="' + SITE + '/articles">行业技术文章</a></p>' +
    '<p style="margin-top:24px;"><a href="' + SITE + '/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">免费获取行业方案与报价</a></p>' +
    '</div></section>';"""
rep(OLD_NAV, NEW_NAV, 'solutions 索引页扩写')

open(GEN, 'w', encoding='utf-8').write(src)
print('\n共 %d 处' % n)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN, shell=True)
print('语法 OK')
