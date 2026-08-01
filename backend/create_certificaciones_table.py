"""
Run once to create the certificacion table (certificados PDF subidos por el usuario).
  cd backend && python create_certificaciones_table.py
"""
import sys
import pymysql
from config import Config


def run():
    db = pymysql.connect(
        host=Config.DB_HOST, user=Config.DB_USER, password=Config.DB_PASSWORD,
        db=Config.DB_NAME, port=Config.DB_PORT, charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor, autocommit=False,
    )
    try:
        with db.cursor() as cur:
            cur.execute('''
                CREATE TABLE IF NOT EXISTS certificacion (
                    id              INT AUTO_INCREMENT PRIMARY KEY,
                    id_usuario      INT NOT NULL,
                    nombre_archivo  VARCHAR(255) NOT NULL,
                    archivo_url     VARCHAR(255) NOT NULL,
                    creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_usuario (id_usuario),
                    FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ''')
            print('  + certificacion OK')
            db.commit()
            print('\nListo. Tabla creada correctamente.')
    except Exception as e:
        db.rollback()
        print(f'ERROR: {e}')
        sys.exit(1)
    finally:
        db.close()


if __name__ == '__main__':
    run()
