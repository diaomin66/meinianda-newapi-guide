# Meinianda AI 文档站维护说明

正式交付物位于 outputs/meinianda-newapi-guide。

- 页面采用原创的控制台式三栏文档界面，只参考新版 NewAPI 的通用信息密度和交互模式；不复用其代码、品牌素材或文案。
- GitHub Pages 工作流执行 scripts/refresh-pricing.mjs，以公开 status 和 pricing 接口生成同源数据快照，绕开浏览器跨域读取限制。
- 充值页面显示基础支付系数、额度展示方式与内部额度单位。支付方式、最低充值额、分组倍率和活动折扣以登录后的 Wallet 订单为准。
- 发生数据同步失败时，工作流应失败而不是发布伪造的实时数据；页面保留内置参考目录，保障本地离线预览。
