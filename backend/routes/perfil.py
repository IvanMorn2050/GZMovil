import traceback
import os
import time
from flask import Blueprint, request, jsonify
from database import get_db
from utils.auth_utils import jwt_requerido

perfil_bp = Blueprint('perfil', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
ALLOWED_EXT   = {'jpg', 'jpeg', 'png', 'webp'}


def _allowed(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT


# ── GET /api/perfil ───────────────────────────────────────────────────
@perfil_bp.route('', methods=['GET'])
@jwt_requerido
def get_perfil():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                'SELECT id, nombre, email, rol, telefono, foto_url, estado, creado_en '
                'FROM usuario WHERE id = %s',
                (request.user_id,),
            )
            user = cur.fetchone()
            if not user:
                return jsonify({'error': 'Usuario no encontrado'}), 404

            if user.get('creado_en'):
                user['creado_en'] = user['creado_en'].isoformat()

            # Si foto_url es ruta relativa, convertirla a URL absoluta
            if user.get('foto_url') and not user['foto_url'].startswith('http'):
                user['foto_url'] = request.host_url.rstrip('/') + user['foto_url']

            cur.execute('SELECT COUNT(*) AS total FROM reporte WHERE id_usuario = %s', (request.user_id,))
            user['total_reportes'] = cur.fetchone()['total']

            cur.execute(
                "SELECT COUNT(*) AS n FROM reporte WHERE id_usuario=%s AND estatus='Finalizado'",
                (request.user_id,),
            )
            user['reportes_resueltos'] = cur.fetchone()['n']

            cur.execute(
                'SELECT COUNT(*) AS n FROM inscripcion_capacitacion WHERE id_usuario=%s AND completado=1',
                (request.user_id,),
            )
            user['capacitaciones_completadas'] = cur.fetchone()['n']

            # Postulación más reciente
            cur.execute(
                'SELECT id, rol_solicitado, estado, motivo, creado_en '
                'FROM postulacion WHERE id_usuario=%s ORDER BY creado_en DESC LIMIT 1',
                (request.user_id,),
            )
            postulacion = cur.fetchone()
            if postulacion and postulacion.get('creado_en'):
                postulacion['creado_en'] = postulacion['creado_en'].isoformat()
            user['postulacion'] = postulacion

        return jsonify(user), 200
    finally:
        db.close()


# ── PUT /api/perfil ───────────────────────────────────────────────────
@perfil_bp.route('', methods=['PUT'])
@jwt_requerido
def update_perfil():
    d        = request.get_json(silent=True) or {}
    nombre   = (d.get('nombre') or '').strip()
    telefono = (d.get('telefono') or '').strip() or None

    if not nombre:
        return jsonify({'error': 'El nombre es requerido'}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                'UPDATE usuario SET nombre=%s, telefono=%s WHERE id=%s',
                (nombre, telefono, request.user_id),
            )
            db.commit()
        return jsonify({'message': 'Perfil actualizado correctamente'}), 200
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── POST /api/perfil/foto ─────────────────────────────────────────────
@perfil_bp.route('/foto', methods=['POST'])
@jwt_requerido
def subir_foto():
    if 'foto' not in request.files:
        return jsonify({'error': 'No se recibió ningún archivo'}), 400

    file = request.files['foto']
    if not file or file.filename == '':
        return jsonify({'error': 'Archivo vacío'}), 400
    if not _allowed(file.filename):
        return jsonify({'error': 'Tipo de archivo no permitido (jpg/png/webp)'}), 400

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    ext      = file.filename.rsplit('.', 1)[1].lower()
    filename = f"user_{request.user_id}_{int(time.time())}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    foto_rel = f'/uploads/{filename}'
    foto_abs = request.host_url.rstrip('/') + foto_rel

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('UPDATE usuario SET foto_url=%s WHERE id=%s', (foto_rel, request.user_id))
            db.commit()
        return jsonify({'foto_url': foto_abs}), 200
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── POST /api/perfil/postulacion ──────────────────────────────────────
@perfil_bp.route('/postulacion', methods=['POST'])
@jwt_requerido
def postulacion():
    d              = request.get_json(silent=True) or {}
    rol_solicitado = d.get('rol_solicitado', '')
    motivo         = (d.get('motivo') or '').strip()

    if rol_solicitado not in ('Voluntario', 'Especialista'):
        return jsonify({'error': 'Rol solicitado inválido'}), 400
    if not motivo:
        return jsonify({'error': 'El motivo es requerido'}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                "SELECT id FROM postulacion WHERE id_usuario=%s AND estado='Pendiente'",
                (request.user_id,),
            )
            if cur.fetchone():
                return jsonify({'error': 'Ya tienes una postulación pendiente'}), 409

            cur.execute(
                'INSERT INTO postulacion (id_usuario, rol_solicitado, motivo) VALUES (%s,%s,%s)',
                (request.user_id, rol_solicitado, motivo),
            )
            db.commit()
        return jsonify({'message': 'Postulación enviada correctamente'}), 201
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
