# LIBRA · 校园图书馆出纳自动化管理系统

**信息系统分析与设计课程项目 · 肖沁峰组**

按第 7 周规划 PPT 的业务范围实现，并提升交互与数据一致性。技术为 **原生 HTML / CSS / JavaScript + Flask + MySQL**。没有 React、Vue、Node 后端或 SQLite 替代数据库。Node 仅用于浏览器端到端测试，运行应用无需 Node。

## 在这台电脑直接打开

1. 双击本目录 `start.cmd`，等待出现 `http://127.0.0.1:4317`。
2. 浏览器打开 <http://127.0.0.1:4317>。
3. 出纳员账号 **admin**，演示密码 **Library@2026**。
4. 访客检索入口：<http://127.0.0.1:4317/#catalog>。

已配好项目独立的 Python 虚拟环境与 MySQL 便携运行环境。MySQL 仅绑定本机 `127.0.0.1:3307`，不注册系统服务。网页使用 `4317` 端口。`start.cmd` 前台运行网页服务，窗口关闭后网页停止；数据库进程保持运行，可用 `stop.cmd` 正常关闭。为兼容 MySQL 的中文路径解析，启动器在 `%LOCALAPPDATA%/LIBRA-Campus` 建立指向本项目 `.runtime` 的目录联接，数据实际仍留在项目内。移动项目后需要重新建立该联接；不要直接递归删除联接中的文件。

所有示例读者均为虚构。书目元数据是课程演示样例，封面为本项目的文字版设计，不代表出版社真实封面。首页的三本装饰性“书”是界面视觉元素，不是馆藏数据。

## 已实现的业务

| PPT 模块 | 实际功能 |
|---|---|
| 登录与权限 | 密码哈希、出纳员会话、公开检索、私有接口权限、CSRF 校验 |
| 图书信息管理 | 新书录入、编辑、批量 CSV 导入、每册唯一藏书号、副本维护 / 下架 / 上架 |
| 读者信息管理 | 新增 / 编辑、学生 / 教师、自定义上限与借期、证件停用 |
| 图书检索 | 书名部分匹配、作者、ISBN、藏书号、分类与状态过滤、卡片 / 列表 |
| 借书与还书 | 原子借出、自动应还日、去向追踪、一次续借、归还、扫码枪键盘输入、可打印凭证 |
| 逾期与违规 | 自然日逾期、整数分计价、污损 / 撕毁 / 遗失、罚款流水、线下缴清、排行、CSV 导出 |
| 管理支持 | 仪表盘、近七日趋势、馆藏分类、热门借阅、当前在借率、操作日志、手机布局 |

业务规则详见 [设计与验收](docs/设计与验收.md)。数据模型、用例、DFD、类图和时序图详见 [系统分析与设计](docs/系统分析与设计.md)。

## 五分钟演示顺序

1. 免登录进入馆藏，搜索“三体”，查看每册藏书号与位置。
2. 用演示账号登录，展示首页实时指标、流通趋势和归还提醒。
3. 进入借还工作台，用 `20260001` 借 `LIB-001-02`，展示应还日期与打印凭证。
4. 进入借阅记录，按藏书号检索并续借，展示日期延长和续借次数。
5. 办理归还。选择“污损”观察费用，再提交生成罚款和维护状态。
6. 在罚款页登记线下缴清，在馆藏页将维护副本恢复在库。
7. 展示统计报表和操作日志，说明业务操作、馆藏状态和审计在同一事务内保存。

初始数据有 16 种书目、40 册实体副本、12 位读者、11 笔在借和 28 笔已归还记录。以首次初始化日期生成到期日，之后数据按真实时间推进，不会每次启动重置。示例 `LIB-002-02`、`LIB-004-02` 初始存在逾期，便于演示。演示数据被修改后，按页面实际状态选择可借副本；不要为了演示直接改生产数据库。

## 在另一台电脑部署

推荐 Python 3.12+，MySQL 8.4，Windows 10/11。项目中的数据库环境是 [MySQL 官方 Windows ZIP 包](https://dev.mysql.com/doc/refman/8.4/en/windows-installation.html)，当前课程演示使用 8.4.6；面向真实生产部署时应独立规划版本与维护。

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

从 [MySQL 官方归档](https://downloads.mysql.com/archives/community/) 下载 Windows ZIP，将 `mysql-8.4.x-winx64` 文件夹解压到 `.runtime/` 下，然后运行 `start.cmd`。该启动器会创建仅在本机监听的数据库、随机数据库凭据以及应用专用账号。MySQL 需要 Microsoft Visual C++ 运行库。

如果使用已有 MySQL，可设置 `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`、`SECRET_KEY`，准备好 UTF-8 数据库后运行：

```powershell
.\.venv\Scripts\python.exe -c "from app import app,initialize; from waitress import serve; initialize(); serve(app,host='127.0.0.1',port=4317,threads=8)"
```

不要把 `.runtime/local.json`、数据库目录或 `.venv` 提交到 Git。数据库凭据在首次启动时随机生成；演示用网页账号密码单独固定，交给真实用户使用前应修改。

## 可重复验证

```powershell
npm install
npm run check
npm run test:e2e
```

测试默认使用已安装的 Microsoft Edge；支持通过 `BROWSER_CHANNEL=chrome` 指定 Chrome。`tests/serve.py` 仅重建 **campus_library_e2e** 测试数据库，在端口 `4318` 运行真实 Flask 服务，不修改展示用的 **campus_library**。

测试通过浏览器与 HTTP 覆盖公开检索、鉴权、登录错误、CSRF、入库编辑、读者管理、借出续借、归还损坏、缴款、并发冲突、上限、到期日边界、CSV 回滚与导出、移动端和退出登录。结果保存在：

- `artifacts/e2e-results.json`：每项结果、时间与失败详情。
- `artifacts/01-dashboard.png` 等：实际浏览器页面截图。
- `artifacts/e2e-trace.zip`：可用 `npx playwright show-trace artifacts/e2e-trace.zip` 回放。
- `artifacts/loans-export.csv`：测试中从界面下载的真实导出文件。

手动验收：刷新后借阅仍存在；两窗口借同一册只能一个成功；欠款和停用读者不能新借；借出副本不能直接下架；重复归还和重复缴款被拒绝；未登录无法查看读者档案；手机宽度下可展开侧栏、检索和完成表单。

## 项目结构

```text
app.py                   Flask 路由、业务校验、事务、统计和导出
schema.sql               MySQL 表、索引、外键及约束
seed.py                  首次初始化的课程演示数据
run.py / start.cmd       本机启动入口
scripts/setup.py         独立 MySQL 环境启动与初始化
static/index.html        页面入口
static/style.css         设计系统与响应式布局
static/app.js            原生 JavaScript 页面和交互
docs/                    分析设计、接口和验收文档
tests/                   真实浏览器与 MySQL 的 E2E
artifacts/               可复查的测试报告和截图
```

本项目为本地课程交付版。没有接学校统一身份认证、真实读者数据、硬件扫码 SDK 或在线支付。扫码枪采用通用键盘输入模式，缴款是线下收款登记；打印通过浏览器打印对话框完成。外网部署、HTTPS、账号生命周期、备份策略与监控属于正式运维工作。

## GitHub 仓库说明

仓库包含源码、设计文档、验收结果和截图，不包含本机 Python 环境、MySQL 程序、数据库文件或随机生成的数据库密码。克隆后请按“在另一台电脑部署”配置环境。浏览器 Trace 含测试会话信息，不随仓库发布；运行 E2E 后可在本机生成。

![LIBRA 工作台预览](artifacts/preview-dashboard.png)
