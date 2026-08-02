## 2026-08-02 - Task: Meinianda AI 新用户使用文档与 GitHub Pages 发布

### What was done

- 交付原创的 NewAPI 新版控制台风格单页文档站，覆盖注册、Wallet 充值、API Key、首次调用、协议选择、模型目录和常见排错。
- 写入基础充值系数、额度单位与试算器，并明确 Wallet 订单为支付方式、最低金额和活动优惠的最终口径。
- 为 71 个公开模型提供协议标签、推荐路由、检索/筛选和可复制的按模型调用示例。
- 增加 GitHub Pages 工作流；构建时从公开 status 与 pricing 接口生成同源数据快照，避免浏览器跨域限制导致模型与倍率失效。

### Testing

- node --check outputs/meinianda-newapi-guide/app.js
- node --check scripts/refresh-pricing.mjs
- node scripts/refresh-pricing.mjs，成功生成 71 个模型的数据快照。
- Node JSON 解析确认快照包含 71 个模型、price 0.9 与 quota_per_unit 500000。
- Chrome Headless 桌面渲染检查：目录、首屏、流程卡片和外置脚本均可加载；内置参考目录显示 71 个模型。

### Notes

- outputs/meinianda-newapi-guide/index.html：用户可见的单页文档、样式、目录和文案。
- outputs/meinianda-newapi-guide/app.js：主题、目录、试算、筛选、复制、模型调用弹窗和快照读取交互。
- outputs/meinianda-newapi-guide/README.md：页面交付与数据快照使用说明。
- scripts/refresh-pricing.mjs：生成 GitHub Pages 同源定价快照的无依赖脚本。
- .github/workflows/pages.yml：构建快照并部署 GitHub Pages，含每日刷新任务。
- README.md、docs/meinianda-newapi-guide.md、.gitignore：仓库入口、维护说明和临时/生成文件排除规则。
- progress.md：本轮施工、验证与落点记录。
- Rollback: initial publishing commit 后执行 git revert HEAD，然后再次推送 main。

## 2026-08-02 - Task: Publish Meinianda AI documentation to GitHub Pages

### What was done

- 创建公开仓库 diaomin66/meinianda-newapi-guide，默认分支为 main。
- 启用 GitHub Actions 型 Pages，并将文档站与实时数据快照发布到公开 Pages 地址。
- 确认页面和 data/live.json 均已通过公网访问。

### Testing

- GitHub Actions run 30726071932：build 与 deploy 两个作业均成功。
- 公网主页返回 HTTP 200，标题为 Meinianda AI 开发者文档。
- 公网 data/live.json 返回 HTTP 200，包含 71 个 model_name、pricing 数据与 price 0.9。

### Notes

- GitHub repository：diaomin66/meinianda-newapi-guide，保存源码、Pages 工作流和维护文档。
- GitHub Pages：由 .github/workflows/pages.yml 部署，并在每次推送与每日计划任务时刷新公开模型快照。
- progress.md：追加实际仓库与 Pages 发布验证结果。
- Rollback: git revert bf9912b 然后 git push origin main，可撤销初始文档站交付。
