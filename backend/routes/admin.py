import traceback
from flask import Blueprint, request, jsonify
from database import get_db
from utils.auth_utils import jwt_requerido, admin_requerido

admin_bp = Blueprint('admin', __name__)


def _abs_url(path):
    if not path or path.startswith('http'):
        return path
    return request.host_url.rstrip('/') + path


# ── GET /api/admin/postulaciones ────────────────────────────────────────
@admin_bp.route('/postulaciones', methods=['GET'])
@jwt_requerido
@admin_requerido
def listar_postulaciones():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('''
                SELECT p.id, p.rol_solicitado, p.estado, p.motivo, p.creado_en,
                       u.id AS id_usuario, u.nombre, u.email, u.telefono, u.foto_url,
                       (SELECT COUNT(*) FROM certificacion c WHERE c.id_usuario = u.id)
                           AS total_certificaciones
                FROM postulacion p
                JOIN usuario u ON u.id = p.id_usuario
                WHERE p.estado = 'Pendiente'
                ORDER BY p.creado_en ASC
            ''')
            rows = cur.fetchall()
        for r in rows:
            if r.get('creado_en'):
                r['creado_en'] = r['creado_en'].isoformat()
            r['foto_url'] = _abs_url(r.get('foto_url'))
        return jsonify({'postulaciones': rows}), 200
    finally:
        db.close()


# ── GET /api/admin/postulaciones/:id/certificaciones ─────────────────────
@admin_bp.route('/postulaciones/<int:post_id>/certificaciones', methods=['GET'])
@jwt_requerido
@admin_requerido
def certificaciones_postulante(post_id):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('SELECT id_usuario FROM postulacion WHERE id=%s', (post_id,))
            post = cur.fetchone()
            if not post:
                return jsonify({'error': 'Postulación no encontrada'}), 404

            cur.execute(
                'SELECT id, nombre_archivo, archivo_url, creado_en FROM certificacion '
                'WHERE id_usuario=%s ORDER BY creado_en DESC',
                (post['id_usuario'],),
            )
            rows = cur.fetchall()
        for r in rows:
            if r.get('creado_en'):
                r['creado_en'] = r['creado_en'].isoformat()
            r['archivo_url'] = _abs_url(r.get('archivo_url'))
        return jsonify({'certificaciones': rows}), 200
    finally:
        db.close()


# ── POST /api/admin/postulaciones/:id/responder ───────────────────────────
@admin_bp.route('/postulaciones/<int:post_id>/responder', methods=['POST'])
@jwt_requerido
@admin_requerido
def responder_postulacion(post_id):
    d         = request.get_json(silent=True) or {}
    respuesta = (d.get('respuesta') or '').strip().lower()
    if respuesta not in ('aprobar', 'rechazar'):
        return jsonify({'error': 'respuesta debe ser "aprobar" o "rechazar"'}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                "SELECT id, id_usuario, rol_solicitado FROM postulacion "
                "WHERE id=%s AND estado='Pendiente'",
                (post_id,),
            )
            post = cur.fetchone()
            if not post:
                return jsonify({'error': 'Postulación no encontrada o ya procesada'}), 404

            if respuesta == 'aprobar':
                cur.execute("UPDATE postulacion SET estado='Aprobada' WHERE id=%s", (post_id,))
                cur.execute(
                    'UPDATE usuario SET rol=%s WHERE id=%s',
                    (post['rol_solicitado'], post['id_usuario']),
                )
                msg = f"Postulación aprobada. El usuario ahora es {post['rol_solicitado']}."
            else:
                cur.execute("UPDATE postulacion SET estado='Rechazada' WHERE id=%s", (post_id,))
                msg = 'Postulación rechazada.'
            db.commit()
        return jsonify({'message': msg}), 200
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
