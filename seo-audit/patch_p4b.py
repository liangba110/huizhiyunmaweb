#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""P4-b：caseBody 说明段（用行定位，避开 *** 脱敏导致的锚点不匹配）"""
import shutil, subprocess, datetime

GEN = '/data/web/huizhiyunma/backend/seo/generate.js'
TS = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
src = open(GEN, encoding='utf-8').read()
shutil.copy(GEN, f'{GEN}.bak_p4b_{TS}')
lines = src.split('\n')

# 找 caseBody 里 </div></section> 之后紧跟 FAQPage script 的那一行
idx = None
for i, l in enumerate(lines):
    if 'FAQPage' in l and 'mainEntity' in l and '${esc(c.title)}' in l:
        idx = i
        break
if idx is None:
    print('X 未找到 FAQPage 行'); raise SystemExit(1)

print('定位行', idx + 1, ':', lines[idx][:70])
# 上两行应是 </div></section>
insert_at = idx
block = (
    '${relHtml}\n'
    '<section class="section" style="max-width:1200px;margin:0 auto;padding:0 20px 60px;"><div class="content" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;line-height:1.9;">\n'
    '<h2>关于这个项目</h2>\n'
    '<p>${esc(c.client || \'该项目\')}的合作从需求梳理开始。我们先用 1-2 周把业务流程、角色权限、数据结构逐项确认清楚，再进入原型设计与开发。这一步看起来慢，但它决定了后面不会因为需求反复而返工。</p>\n'
    '<p>开发过程中按周交付可演示的版本，客户随时能看到已完成的部分并提出修改意见，而不是等到全部做完才第一次看到成品。每个里程碑完成后双方确认签字，再进入下一阶段。</p>\n'
    '<p>技术上${esc(c.technologies || \'根据业务场景选择合适的技术栈\')}。选择标准不是新技术与否，而是团队能否长期维护——很多客户后续会自己接手运维，可维护性比技术先进性更重要。</p>\n'
    '<p>上线后提供 6-12 个月免费维护期，覆盖程序缺陷修复、平台规则变化导致的适配调整、服务器迁移协助。之后可按年签维护协议，也可按次付费。</p>\n'
    '${solLink}\n'
    '</div></section>\n'
)
lines.insert(insert_at, block.rstrip('\n'))
src = '\n'.join(lines)
open(GEN, 'w', encoding='utf-8').write(src)
subprocess.run('chown www-data:www-data ' + GEN, shell=True)
r = subprocess.run('export PATH=/home/ubuntu/.nvm/versions/node/v22.23.0/bin:$PATH; node --check ' + GEN + ' && echo SYNTAX_OK', shell=True, capture_output=True, text=True)
print('语法:', r.stdout.strip())
if r.returncode: print(r.stderr[:700])
