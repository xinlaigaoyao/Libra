"""Create a readable acceptance report and a source-only handoff archive."""
import html, json, zipfile
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'artifacts'
report=json.loads((OUTPUT/'e2e-results.json').read_text(encoding='utf-8'))
names=[
 '公开检索与隐私接口鉴权','错误密码与浏览器登录、CSRF',
 '馆藏检索、视图切换、入库与编辑','读者档案新增与编辑',
 '借阅凭证、刷新持久化、重复及上限拦截','续借流程与次数限制',
 '损坏归还、维护状态、罚款与缴清','同一副本并发借阅互斥',
 '同一读者并发借阅上限','到期当天、逾期一天、并发归还计费',
 '输入校验、下架与停用拦截、导入事务回滚','CSV 导入导出、空状态、统计与审计',
 '手机导航、布局和退出后的权限保护']
passed=sum(c['status']=='passed' for c in report['checks'])
rows=''.join(f'<tr><td>{i+1:02}</td><td>{html.escape(names[i] if i<len(names) else c["name"])}</td><td>{"通过" if c["status"]=="passed" else "失败"}</td><td>{c.get("ms",0)} ms</td></tr>' for i,c in enumerate(report['checks']))
screens=''.join(f'<a href="{html.escape(p)}"><img src="{html.escape(p)}" alt="浏览器验收截图"><span>{html.escape(p)}</span></a>' for p in report['screenshots'])
completed=datetime.fromisoformat(report['finished'].replace('Z','+00:00')).astimezone(timezone(timedelta(hours=8))).strftime('%Y-%m-%d %H:%M:%S UTC+8')
document=f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LIBRA 验收报告</title>
<style>body{{margin:0;background:#f5f5f0;color:#243d30;font:14px/1.8 "Segoe UI","Microsoft YaHei",sans-serif}}main{{max-width:1000px;margin:50px auto;padding:30px}}header{{border-bottom:1px solid #d9e0d3;padding-bottom:25px}}.overline{{letter-spacing:3px;color:#8a9b7b;font-size:11px}}h1{{font-size:32px;margin:12px 0}}h2{{font-size:20px;margin:32px 0 14px}}.success{{display:inline-block;background:#e2edda;color:#416535;border-radius:8px;padding:9px 16px}}p{{color:#74856a}}table{{width:100%;border-collapse:collapse;background:white}}th,td{{text-align:left;padding:13px 18px;border-bottom:1px solid #e8eddf}}th{{background:#eaf0e2}}.images{{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}}.images a{{background:white;border:1px solid #e1e6d8;border-radius:10px;overflow:hidden;color:#536b45;text-decoration:none}}.images img{{width:100%;height:230px;object-fit:cover;object-position:top}}.images span{{display:block;padding:12px;font-size:11px}}code{{background:#e9eee1;padding:3px 7px;border-radius:4px}}a{{color:#386542}}@media(max-width:650px){{main{{padding:20px;margin:10px}}.images{{grid-template-columns:1fr}}td,th{{padding:10px 6px;font-size:11px}}}}</style>
<main><header><div class="overline">LIBRA / ACCEPTANCE REPORT</div><h1>校园图书馆系统 · 验收报告</h1><p>信息系统分析与设计课程项目 · 肖沁峰组</p><div class="success">{passed} / {len(report['checks'])} 组端到端场景通过</div><p>完成时间：{completed}</p></header>
<h2>验证环境与范围</h2><p>实际运行 Flask + MySQL 8.4.6 + 原生 HTML / CSS / JavaScript，使用 Microsoft Edge 与 Playwright 完成浏览器交互和 HTTP 业务检查。测试数据库为 <code>campus_library_e2e</code>，展示数据库为 <code>campus_library</code>。测试不使用模拟接口或内存替代数据库。</p>
<p>该报告验证功能和上述边界场景，不代表生产压力测试、学校环境联调或正式安全审计。</p>
<table><thead><tr><th>#</th><th>验收场景</th><th>结果</th><th>耗时</th></tr></thead><tbody>{rows}</tbody></table>
<h2>可核验的交付物</h2><p><a href="e2e-results.json">原始 JSON 报告</a> · <a href="e2e-trace.zip">浏览器执行 Trace</a> · <a href="loans-export.csv">界面下载的 CSV</a></p>
<p>在项目目录运行 <code>npm install</code> 后执行 <code>npm run test:e2e</code> 即可重建独立测试库并重复验证。使用 <code>npx playwright show-trace artifacts/e2e-trace.zip</code> 回放操作。</p>
<h2>浏览器截图</h2><p>截图来自验收过程，可能包含 E2E 测试书目与读者。点击查看原始图片。</p><div class="images">{screens}</div>
<h2>课程文档</h2><p><a href="../README.md">启动与五分钟演示说明</a> · <a href="../docs/系统分析与设计.md">用例、DFD、ER、类图、时序图</a> · <a href="../docs/设计与验收.md">接口契约与失效场景</a></p></main></html>'''
(OUTPUT/'验收报告.html').write_text(document,encoding='utf-8')

archive=ROOT.parent/'LIBRA-校园图书馆-源码与文档.zip'
top_files=['app.py','seed.py','schema.sql','run.py','start.cmd','stop.cmd','requirements.txt','requirements.lock.txt','package.json','package-lock.json','README.md','.gitignore']
files=[ROOT/name for name in top_files if (ROOT/name).exists()]
for directory in ['static','docs','scripts','tests','artifacts']:
    files.extend(p for p in (ROOT/directory).rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ['.pyc','.log'])
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files:
        z.write(p,Path('campus-library')/p.relative_to(ROOT))
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert not any('/.runtime/' in p or '/.venv/' in p or p.endswith('local.json') for p in z.namelist())
print(f'Created {archive.name}: {archive.stat().st_size:,} bytes; {len(files)} files; no runtime or credentials.')
