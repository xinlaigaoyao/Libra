from scripts.setup import setup
setup()
from app import app, initialize
initialize()
if __name__ == '__main__':
    from waitress import serve
    print('LIBRA Campus Library: http://127.0.0.1:4317', flush=True)
    serve(app, host='127.0.0.1', port=4317, threads=8)
