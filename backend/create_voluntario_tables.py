"""
Run once to create the volunteer assignment tables and add location columns to usuario.
  cd backend && python create_voluntario_tables.py
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
            # Location columns on usuario
            for col, defn in [
                ('ubicacion_lat',          'DECIMAL(10,8) NULL'),
                ('ubicacion_lng',          'DECIMAL(11,8) NULL'),
                ('ubicacion_actualizada',  'DATETIME NULL'),
            ]:
                try:
                    cur.execute(f'ALTER TABLE usuario ADD COLUMN {col} {defn}')
                    print(f'  + usuario.{col}')
                except Exception as e:
                    print(f'  ~ usuario.{col} ya existe ({e})')

            # Volunteer assignment table
            cur.execute('''
                CREATE TABLE IF NOT EXISTS asignacion_voluntario (
                    id               INT AUTO_INCREMENT PRIMARY KEY,
                    id_reporte       INT NOT NULL,
                    id_voluntario    INT NOT NULL,
                    estado           ENUM('Pendiente','En_camino','Atendiendo','Finalizada','Rechazada')
                                     NOT NULL DEFAULT 'Pendiente',
                    creado_en        DATETIME DEFAULT CURRENT_TIMESTAMP,
                    actualizado_en   DATETIME DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,
                    INDEX idx_reporte    (id_reporte),
                    INDEX idx_voluntario (id_voluntario),
                    FOREIGN KEY (id_reporte)    REFERENCES reporte(id)  ON DELETE CASCADE,
                    FOREIGN KEY (id_voluntario) REFERENCES usuario(id)  ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ''')
            print('  + asignacion_voluntario OK')

            # Evidence table
            cur.execute('''
                CREATE TABLE IF NOT EXISTS evidencia_asignacion (
                    id             INT AUTO_INCREMENT PRIMARY KEY,
                    id_asignacion  INT NOT NULL,
                    contenido      TEXT,
                    foto_url       VARCHAR(255) NULL,
                    creado_en      DATETIME DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_asig (id_asignacion),
                    FOREIGN KEY (id_asignacion) REFERENCES asignacion_voluntario(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            ''')
            print('  + evidencia_asignacion OK')

            db.commit()
            print('\nListo. Tablas creadas correctamente.')
    except Exception as e:
        db.rollback()
        print(f'ERROR: {e}')
        sys.exit(1)
    finally:
        db.close()


if __name__ == '__main__':
    run()
