"""Flask application. All circulation mutations commit together with their audit record."""
import csv
import io
import json
import os
import re
import secrets
from datetime import date, datetime, timedelta, timezone
from functools import wraps
from pathlib import Path
import pymysql
from flask import Flask, g, jsonify, request, session, send_from_directory, Response
from werkzeug.exceptions import HTTPException
from werkzeug.security import check_password_hash

ROOT = Path(__file__).parent
local = json.loads((ROOT / '.runtime/local.json').read_text()) if (ROOT / '.runtime/local.json').exists() else {}
app = Flask(__name__, static_folder='static', static_url_path='/static')
app.config.update(SECRET_KEY=os.getenv('SECRET_KEY', local.get('secret', secrets.token_hex(32))),
                  SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Strict',
                  PERMANENT_SESSION_LIFETIME=timedelta(hours=8), MAX_CONTENT_LENGTH=1024*1024)

def now():
    return datetime.now(timezone(timedelta(hours=8))).replace(tzinfo=None, microsecond=0)

def db():
    if 'db' not in g:
        g.db = pymysql.connect(host=os.getenv('DB_HOST',local.get('host','127.0.0.1')),
          port=int(os.getenv('DB_PORT',local.get('port',3307))),
          user=os.getenv('DB_USER',local.get('user','campus_app')),
          password=os.getenv('DB_PASSWORD',local.get('password','')),
          database=os.getenv('DB_NAME',local.get('database','campus_library')),
          charset='utf8mb4', cursorclass=pymysql.cursors.DictCursor, autocommit=False,
          init_command='SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED')
    return g.db

def query(sql, args=(), one=False):
    with db().cursor() as c:
        c.execute(sql, args)
        if c.description:
            return c.fetchone() if one else c.fetchall()
        return c.lastrowid

@app.teardown_appcontext
def close_db(error):
    connection = g.pop('db',None)
    if connection:
        connection.close()

def clean(obj):
    if isinstance(obj, (datetime,date)):
        return obj.isoformat()
    if isinstance(obj, dict):
        return {k:clean(v) for k,v in obj.items()}
    if isinstance(obj, list):
        return [clean(v) for v in obj]
    from decimal import Decimal
    if isinstance(obj, Decimal):
        return float(obj)
    return obj

def ok(data=None, status=200):
    return jsonify(data=clean(data)), status

class Problem(Exception):
    def __init__(self, message, status=400):
        self.message, self.status = message, status

@app.errorhandler(Problem)
def problem(error):
    return jsonify(error=error.message), error.status

@app.errorhandler(pymysql.IntegrityError)
def conflict(error):
    return jsonify(error='数据冲突：ISBN、藏书号或读者证号已存在，或该副本已被借出。'),409

@app.errorhandler(Exception)
def unexpected(error):
    if isinstance(error, HTTPException):
        return jsonify(error=error.description),error.code
    app.logger.exception('Request failed')
    return jsonify(error='服务暂时不可用，请稍后重试。操作未提交。'),500

@app.before_request
def csrf_guard():
    if request.path.startswith('/api/') and request.method not in ('GET','HEAD','OPTIONS'):
        if request.path != '/api/login':
            if not session.get('staff_id'):
                raise Problem('请先登录出纳员账号',401)
            if not secrets.compare_digest(request.headers.get('X-CSRF-Token',''), session.get('csrf','!')):
                raise Problem('会话校验失败，请刷新页面后重试',403)
        origin = request.headers.get('Origin')
        if origin and origin != request.host_url.rstrip('/'):
            raise Problem('不允许跨站请求',403)

@app.after_request
def headers(response):
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['X-Frame-Options']='DENY'
    response.headers['Referrer-Policy']='same-origin'
    response.headers['Content-Security-Policy']="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    if request.path.startswith('/api/'):
        response.headers['Cache-Control']='no-store'
    return response

def protected(fn):
    @wraps(fn)
    def wrapper(*args,**kwargs):
        if not session.get('staff_id'):
            raise Problem('请先登录出纳员账号',401)
        return fn(*args,**kwargs)
    return wrapper

def payload():
    value = request.get_json(silent=True)
    if not isinstance(value,dict):
        raise Problem('请求必须是 JSON 对象')
    return value

def text_value(data, key, maxlen=100, default=None):
    value = data.get(key, default)
    if not isinstance(value,str) or not value.strip() or len(value.strip())>maxlen:
        raise Problem(f'{key} 不能为空且长度不能超过 {maxlen} 字符')
    return value.strip()

def number(data, key, low, high, default=None):
    value = data.get(key, default)
    if isinstance(value,bool):
        raise Problem(f'{key} 必须是整数')
    try:
        result = int(value)
    except (ValueError, TypeError):
        raise Problem(f'{key} 必须是整数')
    if str(result) != str(value) or not low <= result <= high:
        raise Problem(f'{key} 必须在 {low} 到 {high} 之间')
    return result

def audit(action,target,detail):
    query('INSERT INTO audit_logs(staff_id,action,target,detail,created_at) VALUES(%s,%s,%s,%s,%s)',
          (session['staff_id'],action,str(target)[:100],detail[:500],now()))

def initialize():
    with app.app_context():
        for statement in (ROOT / 'schema.sql').read_text(encoding='utf-8').split(';'):
            if statement.strip():
                query(statement)
        db().commit()
        from seed import seed
        seed(db(),now())

@app.get('/')
def index():
    return send_from_directory(app.static_folder,'index.html')

@app.get('/api/session')
def current_session():
    user = query('SELECT id,username,name FROM staff WHERE id=%s',(session.get('staff_id',0),),True)
    return ok({'user':user,'csrf':session.get('csrf')})

@app.post('/api/login')
def login():
    data=payload()
    username=text_value(data,'username',50)
    password=text_value(data,'password',200)
    user=query('SELECT * FROM staff WHERE username=%s',(username,),True)
    if not user or not check_password_hash(user['password_hash'],password):
        raise Problem('账号或密码不正确',401)
    session.clear()
    session.update(staff_id=user['id'],csrf=secrets.token_urlsafe(32))
    session.permanent=True
    audit('登录','出纳工作台',user['name']+' 登录系统')
    db().commit()
    return ok({'user':{k:user[k] for k in ('id','username','name')},'csrf':session['csrf']})

@app.post('/api/logout')
@protected
def logout():
    session.clear()
    return ok(True)

def catalog_data():
    q = request.args.get('q','').strip()[:100]
    category = request.args.get('category','')
    status = request.args.get('status','')
    where = ['1=1']; args=[]
    if q:
        where.append('(b.title LIKE %s OR b.author LIKE %s OR b.isbn LIKE %s OR EXISTS (SELECT 1 FROM copies x WHERE x.book_id=b.id AND x.accession LIKE %s))')
        args.extend(['%'+q+'%']*4)
    if category:
        where.append('b.category=%s'); args.append(category)
    if status:
        where.append('EXISTS (SELECT 1 FROM copies x WHERE x.book_id=b.id AND x.status=%s)'); args.append(status)
    books=query('SELECT b.* FROM books b WHERE '+' AND '.join(where)+' ORDER BY b.id DESC',args)
    copies=query('SELECT * FROM copies ORDER BY accession')
    grouped={}
    for c in copies:
        grouped.setdefault(c['book_id'],[]).append(c)
    for b in books:
        b['copies']=grouped.get(b['id'],[])
        b['available']=sum(c['status']=='available' for c in b['copies'])
    return books

@app.get('/api/catalog')
def catalog():
    return ok(catalog_data())

@app.get('/api/books')
@protected
def books():
    return ok(catalog_data())

def book_fields(data):
    color=data.get('color','#35584b')
    if not isinstance(color,str) or not re.fullmatch(r'#[0-9a-fA-F]{6}',color):
        raise Problem('封面颜色格式不正确')
    return (text_value(data,'isbn',30),text_value(data,'title',150),text_value(data,'author',100),
            text_value(data,'category',30),text_value(data,'publisher',100,'未填写'),
            number(data,'price_cents',1,1000000,5000),color)

def insert_book(data):
    fields=book_fields(data)
    count=number(data,'count',1,30,1)
    prefix=text_value(data,'accession',32)
    location=text_value(data,'location',80)
    book_id=query('INSERT INTO books(isbn,title,author,category,publisher,price_cents,color) VALUES(%s,%s,%s,%s,%s,%s,%s)',fields)
    for i in range(count):
        accession=prefix if count==1 else f'{prefix}-{i+1:02d}'
        query('INSERT INTO copies(book_id,accession,location) VALUES(%s,%s,%s)',(book_id,accession,location))
    audit('图书入库',fields[1],f'{count} 册，藏书号 {prefix}')
    return book_id

@app.post('/api/books')
@protected
def create_book():
    result=insert_book(payload()); db().commit()
    return ok({'id':result},201)

@app.put('/api/books/<int:book_id>')
@protected
def edit_book(book_id):
    if not query('SELECT id FROM books WHERE id=%s FOR UPDATE',(book_id,),True):
        raise Problem('书目不存在',404)
    fields=book_fields(payload())
    query('UPDATE books SET isbn=%s,title=%s,author=%s,category=%s,publisher=%s,price_cents=%s,color=%s WHERE id=%s',(*fields,book_id))
    audit('编辑书目',fields[1],'更新书目信息'); db().commit()
    return ok(True)

@app.post('/api/books/import')
@protected
def import_books():
    rows=payload().get('rows')
    if not isinstance(rows,list) or not 1 <= len(rows) <= 100 or any(not isinstance(x,dict) for x in rows):
        raise Problem('每次导入 1 至 100 行书目')
    for row in rows:
        insert_book(row)
    db().commit()
    return ok({'count':len(rows)},201)

@app.patch('/api/copies/<int:copy_id>')
@protected
def edit_copy(copy_id):
    data=payload(); status=data.get('status')
    if status not in ['available','maintenance','withdrawn']:
        raise Problem('无效副本状态')
    copy=query('SELECT * FROM copies WHERE id=%s FOR UPDATE',(copy_id,),True)
    if not copy:
        raise Problem('副本不存在',404)
    if copy['status']=='borrowed':
        raise Problem('借出中的副本必须先归还',409)
    query('UPDATE copies SET status=%s WHERE id=%s',(status,copy_id))
    audit('副本状态',copy['accession'],status); db().commit()
    return ok(True)

@app.get('/api/readers')
@protected
def readers():
    q='%'+request.args.get('q','').strip()[:100]+'%'
    return ok(query('''SELECT r.*, (SELECT COUNT(*) FROM loans l WHERE l.reader_id=r.id AND l.returned_at IS NULL) borrowed,
      (SELECT COALESCE(SUM(amount_cents),0) FROM fines f WHERE f.reader_id=r.id AND f.paid_at IS NULL) debt_cents
      FROM readers r WHERE r.name LIKE %s OR r.card LIKE %s OR r.department LIKE %s ORDER BY r.id DESC''',(q,q,q)))

def reader_fields(data):
    kind=data.get('kind','student')
    if kind not in ['student','teacher']:
        raise Problem('无效读者类型')
    active=data.get('active',True)
    if not isinstance(active,bool):
        raise Problem('active 必须为布尔值')
    return (text_value(data,'card',40),text_value(data,'name',50),text_value(data,'department',100),kind,
            number(data,'max_loans',1,30,10 if kind=='teacher' else 5),
            number(data,'loan_days',1,180,60 if kind=='teacher' else 30),active)

@app.post('/api/readers')
@protected
def create_reader():
    fields=reader_fields(payload())
    result=query('INSERT INTO readers(card,name,department,kind,max_loans,loan_days,active) VALUES(%s,%s,%s,%s,%s,%s,%s)',fields)
    audit('新增读者',fields[0],fields[1]); db().commit()
    return ok({'id':result},201)

@app.put('/api/readers/<int:reader_id>')
@protected
def edit_reader(reader_id):
    if not query('SELECT id FROM readers WHERE id=%s FOR UPDATE',(reader_id,),True):
        raise Problem('读者不存在',404)
    fields=reader_fields(payload())
    query('UPDATE readers SET card=%s,name=%s,department=%s,kind=%s,max_loans=%s,loan_days=%s,active=%s WHERE id=%s',(*fields,reader_id))
    audit('编辑读者',fields[0],fields[1]); db().commit()
    return ok(True)

LOAN_SELECT='''SELECT l.*, r.name reader_name,r.card,r.department,b.title,b.author,b.color,b.price_cents,c.accession,c.location
 FROM loans l JOIN readers r ON r.id=l.reader_id JOIN copies c ON c.id=l.copy_id JOIN books b ON b.id=c.book_id'''

def decorate_loan(loan):
    end=loan['returned_at'].date() if loan['returned_at'] else now().date()
    loan['overdue_days']=max(0,(end-loan['due_date']).days)
    loan['overdue_cents']=loan['overdue_days']*50
    loan['status']='returned' if loan['returned_at'] else ('overdue' if loan['overdue_days'] else 'active')
    return loan

@app.get('/api/loans')
@protected
def loans():
    q='%'+request.args.get('q','').strip()[:100]+'%'
    rows=query(LOAN_SELECT+' WHERE r.name LIKE %s OR r.card LIKE %s OR b.title LIKE %s OR c.accession LIKE %s ORDER BY l.id DESC',(q,q,q,q))
    rows=[decorate_loan(l) for l in rows]
    status=request.args.get('status','')
    if status:
        rows=[l for l in rows if l['status']==status or (status=='unreturned' and l['status']!='returned')]
    return ok(rows)

def eligible(reader, check_limit=True):
    if not reader['active']:
        raise Problem('读者证已停用',409)
    if query('SELECT id FROM fines WHERE reader_id=%s AND paid_at IS NULL LIMIT 1',(reader['id'],),True):
        raise Problem('读者有未缴罚款，请先处理',409)
    if query('SELECT id FROM loans WHERE reader_id=%s AND returned_at IS NULL AND due_date<%s LIMIT 1',(reader['id'],now().date()),True):
        raise Problem('读者有逾期图书，请先归还',409)
    if check_limit:
        count=query('SELECT COUNT(*) n FROM loans WHERE reader_id=%s AND returned_at IS NULL',(reader['id'],),True)['n']
        if count>=reader['max_loans']:
            raise Problem('已达到读者借阅上限',409)

@app.post('/api/loans')
@protected
def borrow():
    data=payload()
    card=text_value(data,'card',40); accession=text_value(data,'accession',40)
    reader=query('SELECT * FROM readers WHERE card=%s FOR UPDATE',(card,),True)
    if not reader:
        raise Problem('读者证号不存在',404)
    eligible(reader)
    copy=query('SELECT * FROM copies WHERE accession=%s FOR UPDATE',(accession,),True)
    if not copy:
        raise Problem('藏书号不存在',404)
    if copy['status']!='available':
        raise Problem('此副本当前不可借阅',409)
    due=now().date()+timedelta(days=reader['loan_days'])
    loan_id=query('INSERT INTO loans(reader_id,copy_id,borrowed_at,due_date) VALUES(%s,%s,%s,%s)',(reader['id'],copy['id'],now(),due))
    query("UPDATE copies SET status='borrowed' WHERE id=%s",(copy['id'],))
    audit('借出',accession,f"{reader['name']} · 应还 {due}"); db().commit()
    return ok(decorate_loan(query(LOAN_SELECT+' WHERE l.id=%s',(loan_id,),True)),201)

def lock_loan(loan_id):
    ref=query('SELECT reader_id,copy_id FROM loans WHERE id=%s',(loan_id,),True)
    if not ref:
        raise Problem('借阅记录不存在',404)
    reader=query('SELECT * FROM readers WHERE id=%s FOR UPDATE',(ref['reader_id'],),True)
    copy=query('SELECT * FROM copies WHERE id=%s FOR UPDATE',(ref['copy_id'],),True)
    loan=query('SELECT * FROM loans WHERE id=%s FOR UPDATE',(loan_id,),True)
    if loan['returned_at']:
        raise Problem('该借阅已归还，无需重复处理',409)
    return reader,copy,loan

@app.post('/api/loans/<int:loan_id>/renew')
@protected
def renew(loan_id):
    reader,copy,loan=lock_loan(loan_id)
    eligible(reader,False)
    if loan['renewals']>=1:
        raise Problem('每次借阅最多续借一次',409)
    due=loan['due_date']+timedelta(days=reader['loan_days'])
    query('UPDATE loans SET due_date=%s,renewals=renewals+1 WHERE id=%s',(due,loan_id))
    audit('续借',copy['accession'],f'应还日期延长至 {due}'); db().commit()
    return ok({'due_date':due})

@app.get('/api/returns/<accession>')
@protected
def return_preview(accession):
    loan=query(LOAN_SELECT+' WHERE c.accession=%s AND l.returned_at IS NULL',(accession,),True)
    if not loan:
        raise Problem('该藏书号没有待归还记录',404)
    return ok(decorate_loan(loan))

@app.post('/api/loans/<int:loan_id>/return')
@protected
def return_book(loan_id):
    data=payload(); condition=data.get('condition','normal')
    if condition not in ['normal','stained','torn','lost']:
        raise Problem('无效图书状况')
    note=data.get('note','')
    if not isinstance(note,str) or len(note)>200:
        raise Problem('备注最长 200 字')
    reader,copy,loan=lock_loan(loan_id)
    book=query('SELECT * FROM books WHERE id=%s',(copy['book_id'],),True)
    late=max(0,(now().date()-loan['due_date']).days)
    damage={'normal':0,'stained':1000,'torn':3000,'lost':book['price_cents']}[condition]
    labels={'normal':'完好','stained':'污损','torn':'撕毁','lost':'遗失'}
    for kind,amount,reason in [('overdue',late*50,f'逾期 {late} 天 × 0.50 元'),('damage',damage,labels[condition]+' '+note)]:
        if amount:
            query('INSERT INTO fines(loan_id,reader_id,kind,amount_cents,note,created_at) VALUES(%s,%s,%s,%s,%s,%s)',(loan_id,reader['id'],kind,amount,reason,now()))
    query('UPDATE loans SET returned_at=%s,condition_note=%s WHERE id=%s',(now(),labels[condition]+' '+note,loan_id))
    query('UPDATE copies SET status=%s WHERE id=%s',('available' if condition=='normal' else 'maintenance',copy['id']))
    audit('归还',copy['accession'],f"{reader['name']} · {labels[condition]} · 应缴 {(late*50+damage)/100:.2f} 元"); db().commit()
    return ok({'fine_cents':late*50+damage,'condition':condition,'accession':copy['accession']})

@app.get('/api/fines')
@protected
def fines():
    return ok(query('''SELECT f.*,r.name reader_name,r.card,b.title FROM fines f JOIN readers r ON r.id=f.reader_id
     JOIN loans l ON l.id=f.loan_id JOIN copies c ON c.id=l.copy_id JOIN books b ON b.id=c.book_id ORDER BY f.id DESC'''))

@app.post('/api/fines/<int:fine_id>/pay')
@protected
def pay_fine(fine_id):
    ref=query('SELECT reader_id FROM fines WHERE id=%s',(fine_id,),True)
    if not ref:
        raise Problem('罚款记录不存在',404)
    query('SELECT id FROM readers WHERE id=%s FOR UPDATE',(ref['reader_id'],),True)
    fine=query('SELECT * FROM fines WHERE id=%s FOR UPDATE',(fine_id,),True)
    if fine['paid_at']:
        raise Problem('此罚款已缴清',409)
    query('UPDATE fines SET paid_at=%s WHERE id=%s',(now(),fine_id))
    audit('缴款登记',str(fine_id),f"线下收款 {fine['amount_cents']/100:.2f} 元"); db().commit()
    return ok(True)

def dashboard_data():
    today=now().date()
    count=lambda sql,args=():query(sql,args,True)['n']
    stats={'books':count('SELECT COUNT(*) n FROM books'),
      'copies':count("SELECT COUNT(*) n FROM copies WHERE status<>'withdrawn'"),
      'available':count("SELECT COUNT(*) n FROM copies WHERE status='available'"),
      'borrowed':count('SELECT COUNT(*) n FROM loans WHERE returned_at IS NULL'),
      'readers':count('SELECT COUNT(*) n FROM readers'),
      'overdue':count('SELECT COUNT(*) n FROM loans WHERE returned_at IS NULL AND due_date<%s',(today,)),
      'today_borrowed':count('SELECT COUNT(*) n FROM loans WHERE borrowed_at >= %s',(today,)),
      'today_returned':count('SELECT COUNT(*) n FROM loans WHERE returned_at >= %s',(today,))}
    trend=[]
    for i in range(6,-1,-1):
        day=today-timedelta(days=i); end=day+timedelta(days=1)
        trend.append({'date':day,'borrowed':count('SELECT COUNT(*) n FROM loans WHERE borrowed_at >= %s AND borrowed_at<%s',(day,end)),
                      'returned':count('SELECT COUNT(*) n FROM loans WHERE returned_at >= %s AND returned_at<%s',(day,end))})
    recent=[decorate_loan(x) for x in query(LOAN_SELECT+' ORDER BY l.borrowed_at DESC LIMIT 6')]
    due=[decorate_loan(x) for x in query(LOAN_SELECT+' WHERE l.returned_at IS NULL AND l.due_date<=%s ORDER BY l.due_date LIMIT 5',(today+timedelta(days=3),))]
    return {'stats':stats,'trend':trend,'recent':recent,'due':due,'date':today}

@app.get('/api/dashboard')
@protected
def dashboard():
    return ok(dashboard_data())

@app.get('/api/reports')
@protected
def reports():
    data=dashboard_data()
    data['categories']=query("SELECT b.category,COUNT(c.id) total,SUM(c.status='borrowed') borrowed FROM books b JOIN copies c ON c.book_id=b.id WHERE c.status<>'withdrawn' GROUP BY b.category ORDER BY total DESC")
    data['popular']=query('SELECT b.title,b.author,b.color,COUNT(l.id) total FROM books b JOIN copies c ON c.book_id=b.id LEFT JOIN loans l ON l.copy_id=c.id GROUP BY b.id ORDER BY total DESC,b.id LIMIT 6')
    data['overdue']=[decorate_loan(x) for x in query(LOAN_SELECT+' WHERE l.returned_at IS NULL AND l.due_date<%s ORDER BY l.due_date',(now().date(),))]
    data['fines']=query('SELECT COALESCE(SUM(amount_cents),0) total, COALESCE(SUM(IF(paid_at IS NULL,amount_cents,0)),0) unpaid FROM fines',one=True)
    return ok(data)

@app.get('/api/audit')
@protected
def audit_list():
    return ok(query('SELECT a.*,s.name staff_name FROM audit_logs a JOIN staff s ON s.id=a.staff_id ORDER BY a.id DESC LIMIT 200'))

@app.get('/api/export/<kind>')
@protected
def export(kind):
    if kind=='loans':
        rows=query(LOAN_SELECT+' ORDER BY l.id DESC')
        fields=['id','reader_name','card','title','accession','borrowed_at','due_date','returned_at']
        labels=['借阅编号','读者','读者证号','书名','藏书号','借出时间','应还日期','归还时间']
    elif kind=='fines':
        rows=query('SELECT f.*,r.name FROM fines f JOIN readers r ON r.id=f.reader_id ORDER BY f.id DESC')
        fields=['id','name','kind','amount_cents','note','created_at','paid_at']
        labels=['编号','读者','类型','金额（分）','说明','生成时间','缴清时间']
    else:
        raise Problem('导出类型不存在',404)
    stream=io.StringIO(); writer=csv.writer(stream); writer.writerow(labels)
    for row in rows:
        values=[]
        for key in fields:
            value=str(row[key]) if row[key] is not None else ''
            if value.startswith(('=','+','-','@','\t','\r')):
                value="'"+value
            values.append(value)
        writer.writerow(values)
    return Response('\ufeff'+stream.getvalue(),mimetype='text/csv; charset=utf-8',headers={'Content-Disposition':f'attachment; filename="{kind}-{now().date()}.csv"'})
