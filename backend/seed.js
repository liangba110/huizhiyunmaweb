// 初始化数据：管理员账号 + 3 个服务 + 公司信息
const bcrypt = require('bcryptjs');
const pool = require('./db');
require('dotenv').config();

async function seed() {
  try {
    // 1. 管理员
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await pool.query(
      'INSERT IGNORE INTO admins (username, password, nickname) VALUES (?,?,?)',
      [process.env.ADMIN_USERNAME, hashed, '超级管理员']
    );
    console.log('✅ 管理员已初始化:', process.env.ADMIN_USERNAME);

    // 2. 三大服务
    const services = [
      {
        title: 'APP 定制开发',
        subtitle: 'iOS / Android 原生与跨平台',
        description: '为企业提供从产品设计到上线运营的全流程 App 开发服务，覆盖电商、社交、O2O、企业管理等多个领域。',
        icon: '📱',
        features: '原生开发|跨平台 Flutter|UI/UX 设计|App Store 上架|后期维护',
        price_min: 30000,
        price_max: 500000,
        sort_order: 100
      },
      {
        title: '小程序定制开发',
        subtitle: '微信 / 支付宝 / 抖音 / 百度',
        description: '专注小程序生态，提供电商、点餐、教育、医疗、出行等各行业小程序解决方案，源码交付，长期维护。',
        icon: '💬',
        features: '微信小程序|多端兼容|营销插件|会员体系|数据统计',
        price_min: 5000,
        price_max: 100000,
        sort_order: 90
      },
      {
        title: '网站 / 管理系统',
        subtitle: 'PC 官网 + 后台 + SaaS',
        description: '高端定制企业官网、SaaS 平台、后台管理系统，Vue + Node + MySQL 全栈开发，支持私有化部署。',
        icon: '🌐',
        features: '响应式设计|后台管理|SEO 优化|私有化部署|持续迭代',
        price_min: 8000,
        price_max: 200000,
        sort_order: 80
      }
    ];
    for (const s of services) {
      const [exists] = await pool.query('SELECT id FROM services WHERE title = ?', [s.title]);
      if (exists.length === 0) {
        await pool.query(
          'INSERT INTO services (title, subtitle, description, icon, features, price_min, price_max, sort_order) VALUES (?,?,?,?,?,?,?,?)',
          [s.title, s.subtitle, s.description, s.icon, s.features, s.price_min, s.price_max, s.sort_order]
        );
      }
    }
    console.log('✅ 三大服务已初始化');

    // 3. 公司信息
    const companyItems = [
      ['company_name', '汇智云码科技'],
      ['company_slogan', '让企业拥有属于自己的 App 与小程序'],
      ['company_intro', '汇智云码科技是一家专注于移动应用与小程序定制开发的技术服务商，团队核心成员均拥有 5 年以上一线互联网公司开发经验，已为 100+ 企业客户提供专业的数字化解决方案。'],
      ['company_address', '广东省深圳市南山区科技园'],
      ['company_phone', '400-888-8888'],
      ['company_email', 'business@huizhiyunma.com'],
      ['company_wechat', 'huizhiyunma_kefu'],
      ['company_work_time', '周一至周五 9:00 - 18:00'],
      ['stat_cases', '100+'],
      ['stat_clients', '80+'],
      ['stat_experience', '5年+'],
      ['stat_team', '20人']
    ];
    for (const [k, v] of companyItems) {
      await pool.query(
        'INSERT INTO company_info (item_key, item_value) VALUES (?,?) ON DUPLICATE KEY UPDATE item_value=VALUES(item_value)',
        [k, v]
      );
    }
    console.log('✅ 公司信息已初始化');

    // 4. 默认案例
    const cases = [
      {
        title: '某连锁餐饮品牌点餐小程序',
        client: '某知名餐饮连锁',
        category: '小程序',
        description: '为客户定制开发微信小程序点餐系统，支持堂食/外卖/自提三种模式，会员体系+优惠券+分销功能一应俱全。',
        technologies: '微信小程序 + Node.js + MySQL',
        sort_order: 100
      },
      {
        title: '某制造业 ERP 移动端 App',
        client: '某制造企业',
        category: 'App',
        description: 'iOS + Android 双端原生 App，对接企业 ERP 系统，实现生产进度实时查询、库存预警、审批流程移动化。',
        technologies: 'Flutter + Java SpringBoot + MySQL',
        sort_order: 90
      },
      {
        title: '某教育机构在线学习平台',
        client: '某 K12 教育机构',
        category: '网站',
        description: '支持直播、录播、作业、考试的完整在线教育平台，包含 PC 端官网、后台管理、学员端 App 三端。',
        technologies: 'Vue3 + Nuxt + Node.js + 阿里云',
        sort_order: 80
      }
    ];
    for (const c of cases) {
      const [exists] = await pool.query('SELECT id FROM cases WHERE title = ?', [c.title]);
      if (exists.length === 0) {
        await pool.query(
          'INSERT INTO cases (title, client, category, description, technologies, sort_order) VALUES (?,?,?,?,?,?)',
          [c.title, c.client, c.category, c.description, c.technologies, c.sort_order]
        );
      }
    }
    console.log('✅ 案例已初始化');

    process.exit(0);
  } catch (e) {
    console.error('❌ 初始化失败:', e);
    process.exit(1);
  }
}

seed();