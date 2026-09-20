#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
P3：城市站群收窄 + 青岛/济南深度本地化内容
1) city-whitelist.json 收窄为 ["qingdao","jinan"]
2) 新增 CITY_DEEP：青岛/济南逐城独立撰写本地内容（产业/合规/服务模式各不同）
3) cityHomeBody 优先用深度内容；FAQ LD 同步
"""
import json, shutil, subprocess, datetime, re

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
WL  = '/data/web/huizhiyunma/backend/seo/city-whitelist.json'
TS  = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')

shutil.copy(GEN, f'{GEN}.bak_p3_{TS}')
shutil.copy(WL,  f'{WL}.bak_p3_{TS}')

# ============ 1) 白名单收窄 ============
json.dump(["qingdao", "jinan"], open(WL, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('白名单 → ["qingdao","jinan"]')

# ============ 2) 注入 CITY_DEEP ============
DEEP = r'''
// ===== 白名单城市深度本地化内容（逐城独立撰写，不共用模板）=====
var CITY_DEEP = {
  qingdao: {
    h2: '青岛本地开发服务说明',
    paras: [
      '<p>汇智云码科技总部设在青岛胶州，办公地址为东关大街 8 号中央公园写字楼 11 楼，产品、设计、开发、测试团队均常驻青岛，不是接单后转包给外地团队的模式。青岛市区及胶州、黄岛（西海岸）、城阳、即墨、平度、莱西的客户，既可以直接到公司面谈，也可以约我们上门做需求调研。</p>',
      '<p>青岛本地客户的服务路径和外地客户不太一样：需求阶段可约上门沟通，开发过程中可以安排工程师到贵公司驻场对接，验收阶段可以现场演示逐项确认。合同支持当面签署，付款按里程碑走，交付物包括全部源代码、数据库结构、部署文档和操作手册。</p>',
      '<p>我们服务青岛客户的方式建立在本地团队基础上——遇到需要紧急处理的问题，可以当天到现场；需要和你的业务人员反复对齐的环节，不需要靠视频会议来回猜。</p>'
    ],
    indsTitle: '青岛本地企业的数字化需求，我们主要覆盖这几个方向',
    inds: [
      {n: '外贸与跨境电商', d: '青岛港和上合示范区带动了大量外贸企业。这类企业需要的通常不是展示型官网，而是能对接多平台订单、支持多语言多币种、能和报关物流信息打通的独立站或订单管理系统。'},
      {n: '家电与智能制造配套', d: '海尔、海信等龙头在青岛带动了庞大的供应链体系。配套供应商企业普遍需要产品选型展示、订单协同、质检追踪这类偏工业场景的系统，对数据准确性和多角色权限要求较高。'},
      {n: '餐饮与零售连锁', d: '青岛本地餐饮和连锁零售竞争激烈。扫码点餐、会员储值、线上商城是常见需求，核心诉求是缩短点单路径、降低服务员人力依赖、把复购做起来。'},
      {n: '海洋经济与港口物流', d: '涉及货运代理、仓储管理、集装箱调度等场景。这类系统对数据实时性和第三方系统对接能力要求高，通常需要和客户现有 ERP 或船公司系统做接口。'}
    ],
    faqTitle: '青岛客户常见问题',
    faq: [
      {q: '青岛本地可以上门面谈吗？', a: '可以。我们总部就在青岛胶州，青岛全域及周边县市都可以预约上门沟通、现场需求调研和阶段性验收，不额外收取上门费用。'},
      {q: '青岛有常驻的开发团队吗？', a: '有。产品、设计、前后端开发和测试都在青岛办公，不采用接单后转包的模式。项目沟通可以直接找到负责你这个项目的工程师，不需要通过中间层转达。'},
      {q: '外贸行业你们做过哪些类型的系统？', a: '主要做过跨境电商独立站、多平台订单归集系统、供应商协同平台和报关资料管理系统。这类项目的难点通常不在页面本身，而在多平台接口对接、多币种结算和报关物流数据的准确性。'},
      {q: '上门调研需要收费吗？', a: '不收费。需求梳理、流程调研和初步方案报价都是免费的，不签约也没有关系。很多客户最初描述的需求和最终实现的功能会有较大差异，在动手写代码前把这些理清楚，能省下大量返工成本。'},
      {q: '在青岛做一个餐饮小程序大概多少钱、多久？', a: '扫码点餐加会员储值这类标准功能组合，通常数千元到两万元区间；如果需要对接外卖平台、做多门店库存和供应链协同，投入会相应增加。周期上，标准功能一般 3-5 周，复杂一些的 6-8 周。具体报价在需求确认后书面给出。'}
    ]
  },
  jinan: {
    h2: '济南本地开发服务说明',
    paras: [
      '<p>面向济南客户，汇智云码科技采用「远程协作 + 关键节点驻场」的服务模式。济南到青岛高铁 1.5 至 2 小时，日常需求沟通、原型评审、进度同步通过视频会议和项目管理工具完成，效率不受地域影响；立项、原型确认、上线验收等关键节点可以安排同事到济南现场支持。</p>',
      '<p>合同、发票、售后标准与青岛总部完全一致，济南客户对公打款后开具增值税发票，按里程碑付款。需要现场配合的环节（例如系统演示、业务人员集中培训、上线保障）我们提前安排行程，不额外收取差旅费用。</p>',
      '<p>需要说明的是，济南客户的合规敏感度普遍高于其他地区——这一点我们在方案阶段就会纳入考虑，而不是等验收时才补材料。</p>'
    ],
    indsTitle: '济南本地企业的数字化需求，我们主要覆盖这几个方向',
    inds: [
      {n: '政务与国企信息化', d: '济南是山东省会，省属国企、事业单位和政府信息化项目集中。这类项目除了功能本身，还关注等保合规、信创环境适配、数据不出省、招投标资质和验收材料齐全度，需要在方案阶段就一并设计，后期补做代价很高。'},
      {n: '软件与信息服务', d: '齐鲁软件园聚集了大量软件企业。这类客户往往有自己的技术团队，需求集中在补足特定技术方向的产能缺口、承接阶段性模块开发，或者做技术栈升级改造。'},
      {n: '教育与医疗', d: '山东高校和医疗机构数量多，招生报名、教务管理、预约挂号、患者随访管理等系统需求稳定。这类系统对并发承载、数据权限分级和流程严谨性要求较高。'},
      {n: '装备制造与汽车零部件', d: '中国重汽等企业带动了装备制造和零部件配套产业，需要生产管理、设备维保、供应链协同类系统，通常要和企业既有的生产或财务系统做数据对接。'}
    ],
    faqTitle: '济南客户常见问题',
    faq: [
      {q: '济南的项目怎么协作？需要你们常驻吗？', a: '采用「远程协作 + 关键节点驻场」模式，不需要全程常驻。日常通过视频会议和项目管理工具同步，立项、原型确认、上线验收等关键节点安排同事到济南现场。如果项目本身要求驻场开发（部分国企项目会有此要求），可以在合同中约定驻场周期。'},
      {q: '国企或政府采购类项目，你们能配合走招投标流程吗？', a: '可以配合。我们能提供技术方案书、需求响应表、项目业绩证明、企业资质材料等投标所需文件。需要注意的是，投标主体资格和具体资质要求需要按项目招标文件逐项核对，部分资质我们可能不具备，会在评估后如实告知，不会为了接项目做虚假承诺。'},
      {q: '等保和信创的要求能支持吗？', a: '可以支持到应用层。我们能按等保二级/三级要求做应用侧的安全设计（身份鉴别、访问控制、安全审计、数据加密存储、接口防重放等），并配合提供测评所需的技术文档；信创方面可适配国产化操作系统、数据库和中间件的应用层兼容。但等保测评的通过结论由具备资质的测评机构出具，我们负责配合整改，不能代替测评机构做承诺。'},
      {q: '济南做一个小程序或管理系统大概多少钱？', a: '展示型小程序数千元起，带交易或预约功能的一般 1 至 3 万元；管理系统按模块计价，通常 3 万元起步，涉及多系统对接和复杂权限的会更高。政务类项目因为合规和文档要求更多，工作量评估会比同等功能的商业项目高，具体在需求确认后出具书面报价。'},
      {q: '交付物具体包含哪些？', a: '包含全部源代码（前端、后端）、数据库结构与初始化脚本、部署文档、操作手册、接口文档。如果需要，还可以提供源代码审计材料、信创环境适配说明和等保测评配合文档。源代码所有权归客户，不存在只给账号不给源码的托管模式。'}
    ]
  }
};
function cityDeepBlock(sd, cn, pn) {
  var d = CITY_DEEP[sd];
  if (!d) return '';
  var h = '';
  h += '<section class="section" style="max-width:1200px;margin:0 auto;padding:60px 20px;"><h2>' + d.h2 + '</h2>';
  h += '<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">';
  h += d.paras.join('\n');
  if (d.inds && d.inds.length) {
    h += '<h3 style="font-size:19px;color:#1e3a8a;margin:28px 0 14px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">' + d.indsTitle + '</h3>';
    d.inds.forEach(function(it) {
      h += '<p style="margin:0 0 16px;"><strong style="color:#1e293b;">' + it.n + '</strong><br>' + it.d + '</p>';
    });
  }
  h += '</div></section>';
  h += '<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 60px;"><h2>' + d.faqTitle + '</h2>';
  h += '<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px 32px 24px;line-height:1.9;">';
  d.faq.forEach(function(f) {
    h += '<h3 style="margin:22px 0 8px;font-size:17px;color:#1e293b;">' + f.q + '</h3><p style="margin:0 0 6px;">' + f.a + '</p>';
  });
  h += '</div></section>';
  return h;
}
function cityDeepFaqLd(sd) {
  var d = CITY_DEEP[sd];
  if (!d) return '';
  return '<script type="application/ld+json">' + JSON.stringify({
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: d.faq.map(function(f) { return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }; })
  }) + '</' + 'script>';
}
'''

src = open(GEN, encoding='utf-8').read()
if 'CITY_DEEP' in src:
    print('- CITY_DEEP 已存在，跳过注入')
else:
    anchor = "function cityLocalBlock(cfg, cn, pn, sd) {"
    if anchor not in src:
        print('X cityLocalBlock 锚点缺失'); raise SystemExit(1)
    src = src.replace(anchor, DEEP.lstrip('\n') + '\n' + anchor, 1)
    print('OK CITY_DEEP 已注入')

# ============ 3) cityHomeBody 优先使用深度内容 ============
old1 = "  if (block) parts.push(block.html);"
new1 = ("  if (CITY_DEEP[cityObj.subdomain]) parts.push(cityDeepBlock(cityObj.subdomain, cn, provName));\n"
        "  else if (block) parts.push(block.html);")
if old1 in src and 'CITY_DEEP[cityObj.subdomain]) parts.push' not in src:
    src = src.replace(old1, new1, 1); print('OK cityHomeBody 深度内容优先')
else:
    print('- cityHomeBody 改动跳过')

# ============ 4) 首页 FAQ LD 同步 ============
old2 = "        var extra = pcfg ? cityLocalBlock(pcfg, cn, pn, sd).faqLd : '';"
new2 = "        var extra = CITY_DEEP[sd] ? cityDeepFaqLd(sd) : (pcfg ? cityLocalBlock(pcfg, cn, pn, sd).faqLd : '');"
if old2 in src and 'cityDeepFaqLd(sd)' not in src:
    src = src.replace(old2, new2, 1); print('OK FAQ LD 同步')
else:
    print('- FAQ LD 改动跳过')

open(GEN, 'w', encoding='utf-8').write(src)
subprocess.run('chown www-data:www-data ' + GEN + ' ' + WL, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip())
if r.returncode: print(r.stderr[:800])
print('CITY_DEEP 城市:', re.findall(r'^  (\w+): \{', src, re.M)[:4])
