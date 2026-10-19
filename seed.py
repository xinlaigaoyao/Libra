from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash

BOOKS = [
 ('9787115610548','设计心理学','唐纳德·诺曼','艺术设计','中信出版社',6900,'#df673b'),
 ('9787111641247','数据库系统概念','Abraham Silberschatz','计算机','机械工业出版社',13900,'#3d647a'),
 ('9787115428028','Python 编程：从入门到实践','Eric Matthes','计算机','人民邮电出版社',8900,'#c5a854'),
 ('9787020139922','活着','余华','文学','作家出版社',4500,'#b94e46'),
 ('9787536692930','三体','刘慈欣','文学','重庆出版社',6800,'#294b60'),
 ('9787108042453','人类简史','尤瓦尔·赫拉利','历史人文','中信出版社',6800,'#d7c6a2'),
 ('9787111213826','算法导论','Thomas H. Cormen','计算机','机械工业出版社',12800,'#55634a'),
 ('9787508684031','原则','瑞·达利欧','经济管理','中信出版社',9800,'#292e32'),
 ('9787111544937','信息系统分析与设计','薛华成','计算机','清华大学出版社',5900,'#547365'),
 ('9787115546081','认知觉醒','周岭','心理成长','人民邮电出版社',5980,'#e6c662'),
 ('9787544270878','小王子','安托万·德·圣埃克苏佩里','文学','南海出版公司',3200,'#69948e'),
 ('9787544253994','百年孤独','加西亚·马尔克斯','文学','南海出版公司',5500,'#ac755a'),
 ('9787111542235','计算机网络','谢希仁','计算机','电子工业出版社',6900,'#4b6d9b'),
 ('9787301256999','艺术的故事','贡布里希','艺术设计','广西美术出版社',18800,'#796285'),
 ('9787208061644','万历十五年','黄仁宇','历史人文','中华书局',4800,'#918065'),
 ('9787111407010','深入理解计算机系统','Randal E. Bryant','计算机','机械工业出版社',13900,'#5a6481'),
]

def seed(connection, now):
    with connection.cursor() as c:
        c.execute('SELECT COUNT(*) n FROM staff')
        if c.fetchone()['n']:
            return
        c.execute('INSERT INTO staff(username,name,password_hash) VALUES(%s,%s,%s)',
                  ('admin','肖沁峰',generate_password_hash('Library@2026')))
        for i, book in enumerate(BOOKS):
            c.execute('INSERT INTO books(isbn,title,author,category,publisher,price_cents,color) VALUES(%s,%s,%s,%s,%s,%s,%s)', book)
            book_id = c.lastrowid
            for j in range(3 if i < 8 else 2):
                c.execute('INSERT INTO copies(book_id,accession,location) VALUES(%s,%s,%s)',
                          (book_id,f'LIB-{i+1:03d}-{j+1:02d}',f'{2 if i%2 else 3}F · {chr(65+i%4)}区 · {i+1:02d}架'))
        names = ['林知夏','陈宇航','沈书宁','许嘉禾','周以安','苏明远','陆星遥','顾清和','邓皓柏','肖沁峰','江予白','温可欣']
        for i, name in enumerate(names):
            teacher = i in [5,7]
            c.execute('INSERT INTO readers(card,name,department,kind,max_loans,loan_days) VALUES(%s,%s,%s,%s,%s,%s)',
                      (f'2026{i+1:04d}',name,['计算机学院','经济管理学院','人文学院','设计学院'][i%4],
                       'teacher' if teacher else 'student',10 if teacher else 5,60 if teacher else 30))
        c.execute('SELECT id FROM copies ORDER BY id')
        copies = [x['id'] for x in c.fetchall()]
        for i in range(11):
            due = now.date() + timedelta(days=[12,7,-3,1,20,-7,18,2,6,25,10][i])
            c.execute('INSERT INTO loans(reader_id,copy_id,borrowed_at,due_date) VALUES(%s,%s,%s,%s)',
                      (i+1,copies[i*2],now-timedelta(days=30-(due-now.date()).days),due))
            c.execute("UPDATE copies SET status='borrowed' WHERE id=%s", (copies[i*2],))
        active_copies = {copies[i*2] for i in range(11)}
        history_copies = [copy for copy in copies if copy not in active_copies]
        for i in range(28):
            day = now-timedelta(days=1+i%7, hours=i%8)
            c.execute('INSERT INTO loans(reader_id,copy_id,borrowed_at,due_date,returned_at) VALUES(%s,%s,%s,%s,%s)',
                      (i%12+1,history_copies[i%len(history_copies)],day,day.date()+timedelta(days=30),day+timedelta(hours=2)))
        c.execute("INSERT INTO audit_logs(staff_id,action,target,detail,created_at) VALUES(1,'系统初始化','演示数据','已载入虚构读者与馆藏样例，供课程演示',%s)", (now,))
    connection.commit()
