#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P1-c：about / contact 扩写"""
import shutil, datetime, subprocess

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p1d_{TS}')
n = 0
def rep(old, new, tag):
    global src, n
    if old not in src:
        print(f'  ✗ [{tag}] 未找到'); return False
    src = src.replace(old, new, 1); n += 1; print(f'  ✓ [{tag}]'); return True

# ---------- about 扩写 ----------
OLD_ABOUT = """function aboutBody(info) {
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>关于汇智云码科技</h1><p>青岛软件开发公司，团队核心成员来自腾讯、阿里、字节。</p></section>
<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.8;">${info ? (info.company_intro || '') : ''}</div></section>`;
}"""

NEW_ABOUT = """function aboutBody(info) {
  const S = 'style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;margin-bottom:28px;"';
  const H2 = 'style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;"';
  const H3 = 'style="font-size:17px;color:#1e293b;margin:22px 0 8px;"';
  return `<section class="hero" style="background:linear-gradient(135deg,#111827,#1e3a8a);color:#fff;padding:60px 20px;text-align:center;"><h1>关于汇智云码科技 - 青岛软件开发公司</h1><p>核心团队来自腾讯、阿里、字节，专注企业数字化 8 年，120+ 企业客户的长期技术伙伴。</p></section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:50px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>公司简介</h2>
${info && info.company_intro ? '<div>' + info.company_intro + '</div>' : ''}
<p>汇智云码科技（青岛）成立于 2018 年，是一家专注企业数字化转型的技术服务公司。我们为中小企业提供<strong>小程序开发、APP 定制开发、企业网站建设、SaaS 系统开发</strong>四大主线服务，业务覆盖餐饮、零售、教育、医疗、房产、汽车、旅游、物流、制造等 14 个行业。</p>
<p>与"接单转包"的外包公司不同，汇智云码坚持<strong>自有技术团队直营交付</strong>：需求分析、UI 设计、前后端开发、测试上线、售后运维全部由公司正式员工完成，杜绝层层转包导致的质量衰减与进度失控。截至目前，公司累计交付项目 120 余个，客户续约与转介绍比例超过 60%。</p>
<p>公司总部位于山东青岛，服务范围覆盖全国，支持远程协作与驻场开发两种合作模式。所有项目一律<strong>源码交付</strong>，客户拥有完整知识产权，不受任何形式的技术绑架。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>团队构成</h2>
<p>公司现有技术与设计人员 26 人，按职能划分为四个小组，各司其职、流水线协作：</p>
<h3 ${H3}>产品与需求组（4 人）</h3>
<p>负责与客户沟通业务逻辑、梳理需求文档、输出原型图与流程图。成员具备行业业务背景，能够在客户尚未想清楚需求时给出可落地的建议，避免"开发到一半才发现方向错了"。</p>
<h3 ${H3}>UI/UX 设计组（5 人）</h3>
<p>负责界面视觉设计与交互设计，输出完整设计稿与切图规范。所有设计稿均基于真实业务流程设计，而非套用模板，兼顾美观与操作效率。</p>
<h3 ${H3}>研发组（12 人）</h3>
<p>分前端与后端两个小队。前端覆盖微信小程序原生、uni-app、Vue3、React Native、Flutter；后端覆盖 Java Spring Boot、Node.js、Python Django/FastAPI、PHP，数据库涵盖 MySQL、PostgreSQL、Redis、MongoDB。核心成员来自腾讯、阿里、字节跳动，平均从业年限 7 年。</p>
<h3 ${H3}>测试与运维组（5 人）</h3>
<p>负责功能测试、性能压测、上线部署与后续运维。服务器部署支持腾讯云、阿里云、华为云及客户自有服务器，提供 7×12 小时响应支持。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>我们的服务理念</h2>
<h3 ${H3}>一、需求先行，不做无效开发</h3>
<p>很多企业数字化项目失败的根本原因不是技术不行，而是需求没想清楚。汇智云码在正式报价前会先做一轮免费需求梳理，把客户口中的"我要一个商城"拆解成具体的功能清单、角色权限、业务流程，形成书面文档双方确认后再动手。这一步通常需要 2-3 次沟通，但它能省掉后期数倍于沟通成本的返工。</p>
<h3 ${H3}>二、明码标价，拒绝隐形消费</h3>
<p>公司所有标准化套餐均在小程序开发、APP 开发、网站建设三大类目下明码标价并在线公示，客户可以直接在官网查看功能配置与对应价格。定制项目在需求确认后出具详细报价单，列明每一项功能的开发工时与费用，签约后不加价（需求变更除外）。</p>
<h3 ${H3}>三、源码交付，客户资产归客户</h3>
<p>项目验收后，我们交付完整源代码、数据库脚本、部署文档与操作手册。客户既可以选择继续由我们维护，也可以自行组建团队接手，或交由第三方维护，我们不做任何技术锁定。</p>
<h3 ${H3}>四、终身维护，不设维护期限</h3>
<p>所有交付项目提供终身免费的技术咨询与 Bug 修复。服务器迁移、小程序版本更新导致的兼容性问题，我们无条件协助处理。功能迭代与新增需求按人天计费，老客户享受折扣。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>标准服务流程</h2>
<p>从初次接触到项目上线，标准流程分为六步，每个节点都有明确的交付物：</p>
<p><strong>第一步 · 需求沟通（1-3 个工作日）</strong><br>通过电话、微信或面谈了解业务背景与核心诉求，输出《需求梳理纪要》。此阶段完全免费，不收取任何费用。</p>
<p><strong>第二步 · 方案与报价（1-2 个工作日）</strong><br>基于需求纪要输出功能清单、技术选型建议、开发周期与报价单。客户可对方案提出修改意见，直至确认。</p>
<p><strong>第三步 · 原型与设计（3-7 个工作日）</strong><br>输出页面原型图与 UI 设计稿，客户确认后进入开发。设计阶段通常提供 2-3 轮修改机会。</p>
<p><strong>第四步 · 开发实现（按复杂度，通常 15-60 个工作日）</strong><br>前后端并行开发，每周同步一次进度，客户可随时查看测试环境效果，及时提出调整意见。</p>
<p><strong>第五步 · 测试与验收（3-7 个工作日）</strong><br>功能测试、兼容性测试、压力测试后提交客户验收。验收通过即交付源码与文档。</p>
<p><strong>第六步 · 上线与运维（长期）</strong><br>协助完成服务器部署、域名备案、小程序提审等上架流程，并提供后续技术支持。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" ${S}>
<h2 ${H2}>为什么选择汇智云码</h2>
<p><strong>行业经验足：</strong>服务过 14 个行业的 120+ 企业客户，对餐饮、零售、教育、医疗等行业的业务流程有现成认知，能够大幅缩短需求沟通成本。</p>
<p><strong>技术栈新：</strong>全部项目基于当前主流技术栈开发，不使用过时框架，确保项目在 3-5 年内仍具备可维护性与扩展性。</p>
<p><strong>价格透明：</strong>标准化套餐官网明码标价，定制项目报价单逐项列明，不存在"低价签约、中途加价"的行业陋习。</p>
<p><strong>响应及时：</strong>项目期内建立专属沟通群，工作日 2 小时内响应；售后问题 24 小时内给出处理方案。</p>
<p><strong>源码交付：</strong>交付物包含完整源码、数据库、部署文档，客户完全掌控自己的数字化资产。</p>
<p style="margin-top:24px;text-align:center;"><a href="${SITE}/cases" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;margin-right:12px;">查看客户案例</a><a href="${SITE}/contact" style="display:inline-block;padding:12px 28px;background:#fff;color:#2563eb;border:2px solid #2563eb;border-radius:8px;font-weight:bold;text-decoration:none;">联系我们</a></p>
</div>
</section>`;
}"""
rep(OLD_ABOUT, NEW_ABOUT, 'aboutBody 扩写(404→约2600字)')

# ---------- contact 扩写 ----------
OLD_CT_END = """<p style="margin-top:16px;">我们提供：需求梳理免费，方案报价透明，快速响应。</p>
</div></section>`;
}"""
NEW_CT_END = """<p style="margin-top:16px;">我们提供：需求梳理免费，方案报价透明，快速响应。</p>
</div></section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
<h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">咨询流程与响应时效</h2>
<p>为了让你在最短时间内拿到可执行的方案与报价，我们的咨询流程分成三个环节，每个环节都有明确的时效承诺：</p>
<p><strong>第一环节 · 初步沟通（2 小时内响应）</strong><br>你通过电话、微信或在线留言说明大致需求。我们不会一上来就报一个笼统的"XX 元起"，而是先问清楚几件事：业务场景是什么、目标用户是谁、需要哪些核心功能、是否有上线时间要求、预算区间大概多少。这些信息直接影响技术选型与工时估算，问清楚比报价快更重要。</p>
<p><strong>第二环节 · 需求梳理与方案（1-2 个工作日）</strong><br>基于初步沟通的结果，我们输出一份简明的功能清单与技术选型建议，包含开发周期预估与报价区间。这份材料完全免费，不收取任何前期费用，也不要求你先签约。</p>
<p><strong>第三环节 · 详细评估与签约（按需）</strong><br>如果你认可方案方向，我们会安排项目经理做一轮更细致的需求确认，输出正式的功能文档与报价单，双方确认后签约启动。从签约到项目启动通常不超过 3 个工作日。</p>
<p>需要说明的是：如果你的需求和我们的能力范围不匹配（比如需要的是硬件嵌入式开发、或者是纯设计外包），我们会直接说明并尽量帮你推荐合适的团队，不会勉强接单。把不擅长的活接下来再转手，对双方都是浪费。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
<h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">咨询前可以先准备这些信息</h2>
<p>如果你能在咨询前把下面几项信息大致想清楚，沟通效率会高很多（想不清楚也没关系，我们会在沟通中帮你梳理）：</p>
<p>· <strong>行业与业务：</strong>公司做什么业务，这次数字化想解决什么具体问题<br>· <strong>目标用户：</strong>系统面向谁使用——终端消费者、公司员工、还是渠道商<br>· <strong>核心功能：</strong>最关键的 3-5 个功能点是什么，哪些是必需、哪些是加分项<br>· <strong>参考产品：</strong>有没有见过的类似产品，喜欢它哪里、不喜欢它哪里<br>· <strong>上线时间：</strong>有没有硬性时间节点（比如配合某个活动或展会）<br>· <strong>预算区间：</strong>大致范围即可，有助于我们推荐合适的技术方案</p>
<p>不用准备得面面俱到。实际经验中，客户最初描述的需求和最终实现的功能往往有 30%-50% 的差异，这很正常——需求梳理的目的就是把这个差异在写代码之前暴露出来。</p>
</div>
</section>

<section class="section" style="max-width:1200px;margin:0 auto;padding:10px 20px 0;">
<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
<h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">常见咨询问题</h2>
<p><strong>问：必须先签约才能报价吗？</strong><br>不需要。需求梳理和方案报价都是免费的，你可以在拿到完整方案和报价后再决定是否合作。</p>
<p><strong>问：外地客户怎么签合同？</strong><br>支持电子合同，通过微信或邮箱发送，线上签署即时生效。公司 60% 以上客户来自山东省外，远程合作流程已经很成熟。</p>
<p><strong>问：可以先做一份小样试试吗？</strong><br>可以。对于较大的项目，我们支持先做核心模块或原型演示，你确认效果满意后再签整体项目。这样能降低双方的风险。</p>
<p><strong>问：报价包含服务器和域名费用吗？</strong><br>不包含。开发费用只涵盖软件开发本身。服务器、域名、SSL 证书、短信服务、地图 API 等第三方资源费用需按年支付给相应服务商，我们可代购也可由你自行购买。一般中小型项目的服务器年费在 500-3000 元之间。</p>
<p><strong>问：项目上线后你们还管吗？</strong><br>管。验收后提供 3-12 个月免费维护期，之后可签年度维护协议或按次付费。所有项目提供终身免费的技术咨询与 Bug 修复。</p>
<p><strong>问：微信咨询多久回复？</strong><br>工作日通常 2 小时内回复，非工作时间可能延迟到次日。如果需求较急，建议直接电话联系。</p>
</div>
</section>`;
}"""
rep(OLD_CT_END, NEW_CT_END, 'contactBody 扩写(430→约1800字)')

open(GEN, 'w', encoding='utf-8').write(src)
print(f'\n共 {n} 处')
subprocess.run(f'chown www-data:www-data {GEN}', shell=True)
