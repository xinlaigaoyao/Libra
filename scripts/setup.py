"""Project-local MySQL bootstrap. No Windows service or system PATH changes."""
import json, os, secrets, socket, subprocess, time
from pathlib import Path
import pymysql

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / '.runtime'

def native_path(path):
    # Some MySQL Windows builds truncate Unicode command lines. The junction is
    # an ASCII alias only: data and binaries remain inside this project.
    path = Path(path)
    if os.name == 'nt':
        alias = Path(os.environ['LOCALAPPDATA']) / 'LIBRA-Campus'
        if not alias.exists():
            import _winapi
            _winapi.CreateJunction(str(RUNTIME),str(alias))
        if not os.path.samefile(alias,RUNTIME):
            raise RuntimeError('LIBRA-Campus runtime alias belongs to another project.')
        return str(alias / path.relative_to(RUNTIME))
    return str(path)

def setup():
    RUNTIME.mkdir(exist_ok=True)
    config_path = RUNTIME / 'local.json'
    if config_path.exists():
        config = json.loads(config_path.read_text())
    else:
        config = {'host': '127.0.0.1', 'port': 3307, 'user': 'campus_app',
                  'password': secrets.token_urlsafe(28), 'database': 'campus_library',
                  'secret': secrets.token_urlsafe(40), 'root_password': secrets.token_urlsafe(28)}
        config_path.write_text(json.dumps(config), encoding='utf-8')
    binary = next(RUNTIME.glob('mysql-*/bin/mysqld.exe'), None)
    if not binary:
        raise RuntimeError('Extract the official MySQL Windows ZIP into .runtime first. See README.')
    datadir = RUNTIME / 'mysql-data'
    initialized = datadir.exists() and (datadir / 'mysql').exists()
    if not initialized:
        subprocess.run([native_path(binary), '--no-defaults', '--initialize-insecure',
                        f'--basedir={native_path(binary.parent.parent)}', f'--datadir={native_path(datadir)}'], check=True,
                       creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
    try:
        with socket.create_connection(('127.0.0.1', config['port']), timeout=1):
            pass
    except OSError:
        log = open(RUNTIME / 'mysql-console.log', 'a')
        subprocess.Popen([native_path(binary), '--no-defaults', f'--basedir={native_path(binary.parent.parent)}',
                          f'--datadir={native_path(datadir)}', '--bind-address=127.0.0.1', f"--port={config['port']}",
                          '--mysqlx=OFF', '--innodb-buffer-pool-size=128M',
                          f'--log-error={native_path(RUNTIME / "mysql-error.log")}'], stdout=log, stderr=log,
                         creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        log.close()
    connection = None
    for _ in range(80):
        try:
            connection = pymysql.connect(host='127.0.0.1', port=config['port'], user='root',
                                         password=config['root_password'] if config.get('configured') else '', autocommit=True,
                                         connect_timeout=1,read_timeout=5)
            break
        except pymysql.Error as error:
            if error.args[0] == 1045 and not config.get('configured'):
                # Recover if an earlier bootstrap stopped after setting root's
                # password but before persisting the completion marker.
                try:
                    connection = pymysql.connect(host='127.0.0.1',port=config['port'],user='root',
                                                 password=config['root_password'],autocommit=True,
                                                 connect_timeout=1,read_timeout=5)
                    break
                except pymysql.Error:
                    pass
            time.sleep(.5)
    if connection is None:
        raise RuntimeError('MySQL did not start. Inspect .runtime/mysql-error.log; port 3307 must belong to this project.')
    with connection, connection.cursor() as cur:
        if not config.get('configured'):
            cur.execute('ALTER USER CURRENT_USER() IDENTIFIED BY %s', (config['root_password'],))
        cur.execute('CREATE DATABASE IF NOT EXISTS campus_library CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci')
        cur.execute('CREATE USER IF NOT EXISTS %s@%s IDENTIFIED BY %s', (config['user'], '127.0.0.1', config['password']))
        cur.execute('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, REFERENCES, INDEX ON campus_library.* TO %s@%s', (config['user'], '127.0.0.1'))
    config['configured'] = True
    config_path.write_text(json.dumps(config), encoding='utf-8')
    print('MySQL ready on 127.0.0.1:3307 (project-local).')
    return config

if __name__ == '__main__':
    setup()
