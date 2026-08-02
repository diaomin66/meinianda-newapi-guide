# Meinianda AI 使用文档

GitHub Pages 静态文档站，涵盖：

- 新用户注册、充值、创建 API Key、模型选择和首次调用
- 充值基础比例、到账口径和试算
- OpenAI、Responses、Claude、Gemini、向量、重排、图像与视频接口
- 所有公开模型的协议、推荐路由与可复制调用示例

每次推送 main 和每日计划任务都会从 Meinianda AI 的公开状态、定价接口生成最新数据快照，再部署至 GitHub Pages。

本地直接打开 outputs/meinianda-newapi-guide/index.html 即可预览。若需要连同实时快照预览，可运行：

    node scripts/refresh-pricing.mjs
    python -m http.server 8080 --directory outputs/meinianda-newapi-guide

随后访问 http://127.0.0.1:8080。
