#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P2-f：为 services/about/contact/templates 补内链（指向 /packages /solutions /cases）"""
import shutil, datetime, subprocess

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p2f_{TS}')
n = 0
def rep(old, new, tag):
    global src, n
    if old not in src:
        print('  X [%s] anchor missing' % tag); return False
    src = src.replace(old, new, 1); n += 1; print('  OK [%s]' % tag); return True

# services 页：在收尾 CTA 块加内链
rep("""<p style="margin-top:20px;"><a href="${SITE}/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">免费获取方案与报价</a></p>
</div>
</section>`;
}""",
"""<p style="margin-top:20px;"><a href="${SITE}/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">免费获取方案与报价</a></p>
<p style="margin-top:18px;font-size:15px;color:#475569;">相关页面：<a href="${SITE}/packages">明码标价开发套餐</a> ｜ <a href="${SITE}/solutions">14 个行业解决方案</a> ｜ <a href="${SITE}/cases">交付案例</a> ｜ <a href="${SITE}/templates">网站模板商城</a> ｜ <a href="${SITE}/articles">开发知识文章</a></p>
</div>
</section>`;
}""", 'services 页内链')

# about 页末尾加内链（在最后一个 section 之后）
rep("""<p style="margin-top:24px;text-align:center;"><a href="${SITE}/cases" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;margin-right:12px;">查看客户案例</a><a href="${SITE}/contact" style="display:inline-block;padding:12px 28px;background:#fff;color:#2563eb;border:2px solid #2563eb;border-radius:8px;font-weight:bold;text-decoration:none;">联系我们</a></p>
</div>
</section>`;
}""",
"""<p style="margin-top:24px;text-align:center;"><a href="${SITE}/cases" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;margin-right:12px;">查看客户案例</a><a href="${SITE}/contact" style="display:inline-block;padding:12px 28px;background:#fff;color:#2563eb;border:2px solid #2563eb;border-radius:8px;font-weight:bold;text-decoration:none;">联系我们</a></p>
<p style="margin-top:18px;font-size:15px;color:#475569;text-align:center;">相关页面：<a href="${SITE}/services">开发服务详解</a> ｜ <a href="${SITE}/packages">明码标价开发套餐</a> ｜ <a href="${SITE}/solutions">行业解决方案</a> ｜ <a href="${SITE}/templates">网站模板商城</a></p>
</div>
</section>`;
}""", 'about 页内链')

# contact 页末尾加内链
rep("""<p><strong>问：微信咨询多久回复？</strong><br>工作日通常 2 小时内回复，非工作时间可能延迟到次日。如果需求较急，建议直接电话联系。</p>
</div>
</section>`;
}""",
"""<p><strong>问：微信咨询多久回复？</strong><br>工作日通常 2 小时内回复，非工作时间可能延迟到次日。如果需求较急，建议直接电话联系。</p>
<p style="margin-top:20px;padding-top:18px;border-top:1px dashed #cbd5e1;">咨询前可以先看看这些页面：<a href="${SITE}/services">开发服务详解</a> ｜ <a href="${SITE}/packages">明码标价套餐</a> ｜ <a href="${SITE}/solutions">行业解决方案</a> ｜ <a href="${SITE}/cases">交付案例</a> ｜ <a href="${SITE}/about">公司团队</a></p>
</div>
</section>`;
}""", 'contact 页内链')

# templates 页末尾补 /packages 内链
rep("""<p style="margin-top:20px;"><a href="${SITE}/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">咨询模板或定制方案</a></p>
</div>
</section>`;
}""",
"""<p style="margin-top:20px;"><a href="${SITE}/contact" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;border-radius:8px;font-weight:bold;text-decoration:none;">咨询模板或定制方案</a></p>
<p style="margin-top:18px;font-size:15px;color:#475569;">相关页面：<a href="${SITE}/packages">明码标价开发套餐</a> ｜ <a href="${SITE}/services">开发服务详解</a> ｜ <a href="${SITE}/cases">交付案例</a> ｜ <a href="${SITE}/solutions">行业解决方案</a></p>
</div>
</section>`;
}""", 'templates 页内链')

# cases 页末尾加内链
rep("""${cardGrid(cases.map(c => ({ href: `/cases/${c.id}`, title: c.title, meta: `${c.category} · ${c.client}`, summary: c.description, image: `${SITE}/seo/images/cases/${c.id}.jpg` })), 'case')}`;
}""",
"""${cardGrid(cases.map(c => ({ href: `/cases/${c.id}`, title: c.title, meta: `${c.category} · ${c.client}`, summary: c.description, image: `${SITE}/seo/images/cases/${c.id}.jpg` })), 'case')}
<section class="section" style="max-width:1200px;margin:0 auto;padding:20px 20px 60px;">
<div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">
<h2 style="font-size:24px;color:#1e3a8a;margin:0 0 16px;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">关于这些案例</h2>
<p>上面展示的是汇智云码科技自有团队交付的部分项目。出于客户商业保密要求，部分案例仅展示项目名称与功能概要，涉及内部数据与业务流程的细节未做公开。如果你是同行或研究用途，需要了解具体技术实现，欢迎<a href="${SITE}/contact">联系我们</a>交流。</p>
<p>案例按行业分类，可以对照查看与你业务相近的项目做了什么功能、用了什么技术方案。如果你在案例里看到和自己需求相似的场景，直接告诉我们案例编号，沟通效率会高很多。</p>
<p style="margin-top:18px;font-size:15px;color:#475569;">相关页面：<a href="${SITE}/services">开发服务详解</a> ｜ <a href="${SITE}/packages">明码标价开发套餐</a> ｜ <a href="${SITE}/solutions">行业解决方案</a> ｜ <a href="${SITE}/about">公司团队</a></p>
</div>
</section>`;
}""", 'cases 页内链+说明')

open(GEN, 'w', encoding='utf-8').write(src)
print('共 %d 处' % n)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip())
if r.returncode: print(r.stderr[:600])
