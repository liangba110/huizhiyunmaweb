import { createRouter, createWebHistory } from 'vue-router';
import Home from './pages/Home.vue';
import Services from './pages/Services.vue';
import Cases from './pages/Cases.vue';
import CaseDetail from './pages/CaseDetail.vue';
import Articles from './pages/Articles.vue';
import ArticleDetail from './pages/ArticleDetail.vue';
import About from './pages/About.vue';
import Contact from './pages/Contact.vue';
import Admin from './pages/Admin.vue';
import TemplateShop from './pages/TemplateShop.vue';
import Packages from './pages/Packages.vue';

const routes = [
  {
    path: '/',
    component: Home,
    meta: {
      title: '汇智云码科技 - 青岛小程序开发_企业建站_APP定制开发',
      description: '汇智云码科技专业提供微信小程序开发、APP定制开发、企业网站建设服务。青岛软件开发公司，120+企业客户，200+成功案例，源码交付终身维护。',
      keywords: '小程序开发,APP开发,企业网站建设,软件开发,青岛软件公司',
      ogTitle: '汇智云码科技 - 青岛小程序开发_企业建站_APP定制开发',
      ogDescription: '青岛专业软件开发公司，120+企业客户，200+成功案例。微信小程序、APP定制、企业建站，源码交付终身维护。'
    }
  },
  {
    path: '/services',
    component: Services,
    meta: {
      title: '小程序开发_APP定制_企业建站服务 - 汇智云码科技',
      description: '汇智云码科技提供APP定制开发、微信小程序开发、企业网站建设一站式服务，从需求分析到上线运营全程交付，价格透明快速响应。',
      keywords: '小程序开发,APP定制开发,企业网站建设,SaaS开发,软件开发公司',
      ogTitle: '小程序开发_APP定制_企业建站服务 - 汇智云码科技',
      ogDescription: 'APP定制开发、微信小程序开发、企业网站建设一站式服务，价格透明，快速响应。'
    }
  },
  {
    path: '/cases',
    component: Cases,
    meta: {
      title: '开发案例_小程序APP网站成功案例 - 汇智云码科技',
      description: '汇智云码科技200+真实案例，涵盖微信小程序、APP定制开发、企业网站建设等多个行业，见证真实开发实力与交付质量。',
      keywords: '小程序开发案例,APP开发案例,网站建设案例,软件开发案例',
      ogTitle: '开发案例_小程序APP网站成功案例 - 汇智云码科技',
      ogDescription: '200+真实案例，涵盖电商、教育、医疗、餐饮等多个行业。'
    }
  },
  {
    path: '/cases/:id',
    component: CaseDetail,
    meta: {
      title: '开发案例详情 | 汇智云码科技',
      description: '汇智云码科技开发案例详情，展示企业网站、小程序、APP定制开发的完整项目过程与技术方案。',
      keywords: '小程序开发案例详情,APP开发案例,网站建设案例',
      ogTitle: '开发案例详情 | 汇智云码科技',
      ogDescription: '展示企业网站、小程序、APP定制开发的完整项目过程与技术方案。'
    }
  },
  {
    path: '/articles',
    component: Articles,
    meta: {
      title: '青岛小程序开发知识_青岛网站建设教程_青岛开发资讯 | 汇智云码科技',
      description: '汇智云码科技分享小程序开发、APP开发、企业网站建设的技术干货与行业趋势，助力企业数字化转型。',
      keywords: '小程序开发教程,APP开发知识,网站建设教程,青岛软件开发资讯,企业数字化转型',
      ogTitle: '技术资讯与开发知识 | 汇智云码科技',
      ogDescription: '分享小程序开发、APP开发、企业网站建设的技术干货与行业趋势。'
    }
  },
  {
    path: '/articles/:id',
    component: ArticleDetail,
    meta: {
      title: '技术文章 | 汇智云码科技',
      description: '汇智云码科技技术博客，深入浅出讲解企业建站、小程序开发、APP开发的实践经验与解决方案。',
      keywords: '小程序开发技术,APP开发经验,企业建站方案',
      ogTitle: '技术文章 | 汇智云码科技',
      ogDescription: '深入浅出讲解企业建站、小程序开发、APP开发的实践经验与解决方案。'
    }
  },
  {
    path: '/about',
    component: About,
    meta: {
      title: '关于汇智云码_青岛专业软件开发公司',
      description: '汇智云码科技是青岛专业软件开发公司，核心团队来自腾讯、阿里、字节，专注小程序开发、企业网站建设、APP定制开发，已服务120+企业客户。',
      keywords: '软件开发公司,APP开发公司,小程序开发公司,汇智云码科技',
      ogTitle: '关于汇智云码科技 - 青岛专业软件开发公司',
      ogDescription: '青岛专业软件开发公司，核心团队来自腾讯、阿里、字节，已服务120+企业客户。'
    }
  },
  {
    path: '/templates',
    component: TemplateShop,
    meta: {
      title: '青岛企业网站模板_青岛建站模板_青岛快速建站 | 汇智云码科技',
      description: '汇智云码科技提供企业官网HTML模板，基础版¥599、专业版¥899，纯源码交付，快速搭建专业企业网站。',
      keywords: '企业网站模板,建站模板,快速建站,网站模板下载,青岛建站模板',
      ogTitle: '企业网站模板商城 | 汇智云码科技',
      ogDescription: '企业官网HTML模板，¥599起，纯源码交付，快速搭建专业企业网站。'
    }
  },
  {
    path: '/packages',
    component: Packages,
    meta: {
      title: '青岛软件开发套餐_青岛网站建设价格_青岛小程序开发报价 | 汇智云码科技',
      description: '汇智云码科技标准化软件开发套餐：网站建设¥1999起、小程序¥2999起、APP开发¥15999起，价格透明，在线直接下单。',
      keywords: '软件开发价格,网站建设报价,小程序开发费用,APP开发多少钱,青岛软件开发套餐',
      ogTitle: '标准化开发套餐 - 价格透明 | 汇智云码科技',
      ogDescription: '网站建设¥1999起、小程序¥2999起、APP开发¥15999起，源码交付。'
    }
  },
  {
    path: '/contact',
    component: Contact,
    meta: {
      title: '联系我们_获取开发方案与报价 - 汇智云码科技',
      description: '联系汇智云码科技，获取小程序开发、APP定制开发、企业网站建设报价与方案。电话/微信/在线咨询，快速响应。',
      keywords: '联系汇智云码,软件开发咨询,小程序开发报价,APP开发咨询',
      ogTitle: '联系我们_获取开发方案与报价 - 汇智云码科技',
      ogDescription: '获取小程序开发、APP定制开发、企业网站建设报价与方案。'
    }
  },
  {
    path: '/admin',
    component: Admin,
    meta: { title: '管理后台 | 汇智云码科技', description: '' } }
];

export default createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
});