# 自动刷新access token

借助cloudflare worker实现refresh token自动刷新one-api平台的access token(key)

## 操作步骤

1. 登录cloudflare(废话~)

2. 【重要】新建KV，名称为: **ATKV**。进入`ATKV`,创建一条数据,key为 `KEY_LIST`,value为 `[]`

3. 新建workber -> Setting ->  Variables -> Variable name -> KV Namespace Bindings绑定KV，名称为: **ATKV**

4. 编辑代码 -> 粘贴 [worker.js](./worker.js)  代码【自行修改代码中的配置说明】 -> **部署**

5. 添加定时刷新：Setting ->  Cron Triggers -> 添加自定义定时刷新

## 其他说明

1. 定时任务默认强制刷新`access token`。

2. 不要泄露你的worker地址，否则可能会被人恶意刷新access token导致账户异常,在worker地址后面加上`?force=true`，会强制刷新一次access token. 当然你也可以在设置中关闭web访问。

