# Meinianda AI 文档站

这是无需前端构建的静态单页文档站。

部署流程由仓库的 GitHub Actions Pages 工作流完成：

1. 在推送 main、手动运行工作流或每日定时任务时，请求 Meinianda AI 的公开 status 与 pricing 接口。
2. 工作流把数据写入 data/live.json。
3. GitHub Pages 发布本目录，页面同源读取该快照并展示最新模型、倍率、分组与协议。

本地直接预览时，如果没有 data/live.json，页面会显示内置参考模型目录；这是正常降级行为。
