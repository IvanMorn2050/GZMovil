import traceback
import os
import time
from flask import Blueprint, request, jsonify
from database import get_db
from utils.auth_utils import jwt_requerido
from utils.email_utils import enviar_correo_verificacion

perfil_bp = Blueprint('perfil', __name__)

UPLOAD_FOLDER     = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
ALLOWED_EXT_FOTO  = {'jpg', 'jpeg', 'png', 'webp'}
ALLOWED_EXT_CERT  = {'pdf'}


def _allowed(filename: str, allowed_ext: set) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_ext


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
    email    = (d.get('email') or '').strip().lower() or None

    if not nombre:
        return jsonify({'error': 'El nombre es requerido'}), 400
    if not email:
        return jsonify({'error': 'El email es requerido'}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('SELECT email, nombre FROM usuario WHERE id=%s', (request.user_id,))
            actual = cur.fetchone()
            if not actual:
                return jsonify({'error': 'Usuario no encontrado'}), 404

            email_cambio = email != actual['email']
            if email_cambio:
                cur.execute('SELECT id FROM usuario WHERE email=%s AND id!=%s', (email, request.user_id))
                if cur.fetchone():
                    return jsonify({'error': 'Ese correo ya está en uso por otra cuenta'}), 409

            if email_cambio:
                cur.execute(
                    '''UPDATE usuario
                       SET nombre=%s, telefono=%s, email=%s,
                           email_verificado=0, estado='Pendiente_Verificacion'
                       WHERE id=%s''',
                    (nombre, telefono, email, request.user_id),
                )
            else:
                cur.execute(
                    'UPDATE usuario SET nombre=%s, telefono=%s WHERE id=%s',
                    (nombre, telefono, request.user_id),
                )
            db.commit()
        if email_cambio:
            try:
                enviar_correo_verificacion(email, nombre)
            except Exception:
                traceback.print_exc()
            return jsonify({
                'message': 'Perfil actualizado. Te enviamos un correo para verificar tu nuevo email; '
                           'deberás verificarlo antes de volver a iniciar sesión.',
                'requiere_verificacion': True,
            }), 200
        return jsonify({'message': 'Perfil actualizado correctamente', 'requiere_verificacion': False}), 200
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
    if not _allowed(file.filename, ALLOWED_EXT_FOTO):
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


# ── GET /api/perfil/certificaciones ─────────────────────────────────────
@perfil_bp.route('/certificaciones', methods=['GET'])
@jwt_requerido
def listar_certificaciones():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                'SELECT id, nombre_archivo, archivo_url, creado_en FROM certificacion '
                'WHERE id_usuario=%s ORDER BY creado_en DESC',
                (request.user_id,),
            )
            rows = cur.fetchall()
        for r in rows:
            if r.get('creado_en'):
                r['creado_en'] = r['creado_en'].isoformat()
            if r.get('archivo_url') and not r['archivo_url'].startswith('http'):
                r['archivo_url'] = request.host_url.rstrip('/') + r['archivo_url']
        return jsonify({'certificaciones': rows}), 200
    finally:
        db.close()


# ── POST /api/perfil/certificaciones ────────────────────────────────────
@perfil_bp.route('/certificaciones', methods=['POST'])
@jwt_requerido
def subir_certificacion():
    if 'archivo' not in request.files:
        return jsonify({'error': 'No se recibió ningún archivo'}), 400

    file = request.files['archivo']
    if not file or file.filename == '':
        return jsonify({'error': 'Archivo vacío'}), 400
    if not _allowed(file.filename, ALLOWED_EXT_CERT):
        return jsonify({'error': 'Solo se permiten archivos PDF'}), 400

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    filename = f"cert_{request.user_id}_{int(time.time())}.pdf"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    archivo_rel = f'/uploads/{filename}'
    archivo_abs = request.host_url.rstrip('/') + archivo_rel
    nombre_original = file.filename

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                'INSERT INTO certificacion (id_usuario, nombre_archivo, archivo_url) VALUES (%s,%s,%s)',
                (request.user_id, nombre_original, archivo_rel),
            )
            db.commit()
            nuevo_id = cur.lastrowid
        return jsonify({
            'id': nuevo_id,
            'nombre_archivo': nombre_original,
            'archivo_url': archivo_abs,
        }), 201
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── DELETE /api/perfil/certificaciones/:id ──────────────────────────────
@perfil_bp.route('/certificaciones/<int:cert_id>', methods=['DELETE'])
@jwt_requerido
def eliminar_certificacion(cert_id):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                'SELECT id FROM certificacion WHERE id=%s AND id_usuario=%s',
                (cert_id, request.user_id),
            )
            if not cur.fetchone():
                return jsonify({'error': 'Certificación no encontrada'}), 404

            cur.execute('DELETE FROM certificacion WHERE id=%s', (cert_id,))
            db.commit()
        return jsonify({'message': 'Certificación eliminada'}), 200
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
