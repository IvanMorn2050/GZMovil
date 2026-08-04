import math
import traceback
from flask import Blueprint, request, jsonify
from database import get_db
from utils.auth_utils import jwt_requerido

reportes_bp = Blueprint('reportes', __name__)


def _haversine(lat1, lng1, lat2, lng2):
    R = 6371.0
    f1, f2 = math.radians(lat1), math.radians(lat2)
    a = math.sin(math.radians(lat2 - lat1) / 2) ** 2 + \
        math.cos(f1) * math.cos(f2) * math.sin(math.radians(lng2 - lng1) / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@reportes_bp.route('', methods=['GET'])
@jwt_requerido
def listar():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('''
                SELECT r.id, r.titulo, r.descripcion, r.direccion_texto,
                       r.latitud, r.longitud, r.estatus, r.prioridad, r.creado_en,
                       td.nombre AS tipo_desastre, td.emoji,
                       u.nombre  AS usuario_nombre
                FROM reporte r
                LEFT JOIN tipo_desastre td ON td.id = r.id_tipo_desastre
                LEFT JOIN usuario       u  ON u.id  = r.id_usuario
                ORDER BY r.creado_en DESC
                LIMIT 50
            ''')
            rows = cur.fetchall()
        for r in rows:
            if r.get('creado_en'):
                r['creado_en'] = r['creado_en'].isoformat()
        return jsonify({'reportes': rows}), 200
    finally:
        db.close()


@reportes_bp.route('/estadisticas', methods=['GET'])
@jwt_requerido
def estadisticas():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('''
                SELECT
                  COUNT(*)                             AS total,
                  SUM(estatus = "Pendiente")           AS pendientes,
                  SUM(estatus = "En_Proceso")          AS en_proceso,
                  SUM(estatus = "Finalizado")          AS finalizados
                FROM reporte
            ''')
            stats = cur.fetchone()
        return jsonify(stats), 200
    finally:
        db.close()


@reportes_bp.route('/mis-reportes', methods=['GET'])
@jwt_requerido
def mis_reportes():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('''
                SELECT r.id, r.titulo, r.estatus, r.prioridad, r.creado_en,
                       td.nombre AS tipo_desastre, td.emoji
                FROM reporte r
                LEFT JOIN tipo_desastre td ON td.id = r.id_tipo_desastre
                WHERE r.id_usuario = %s
                ORDER BY r.creado_en DESC
            ''', (request.user_id,))
            rows = cur.fetchall()
        for r in rows:
            if r.get('creado_en'):
                r['creado_en'] = r['creado_en'].isoformat()
        return jsonify({'reportes': rows}), 200
    finally:
        db.close()


# ── GET /api/reportes/home ────────────────────────────────────────────
@reportes_bp.route('/home', methods=['GET'])
@jwt_requerido
def home_stats():
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)

    db = get_db()
    try:
        with db.cursor() as cur:
            # Totales generales
            cur.execute(
                "SELECT COUNT(*) AS total FROM reporte WHERE estatus IN ('Pendiente', 'En_Proceso')"
            )
            total_activos = cur.fetchone()['total']

            cur.execute('SELECT COUNT(*) AS total FROM reporte')
            total_reportes = cur.fetchone()['total']

            cur.execute(
                "SELECT COUNT(*) AS total FROM usuario "
                "WHERE rol IN ('Voluntario','Especialista') AND estado='Activo'"
            )
            voluntarios_activos = cur.fetchone()['total']

            # Albergues (tabla puede no tener datos)
            try:
                cur.execute('SELECT COUNT(*) AS total FROM albergue WHERE activo=1')
                albergues_activos = cur.fetchone()['total']
            except Exception:
                albergues_activos = 0

            # Reportes por tipo de desastre
            cur.execute('''
                SELECT td.nombre, td.emoji, COUNT(r.id) AS total
                FROM tipo_desastre td
                LEFT JOIN reporte r ON r.id_tipo_desastre = td.id
                GROUP BY td.id, td.nombre, td.emoji
                ORDER BY total DESC
                LIMIT 6
            ''')
            tipos = cur.fetchall()
            max_t = max((t['total'] for t in tipos), default=1) or 1
            for t in tipos:
                t['pct'] = round(t['total'] / max_t * 100)

            # Últimas alertas: reportes recientes cercanos al usuario
            # (se usa reporte.latitud/longitud en vez de la tabla alerta,
            # que no siempre tiene datos poblados).
            cur.execute('''
                SELECT r.titulo, r.prioridad, r.creado_en, r.direccion_texto,
                       r.latitud, r.longitud
                FROM reporte r
                WHERE r.estatus IN ('Pendiente','En_Proceso')
                ORDER BY r.creado_en DESC
                LIMIT 30
            ''')
            candidatos = cur.fetchall()
            for c in candidatos:
                if c.get('creado_en'):
                    c['creado_en'] = c['creado_en'].isoformat()
                if lat is not None and lng is not None and c.get('latitud') and c.get('longitud'):
                    c['distancia_km'] = round(
                        _haversine(lat, lng, float(c['latitud']), float(c['longitud'])), 1,
                    )
                else:
                    c['distancia_km'] = None
                del c['latitud']
                del c['longitud']

            if lat is not None and lng is not None:
                candidatos.sort(key=lambda x: (x['distancia_km'] is None, x['distancia_km'] or 0))
            alertas = candidatos[:5]

            # Marcadores para el mapa (sólo reportes con coordenadas)
            cur.execute('''
                SELECT r.latitud, r.longitud,
                       COALESCE(td.emoji, '📍') AS emoji,
                       COALESCE(td.nombre, 'General') AS tipo_desastre,
                       r.estatus
                FROM reporte r
                LEFT JOIN tipo_desastre td ON td.id = r.id_tipo_desastre
                WHERE r.latitud IS NOT NULL AND r.longitud IS NOT NULL
                LIMIT 20
            ''')
            marcadores = cur.fetchall()
            for m in marcadores:
                if m.get('latitud'):  m['latitud']  = float(m['latitud'])
                if m.get('longitud'): m['longitud'] = float(m['longitud'])

        return jsonify({
            'total_activos':      total_activos,
            'total_reportes':     total_reportes,
            'voluntarios_activos': voluntarios_activos,
            'albergues_activos':  albergues_activos,
            'reportes_por_tipo':  tipos,
            'alertas_recientes':  alertas,
            'marcadores':         marcadores,
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── GET /api/reportes/cercanos ────────────────────────────────────────
@reportes_bp.route('/cercanos', methods=['GET'])
@jwt_requerido
def cercanos():
    lat   = request.args.get('lat',   type=float)
    lng   = request.args.get('lng',   type=float)
    radio = request.args.get('radio', 10.0, type=float)
    desde = request.args.get('desde')          # ISO datetime string

    if lat is None or lng is None:
        return jsonify({'error': 'Se requieren lat y lng'}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            if desde:
                cur.execute('''
                    SELECT r.id, r.titulo, r.descripcion, r.latitud, r.longitud,
                           r.prioridad, r.creado_en,
                           COALESCE(td.nombre, 'General') AS tipo_desastre,
                           COALESCE(td.emoji,  '📍')      AS emoji
                    FROM reporte r
                    LEFT JOIN tipo_desastre td ON td.id = r.id_tipo_desastre
                    WHERE r.creado_en > %s
                      AND r.latitud  IS NOT NULL
                      AND r.longitud IS NOT NULL
                      AND r.estatus IN ('Pendiente','En_Proceso')
                    ORDER BY r.creado_en DESC
                    LIMIT 50
                ''', (desde,))
            else:
                cur.execute('''
                    SELECT r.id, r.titulo, r.descripcion, r.latitud, r.longitud,
                           r.prioridad, r.creado_en,
                           COALESCE(td.nombre, 'General') AS tipo_desastre,
                           COALESCE(td.emoji,  '📍')      AS emoji
                    FROM reporte r
                    LEFT JOIN tipo_desastre td ON td.id = r.id_tipo_desastre
                    WHERE r.latitud  IS NOT NULL
                      AND r.longitud IS NOT NULL
                      AND r.estatus IN ('Pendiente','En_Proceso')
                    ORDER BY r.creado_en DESC
                    LIMIT 50
                ''')
            rows = cur.fetchall()

        result = []
        for r in rows:
            r_lat = float(r['latitud'])
            r_lng = float(r['longitud'])
            dist  = _haversine(lat, lng, r_lat, r_lng)
            if dist <= radio:
                if r.get('creado_en'):
                    r['creado_en'] = r['creado_en'].isoformat()
                r['latitud']      = r_lat
                r['longitud']     = r_lng
                r['distancia_km'] = round(dist, 2)
                result.append(r)

        result.sort(key=lambda x: x['distancia_km'])
        return jsonify({'reportes': result}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@reportes_bp.route('', methods=['POST'])
@jwt_requerido
def crear():
    d               = request.get_json(silent=True) or {}
    titulo          = (d.get('titulo') or '').strip()
    descripcion     = (d.get('descripcion') or '').strip()
    id_tipo         = d.get('id_tipo_desastre')
    latitud         = d.get('latitud')
    longitud        = d.get('longitud')
    direccion_texto = (d.get('direccion_texto') or '').strip() or None
    prioridad       = d.get('prioridad', 'Media')

    if not titulo:
        return jsonify({'error': 'El título es requerido'}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('''
                INSERT INTO reporte
                  (titulo, descripcion, id_tipo_desastre, id_usuario,
                   latitud, longitud, direccion_texto, prioridad)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ''', (titulo, descripcion, id_tipo, request.user_id,
                  latitud, longitud, direccion_texto, prioridad))
            db.commit()
            nuevo_id = cur.lastrowid
        return jsonify({'message': 'Reporte creado exitosamente', 'id': nuevo_id}), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
