import math
import traceback
from flask import Blueprint, request, jsonify
from database import get_db
from utils.auth_utils import jwt_requerido

voluntario_bp = Blueprint('voluntario', __name__)

ESTADOS_AVANCE = {
    'Pendiente':  'En_camino',
    'En_camino':  'Atendiendo',
    'Atendiendo': 'Finalizada',
}


def _haversine(lat1, lng1, lat2, lng2) -> float:
    R = 6371.0
    f1, f2 = math.radians(lat1), math.radians(lat2)
    df = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(df / 2) ** 2 + math.cos(f1) * math.cos(f2) * math.sin(dl / 2) ** 2
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def _es_voluntario(db, user_id) -> bool:
    with db.cursor() as cur:
        cur.execute("SELECT rol FROM usuario WHERE id=%s", (user_id,))
        row = cur.fetchone()
    return bool(row and row['rol'] in ('Voluntario', 'Especialista'))


def _abs_url(path):
    if not path or path.startswith('http'):
        return path
    return request.host_url.rstrip('/') + path


# ── PUT /api/voluntario/ubicacion ─────────────────────────────────────
@voluntario_bp.route('/ubicacion', methods=['PUT'])
@jwt_requerido
def actualizar_ubicacion():
    d   = request.get_json(silent=True) or {}
    lat = d.get('lat')
    lng = d.get('lng')
    if lat is None or lng is None:
        return jsonify({'error': 'Se requieren lat y lng'}), 400

    db = get_db()
    try:
        if not _es_voluntario(db, request.user_id):
            return jsonify({'error': 'Solo voluntarios pueden compartir ubicación'}), 403
        with db.cursor() as cur:
            cur.execute(
                'UPDATE usuario SET ubicacion_lat=%s, ubicacion_lng=%s,'
                ' ubicacion_actualizada=NOW() WHERE id=%s',
                (lat, lng, request.user_id),
            )
            db.commit()
        return jsonify({'message': 'Ubicación actualizada'}), 200
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── GET /api/voluntario/solicitudes ──────────────────────────────────
@voluntario_bp.route('/solicitudes', methods=['GET'])
@jwt_requerido
def solicitudes():
    db = get_db()
    try:
        if not _es_voluntario(db, request.user_id):
            return jsonify({'error': 'Acceso solo para voluntarios'}), 403

        with db.cursor() as cur:
            cur.execute(
                'SELECT ubicacion_lat, ubicacion_lng FROM usuario WHERE id=%s',
                (request.user_id,),
            )
            vol = cur.fetchone()
        vol_lat = float(vol['ubicacion_lat']) if vol and vol['ubicacion_lat'] else None
        vol_lng = float(vol['ubicacion_lng']) if vol and vol['ubicacion_lng'] else None

        with db.cursor() as cur:
            cur.execute('''
                SELECT r.id, r.titulo, r.descripcion, r.direccion_texto,
                       r.latitud, r.longitud, r.prioridad, r.creado_en,
                       td.nombre AS tipo_desastre,
                       COALESCE(td.emoji, '📍') AS emoji,
                       u.nombre  AS reportado_por,
                       (SELECT COUNT(*) FROM asignacion_voluntario av2
                        WHERE av2.id_reporte = r.id
                          AND av2.estado IN ('Pendiente','En_camino','Atendiendo')
                       ) AS voluntarios_asignados
                FROM reporte r
                LEFT JOIN tipo_desastre td ON td.id = r.id_tipo_desastre
                LEFT JOIN usuario       u  ON u.id  = r.id_usuario
                WHERE r.estatus IN ('Pendiente','En_Proceso')
                  AND r.id NOT IN (
                      SELECT av.id_reporte FROM asignacion_voluntario av
                      WHERE av.id_voluntario = %s AND av.estado != 'Rechazada'
                  )
                ORDER BY r.creado_en DESC
                LIMIT 30
            ''', (request.user_id,))
            rows = cur.fetchall()

        result = []
        for r in rows:
            if r.get('creado_en'):
                r['creado_en'] = r['creado_en'].isoformat()
            r_lat = float(r['latitud'])  if r.get('latitud')  else None
            r_lng = float(r['longitud']) if r.get('longitud') else None
            r['distancia_km'] = (
                _haversine(vol_lat, vol_lng, r_lat, r_lng)
                if vol_lat is not None and r_lat is not None
                else None
            )
            result.append(r)

        result.sort(key=lambda x: (x['distancia_km'] is None, x['distancia_km'] or 0))
        return jsonify({'solicitudes': result}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── POST /api/voluntario/solicitudes/:id/responder ────────────────────
@voluntario_bp.route('/solicitudes/<int:reporte_id>/responder', methods=['POST'])
@jwt_requerido
def responder_solicitud(reporte_id):
    d         = request.get_json(silent=True) or {}
    respuesta = (d.get('respuesta') or '').strip().lower()
    if respuesta not in ('aceptar', 'rechazar'):
        return jsonify({'error': 'respuesta debe ser "aceptar" o "rechazar"'}), 400

    estado = 'Pendiente' if respuesta == 'aceptar' else 'Rechazada'

    db = get_db()
    try:
        if not _es_voluntario(db, request.user_id):
            return jsonify({'error': 'Acceso solo para voluntarios'}), 403

        with db.cursor() as cur:
            cur.execute(
                "SELECT id FROM reporte WHERE id=%s AND estatus IN ('Pendiente','En_Proceso')",
                (reporte_id,),
            )
            if not cur.fetchone():
                return jsonify({'error': 'Reporte no encontrado o ya finalizado'}), 404

            cur.execute(
                'SELECT id, estado FROM asignacion_voluntario'
                ' WHERE id_reporte=%s AND id_voluntario=%s',
                (reporte_id, request.user_id),
            )
            existing = cur.fetchone()
            if existing:
                if existing['estado'] != 'Rechazada':
                    return jsonify({'error': 'Ya respondiste a esta solicitud'}), 409
                cur.execute(
                    'UPDATE asignacion_voluntario SET estado=%s WHERE id=%s',
                    (estado, existing['id']),
                )
            else:
                cur.execute(
                    'INSERT INTO asignacion_voluntario'
                    ' (id_reporte, id_voluntario, estado) VALUES (%s,%s,%s)',
                    (reporte_id, request.user_id, estado),
                )

            if estado == 'Pendiente':
                cur.execute(
                    "UPDATE reporte SET estatus='En_Proceso'"
                    " WHERE id=%s AND estatus='Pendiente'",
                    (reporte_id,),
                )
            db.commit()

        msg = '¡Asignado! Estás ayudando en esta emergencia.' if estado == 'Pendiente' else 'Solicitud rechazada.'
        return jsonify({'message': msg, 'estado': estado}), 200
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── GET /api/voluntario/asignaciones ─────────────────────────────────
@voluntario_bp.route('/asignaciones', methods=['GET'])
@jwt_requerido
def mis_asignaciones():
    db = get_db()
    try:
        if not _es_voluntario(db, request.user_id):
            return jsonify({'error': 'Acceso solo para voluntarios'}), 403

        with db.cursor() as cur:
            cur.execute('''
                SELECT av.id, av.estado, av.creado_en, av.actualizado_en,
                       r.id AS reporte_id, r.titulo, r.descripcion,
                       r.direccion_texto, r.prioridad,
                       r.latitud, r.longitud,
                       COALESCE(td.nombre, 'General') AS tipo_desastre,
                       COALESCE(td.emoji,  '📍')      AS emoji
                FROM asignacion_voluntario av
                JOIN reporte r ON r.id = av.id_reporte
                LEFT JOIN tipo_desastre td ON td.id = r.id_tipo_desastre
                WHERE av.id_voluntario = %s
                  AND av.estado != 'Rechazada'
                ORDER BY
                    FIELD(av.estado,'Pendiente','En_camino','Atendiendo','Finalizada'),
                    av.actualizado_en DESC
            ''', (request.user_id,))
            rows = cur.fetchall()

        for a in rows:
            for fld in ('creado_en', 'actualizado_en'):
                if a.get(fld):
                    a[fld] = a[fld].isoformat()
            if a.get('latitud'):  a['latitud']  = float(a['latitud'])
            if a.get('longitud'): a['longitud'] = float(a['longitud'])

        return jsonify({'asignaciones': rows}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── PUT /api/voluntario/asignaciones/:id/estado ───────────────────────
@voluntario_bp.route('/asignaciones/<int:asig_id>/estado', methods=['PUT'])
@jwt_requerido
def actualizar_estado(asig_id):
    d      = request.get_json(silent=True) or {}
    estado = (d.get('estado') or '').strip()
    if estado not in ('En_camino', 'Atendiendo', 'Finalizada'):
        return jsonify({'error': 'Estado inválido. Use: En_camino, Atendiendo, Finalizada'}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                'SELECT id, estado, id_reporte FROM asignacion_voluntario'
                ' WHERE id=%s AND id_voluntario=%s',
                (asig_id, request.user_id),
            )
            asig = cur.fetchone()
            if not asig:
                return jsonify({'error': 'Asignación no encontrada'}), 404
            if asig['estado'] == 'Finalizada':
                return jsonify({'error': 'Esta asignación ya está finalizada'}), 409

            cur.execute(
                'UPDATE asignacion_voluntario SET estado=%s WHERE id=%s',
                (estado, asig_id),
            )

            # If no more active volunteers on this report, close it
            if estado == 'Finalizada':
                cur.execute('''
                    SELECT COUNT(*) AS activos FROM asignacion_voluntario
                    WHERE id_reporte=%s AND estado IN ('Pendiente','En_camino','Atendiendo')
                ''', (asig['id_reporte'],))
                if cur.fetchone()['activos'] == 0:
                    cur.execute(
                        "UPDATE reporte SET estatus='Finalizado' WHERE id=%s",
                        (asig['id_reporte'],),
                    )
            db.commit()

        return jsonify({'message': f'Estado actualizado a {estado}', 'estado': estado}), 200
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── POST /api/voluntario/asignaciones/:id/evidencia ──────────────────
@voluntario_bp.route('/asignaciones/<int:asig_id>/evidencia', methods=['POST'])
@jwt_requerido
def agregar_evidencia(asig_id):
    d         = request.get_json(silent=True) or {}
    contenido = (d.get('contenido') or '').strip() or None
    foto_url  = (d.get('foto_url')  or '').strip() or None

    if not contenido and not foto_url:
        return jsonify({'error': 'Se requiere texto o foto'}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                'SELECT id FROM asignacion_voluntario WHERE id=%s AND id_voluntario=%s',
                (asig_id, request.user_id),
            )
            if not cur.fetchone():
                return jsonify({'error': 'Asignación no encontrada'}), 404

            cur.execute(
                'INSERT INTO evidencia_asignacion (id_asignacion, contenido, foto_url)'
                ' VALUES (%s,%s,%s)',
                (asig_id, contenido, foto_url),
            )
            db.commit()
            nuevo_id = cur.lastrowid

        return jsonify({'message': 'Evidencia registrada', 'id': nuevo_id}), 201
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── GET /api/voluntario/asignaciones/:id/evidencias ──────────────────
@voluntario_bp.route('/asignaciones/<int:asig_id>/evidencias', methods=['GET'])
@jwt_requerido
def listar_evidencias(asig_id):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                'SELECT id FROM asignacion_voluntario WHERE id=%s AND id_voluntario=%s',
                (asig_id, request.user_id),
            )
            if not cur.fetchone():
                return jsonify({'error': 'Asignación no encontrada'}), 404

            cur.execute(
                'SELECT id, contenido, foto_url, creado_en'
                ' FROM evidencia_asignacion WHERE id_asignacion=%s ORDER BY creado_en ASC',
                (asig_id,),
            )
            rows = cur.fetchall()

        for r in rows:
            if r.get('creado_en'):
                r['creado_en'] = r['creado_en'].isoformat()
            r['foto_url'] = _abs_url(r.get('foto_url'))

        return jsonify({'evidencias': rows}), 200
    finally:
        db.close()
