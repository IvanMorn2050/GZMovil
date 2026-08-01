from flask import Blueprint, jsonify
from database import get_db

alertas_bp = Blueprint('alertas', __name__)


@alertas_bp.route('', methods=['GET'])
def listar():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('''
                SELECT a.id, a.titulo, a.mensaje, a.nivel, a.creado_en,
                       z.nombre AS zona
                FROM alerta a
                LEFT JOIN zona_afectada z ON z.id = a.id_zona_afectada
                WHERE a.activa = 1
                  AND (a.expira_en IS NULL OR a.expira_en > NOW())
                ORDER BY
                  FIELD(a.nivel, "Evacuacion", "Precaucion", "Informativa"),
                  a.creado_en DESC
            ''')
            rows = cur.fetchall()
        for a in rows:
            if a.get('creado_en'):
                a['creado_en'] = a['creado_en'].isoformat()
        return jsonify({'alertas': rows}), 200
    finally:
        db.close()
