"""Gracefully stop only this project's MySQL instance."""
import json
from pathlib import Path
import pymysql
root=Path(__file__).resolve().parents[1]
config=json.loads((root/'.runtime/local.json').read_text())
try:
    with pymysql.connect(host='127.0.0.1',port=config['port'],user='root',password=config['root_password']) as connection:
        with connection.cursor() as cursor:
            cursor.execute('SHUTDOWN')
    print('Project MySQL stopped. Close the start.cmd window to stop the web server.')
except pymysql.err.OperationalError as error:
    if error.args[0]==2003:
        print('Project MySQL is already stopped.')
    else:
        raise
