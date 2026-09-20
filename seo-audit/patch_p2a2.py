#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2-a2：industryBody 追加深度内容 + 内链（精确锚点）"""
import shutil, datetime, subprocess

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p2a2_{TS}')

ANCHOR = """  parts.push('    <p>如果您需要' + name + '行业的数字化解决方案，欢迎联系我们获取专属方案和报价。</p>');
  parts.push('    <p><a href="' + SITE + '/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">立即咨询</a></p>');
  parts.push('  </div>');
  parts.push('</section>');
  
  return parts.join('\\n');
}"""

ADD = r"""  parts.push('    <p>如果您需要' + name + '行业的数字化解决方案，欢迎联系我们获取专属方案和报价。</p>');
  parts.push('    <p><a href="' + SITE + '/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">立即咨询</a></p>');
  parts.push('  </div>');
  parts.push('</section>');

  // ========== 【SEO 扩写】行业深度内容 + 内链建设 ==========
  var _S = 'style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;"';
  var _H2 = 'style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;"';
  var _H3 = 'style="font-size:17px;color:#1e293b;margin:22px 0 8px;"';
  var ex = (typeof INDUSTRY_EXTRA !== 'undefined' && INDUSTRY_EXTRA[slug]) ? INDUSTRY_EXTRA[slug] : {};

  if (ex.pain && ex.pain.length) {
    parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
    parts.push('  <div class="content" ' + _S + '>');
    parts.push('    <h2 ' + _H2 + '>' + name + '行业普遍面临的数字化痛点</h2>');
    parts.push('    <p>在服务' + name + '行业客户的过程中，我们发现大家遇到的困难高度相似，主要集中在以下几个方面：</p>');
    parts.push('    <ul style="line-height:2;">' + ex.pain.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>');
    parts.push('    <p>这些问题的共同点是：<strong>不是缺人，而是缺工具</strong>。把重复性的记录、通知、统计工作交给系统，团队才能把精力放在真正需要人的判断上。</p>');
    parts.push('  </div>');
    parts.push('</section>');
  }

  if (ex.modules && ex.modules.length) {
    parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
    parts.push('  <div class="content" ' + _S + '>');
    parts.push('    <h2 ' + _H2 + '>' + name + '行业系统核心功能模块</h2>');
    parts.push('    <p>下面按模块说明每项功能解决的具体问题，方便你判断哪些是当前阶段真正需要的：</p>');
    ex.modules.forEach(function (m, i) {
      parts.push('    <h3 ' + _H3 + '>' + (i + 1) + '. ' + m[0] + '</h3>');
      parts.push('    <p>' + m[1] + '</p>');
    });
    parts.push('    <p style="margin-top:20px;">需要说明的是，上面列的是' + name + '行业的常见功能集合，<strong>不代表每家企业都需要全部实现</strong>。实际项目中我们通常会按必需、重要、可延后三档给功能做优先级排序，先上线核心功能验证业务，再按实际使用情况迭代。</p>');
    parts.push('  </div>');
    parts.push('</section>');
  }

  if (ex.scenes && ex.scenes.length) {
    parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
    parts.push('  <div class="content" ' + _S + '>');
    parts.push('    <h2 ' + _H2 + '>' + name + '行业典型应用场景</h2>');
    parts.push('    <ul style="line-height:2;">' + ex.scenes.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>');
    parts.push('  </div>');
    parts.push('</section>');
  }

  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
  parts.push('  <div class="content" ' + _S + '>');
  parts.push('    <h2 ' + _H2 + '>' + name + '行业项目的实施流程</h2>');
  parts.push('    <p><strong>第一步 · 业务调研（2-5 个工作日）</strong><br>' + name + '行业的业务逻辑往往包含大量隐性规则，这些规则通常只存在于老员工的脑子里。我们会安排有' + name + '行业项目经验的成员做调研，把隐性规则显性化，形成书面需求文档供双方确认。</p>');
  parts.push('    <p><strong>第二步 · 功能分级与方案确定（2-3 个工作日）</strong><br>把需求拆成功能清单，按必需、重要、可延后分级，给出对应的开发周期与报价。这一阶段的结果是你拿到一份能看懂的方案，而不是一堆技术名词。</p>');
  parts.push('    <p><strong>第三步 · 原型与设计（5-10 个工作日）</strong><br>输出页面原型图与设计稿。' + name + '行业的操作场景常在移动端，我们会重点验证实际操作路径是否顺畅，而不是只看视觉是否好看。</p>');
  parts.push('    <p><strong>第四步 · 开发与联调（按功能量，通常 4-12 周）</strong><br>前后端并行开发，每周同步进度。涉及第三方系统对接（支付、地图、硬件设备、平台接口）的部分，我们会提前做接口可行性验证，避免开发到后期才发现走不通。</p>');
  parts.push('    <p><strong>第五步 · 测试与试运行（1-2 周）</strong><br>功能测试通过后，建议先在部分门店或部分业务线试运行，收集真实使用反馈再做调整，最后全面上线。这一步看似多余，但能大幅降低全面上线后出现问题的风险。</p>');
  parts.push('    <p><strong>第六步 · 上线与迭代（长期）</strong><br>协助完成部署、备案与平台审核，交付源码与文档。上线后按实际使用数据持续迭代。</p>');
  parts.push('  </div>');
  parts.push('</section>');

  if (ex.faq && ex.faq.length) {
    parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
    parts.push('  <div class="content" ' + _S + '>');
    parts.push('    <h2 ' + _H2 + '>' + name + '行业常见问题</h2>');
    ex.faq.forEach(function (q) {
      parts.push('    <h3 ' + _H3 + '>' + q[0] + '</h3>');
      parts.push('    <p>' + q[1] + '</p>');
    });
    parts.push('  </div>');
    parts.push('</section>');
  }

  // 内链建设：指向服务/套餐/案例/其他行业
  var links = [];
  links.push('<li><a href="' + SITE + '/services">' + name + '行业适用的开发服务总览</a></li>');
  links.push('<li><a href="' + SITE + '/packages">' + name + '行业标准化套餐与明码标价</a></li>');
  links.push('<li><a href="' + SITE + '/cases">查看我们交付的行业开发案例</a></li>');
  links.push('<li><a href="' + SITE + '/solutions">全部 14 个行业解决方案</a></li>');
  (ex.related || []).forEach(function (s) {
    var o = INDUSTRIES.filter(function (i) { return i.slug === s; })[0];
    if (o) links.push('<li><a href="' + SITE + '/solutions/' + o.slug + '">' + o.name + '行业解决方案</a></li>');
  });
  parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
  parts.push('  <div class="content" ' + _S + '>');
  parts.push('    <h2 ' + _H2 + '>相关服务与方案</h2>');
  parts.push('    <ul style="line-height:2;">' + links.join('') + '</ul>');
  parts.push('  </div>');
  parts.push('</section>');

  // 内链：相关文章
  var relArts = [];
  if (typeof articles !== 'undefined' && articles && articles.length) {
    relArts = articles.filter(function (a) {
      var t = String((a.title || '') + ' ' + (a.category || '') + ' ' + (a.summary || '')).toLowerCase();
      return keywords.some(function (k) { return t.indexOf(String(k).toLowerCase()) >= 0; });
    }).slice(0, 5);
  }
  if (relArts.length) {
    parts.push('<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 40px;">');
    parts.push('  <div class="content" ' + _S + '>');
    parts.push('    <h2 ' + _H2 + '>延伸阅读：' + name + '行业相关文章</h2>');
    parts.push('    <ul style="line-height:2;">' + relArts.map(function (a) {
      return '<li><a href="' + SITE + '/articles/' + a.id + '">' + esc(a.title) + '</a></li>';
    }).join('') + '</ul>');
    parts.push('  </div>');
    parts.push('</section>');
  }

  return parts.join('\n');
}"""

if ANCHOR in src:
    src = src.replace(ANCHOR, ADD, 1)
    print('  OK [industryBody 追加深度内容+内链]')
else:
    print('  X 锚点仍未匹配')
    raise SystemExit(1)

open(GEN, 'w', encoding='utf-8').write(src)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN, shell=True)
print('语法检查完成')
