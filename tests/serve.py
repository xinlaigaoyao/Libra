"""Disposable E2E database, deliberately separate from the demonstration database."""
import json, os, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import pymysql
config=json.loads((ROOT/'.runtime/local.json').read_text())
database='campus_library_e2e'
with pymysql.connect(host='127.0.0.1',port=config['port'],user='root',password=config['root_password'],autocommit=True) as conn:
    with conn.cursor() as c:
        c.execute('DROP DATABASE IF EXISTS campus_library_e2e')
        c.execute('CREATE DATABASE campus_library_e2e CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci')
        c.execute('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, REFERENCES, INDEX ON campus_library_e2e.* TO %s@%s',(config['user'],'127.0.0.1'))
os.environ['DB_NAME']=database
from app import app,initialize
initialize()
# Fixture dates cover due-today and yesterday without introducing a test API.
from app import db,query,now
from datetime import timedelta
with app.app_context():
    query('UPDATE loans SET due_date=%s WHERE id=1',(now().date(),))
    query('UPDATE loans SET due_date=%s WHERE id=2',(now().date()-timedelta(days=1),))
    db().commit()
from waitress import serve
print('E2E server http://127.0.0.1:4318',flush=True)
serve(app,host='127.0.0.1',port=4318,threads=8)
