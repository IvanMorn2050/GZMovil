import pymysql
import pymysql.cursors
from config import Config


def get_db():
    return pymysql.connect(
        host=Config.DB_HOST,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        db=Config.DB_NAME,
        port=Config.DB_PORT,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )
