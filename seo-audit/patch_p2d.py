#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2-d：文章分页静态页 + sitemap 注册 + 面包屑/FAQPage schema 落地"""
import shutil, datetime, subprocess

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p2d_{TS}')
n = 0
def rep(old, new, tag):
    global src, n
    if old not in src:
        print('  X [%s] anchor missing' % tag); return False
    src = src.replace(old, new, 1); n += 1; print('  OK [%s]' % tag); return True

# ===== 1) 生成分页静态页（在 pages 数组之后插入）=====
rep("""    // 2) 动态详情页（写进 seo/ 子目录，由 nginx 映射）
    const dynamicPages = [];""",
"""    // 1.5) 【SEO 修复】文章列表分页静态页 /articles/page/N（避免一页渲染全部文章）
    var totalArticlePages = Math.max(1, Math.ceil(articles.length / ARTICLES_PER_PAGE));
    for (var ap = 2; ap <= totalArticlePages; ap++) {
      pages.push({
        dir: ['articles', 'page'],
        file: ap + '.html',
        html: seoPage('/articles/page/' + ap, {
          title: '开发资讯与教程_第 ' + ap + ' 页 - 汇智云码',
          keywords: '小程序开发知识,网站建设教程,APP开发,软件开发资讯',
          description: '汇智云码科技分享小程序开发、APP开发、企业网站建设的技术干货与行业趋势，第 ' + ap + ' 页。',
          body: articlesBody(articles, ap),
          robots: 'index,follow',
          jsonLd: orgJsonLd(info) + breadcrumbSchema([
            { name: '首页', url: SITE + '/' },
            { name: '行业资讯', url: SITE + '/articles' },
            { name: '第 ' + ap + ' 页', url: SITE + '/articles/page/' + ap }
          ])
        })
      });
    }
    if (totalArticlePages > 1) console.log('  - 文章分页静态页：' + (totalArticlePages - 1) + ' 个');

    // 2) 动态详情页（写进 seo/ 子目录，由 nginx 映射）
    const dynamicPages = [];""", '生成文章分页静态页')

# ===== 2) sitemap 加分页 URL =====
rep("""    // 行业解决方案页面（必须在 sitemap 收集前生成）""",
"""    // 【SEO】文章分页 URL 加入 sitemap
    for (var sp = 2; sp <= Math.max(1, Math.ceil(articles.length / ARTICLES_PER_PAGE)); sp++) {
      urls.push('/articles/page/' + sp);
    }
    // 行业解决方案页面（必须在 sitemap 收集前生成）""", 'sitemap 加分页 URL')

# ===== 3) 首页加 FAQPage schema =====
rep("body: homeBody(services, cases, articles, templates), isHome: true, jsonLd: orgJsonLd(info) + websiteJsonLd() + faqJsonLd() }) },",
"""body: homeBody(services, cases, articles, templates), isHome: true, jsonLd: orgJsonLd(info) + websiteJsonLd() + faqJsonLd() + faqSchema([
        ['开发一个项目大概要多少钱？', '价格取决于功能量。官网套餐页面按小程序、APP、网站三大类目给出标准化配置的明码标价，可据此判断区间。定制项目在需求确认后出具逐项报价单，列明每项功能的工时与费用。'],
        ['开发周期多久？', '网站建设 2-6 周，小程序 2-6 周，APP 6-16 周，SaaS 系统 2-6 个月。以上为纯开发时间，不含 ICP 备案与平台审核时间，建议预留 2-4 周缓冲。'],
        ['源码会交付吗？后期维护怎么算？', '源码全部交付，含前后端代码、数据库结构与部署文档。验收后提供 3-12 个月免费维护期，之后可签年度维护协议（通常为建设费用的 15%-20%）或按次付费。'],
        ['外地客户怎么合作？', '公司六成以上客户来自山东省外，合作以线上为主：需求沟通用微信或视频会议，原型设计稿在线评审，开发过程每周同步进度，验收后远程协助部署。必要时可安排驻场。'],
        ['需求还没想清楚可以先聊吗？', '可以，需求与方案梳理完全免费，不签约也没有关系。客户最初描述的需求与最终实现功能常有 30%-50% 差异，在写代码前暴露出来能省下大量返工成本。']
      ]) }) },""", '首页 FAQPage schema')

# ===== 4) 服务页加 FAQPage schema =====
rep("body: servicesBody(services), jsonLd: serviceJsonLd('",
    "body: servicesBody(services), jsonLd: faqSchema([['开发周期一般多长？','小程序 2-6 周，APP 6-16 周，网站 2-6 周，SaaS 系统 2-6 个月，具体取决于功能复杂度。以上为纯开发时间，不含 ICP 备案与平台审核，建议预留 2-4 周缓冲。'],['源码是否交付？','所有项目源码全部交付客户，包含前端代码、后端代码、数据库结构与部署文档，不采用只给账号不给源码的托管模式。'],['后期维护费用如何？','交付后提供 3-12 个月免费维护期，期间修复 Bug、协助服务器迁移、应对平台规则变化均不收费。之后可按年签维护协议，费用通常为建设费用的 15%-20%。'],['可以先做一部分功能试试吗？','可以。支持分期开发：先交付核心功能上线验证业务模式，跑通后再迭代次要功能，能显著降低前期投入风险。'],['已有系统能二次开发吗？','可以，但需先做代码评估。若原系统技术栈过旧、结构混乱，二次开发成本可能接近重做，我们会如实告知并给出两套方案对比。'],['需求变更怎么处理？','按人天计价：1-2 天工作量的小改动通常免费包含；较大改动或新增模块评估工时后出具增量报价单，确认后执行。所有变更书面记录。'],['你们在青岛，外地客户怎么合作？','公司 60% 以上客户来自山东省外，以线上合作为主：需求沟通用微信或视频会议，原型设计稿在线评审，开发每周同步进度，验收后远程协助部署。']]) + serviceJsonLd('",
    '服务页 FAQPage schema')

# ===== 5) 行业页加 FAQPage + 面包屑 =====
rep("""      body: industryBody(ind, services, cases, articles),""",
"""      body: industryBody(ind, services, cases, articles),
      jsonLdExtra: '',""", '行业页占位')

rep("""      jsonLd: orgJsonLd(info) + '<script type="application/ld+json">{"@context":"https://***@type":"Service","name":"' + ind.name + '行业解决方案","description":"' + ind.description + '","provider":{"@type":"Organization","name":"汇智云码科技"}}</script>'""",
"""      jsonLd: orgJsonLd(info) + '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Service","name":"' + ind.name + '行业解决方案","description":"' + ind.description + '","provider":{"@type":"Organization","name":"汇智云码科技"}}</script>'
        + faqSchema((INDUSTRY_EXTRA[ind.slug] && INDUSTRY_EXTRA[ind.slug].faq) ? INDUSTRY_EXTRA[ind.slug].faq : [])
        + breadcrumbSchema([
            { name: '首页', url: SITE + '/' },
            { name: '行业解决方案', url: SITE + '/solutions' },
            { name: ind.name + '行业解决方案', url: SITE + '/solutions/' + ind.slug }
          ])""", '行业页 FAQPage+面包屑 schema')

# ===== 6) solutions 索引页加面包屑 =====
rep("""    canonical: SITE + '/solutions',
    body: navHtml
  });""",
"""    canonical: SITE + '/solutions',
    body: navHtml,
    jsonLd: breadcrumbSchema([
      { name: '首页', url: SITE + '/' },
      { name: '行业解决方案', url: SITE + '/solutions' }
    ])
  });""", 'solutions 索引页面包屑')

# ===== 7) 静态页循环支持 dir 参数（articles/page/N）=====
rep("""    for (const dp of dynamicPages) {""",
"""    // 静态分页页（dir 为数组时写入子目录）
    for (const pg of pages) {
      if (!pg.dir) continue;
      const dirPath = path.join(DIST, ...pg.dir);
      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(path.join(dirPath, pg.file), pg.html);
    }

    for (const dp of dynamicPages) {""", '静态页循环支持子目录')

# ===== 8) 文章详情页加面包屑 + 相关阅读内链 =====
rep("jsonLd: articleJsonLd(a), ogImage: `${SITE}/seo/images/articles/${a.id}.jpg`, ogType: 'article' }) });",
"""jsonLd: articleJsonLd(a) + breadcrumbSchema([
        { name: '首页', url: SITE + '/' },
        { name: '行业资讯', url: SITE + '/articles' },
        { name: truncTitle(a.title, 40), url: SITE + '/articles/' + a.id }
      ]), ogImage: `${SITE}/seo/images/articles/${a.id}.jpg`, ogType: 'article' }) });""", '文章页面包屑')

# ===== 9) 案例详情页加面包屑 =====
rep("jsonLd: caseJsonLd(c), ogImage: `${SITE}/seo/images/cases/${c.id}.jpg`, ogType: 'article' }) });",
"""jsonLd: caseJsonLd(c) + breadcrumbSchema([
        { name: '首页', url: SITE + '/' },
        { name: '开发案例', url: SITE + '/cases' },
        { name: truncTitle(c.title, 40), url: SITE + '/cases/' + c.id }
      ]), ogImage: `${SITE}/seo/images/cases/${c.id}.jpg`, ogType: 'article' }) });""", '案例页面包屑')

open(GEN, 'w', encoding='utf-8').write(src)
print('共 %d 处' % n)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip(), r.stderr.strip()[:600])
