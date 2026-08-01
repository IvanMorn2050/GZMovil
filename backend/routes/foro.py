import traceback
from flask import Blueprint, request, jsonify
from database import get_db
from utils.auth_utils import jwt_requerido

foro_bp = Blueprint('foro', __name__)

CATEGORIAS_VALIDAS = {'Aviso', 'Protocolo', 'Reporte', 'Guia', 'General', 'Pregunta', 'Noticia'}


def _abs_url(req, path):
    """Convierte ruta relativa /uploads/... a URL absoluta."""
    if not path:
        return None
    if path.startswith('http'):
        return path
    return req.host_url.rstrip('/') + path


# ── GET /api/foro ─────────────────────────────────────────────────────
@foro_bp.route('', methods=['GET'])
def publicaciones():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('''
                SELECT p.id, p.titulo, p.contenido, p.categoria, p.creado_en,
                       p.id_autor_usuario, p.foto_url,
                       u.nombre AS autor_nombre,
                       u.foto_url AS autor_foto,
                       (SELECT COUNT(*) FROM comentario_foro c
                        WHERE c.id_publicacion_foro = p.id) AS total_comentarios
                FROM publicacion_foro p
                LEFT JOIN usuario u ON u.id = p.id_autor_usuario
                WHERE p.activa = 1
                ORDER BY p.creado_en DESC
                LIMIT 30
            ''')
            rows = cur.fetchall()
        for p in rows:
            if p.get('creado_en'):
                p['creado_en'] = p['creado_en'].isoformat()
            p['foto_url']   = _abs_url(request, p.get('foto_url'))
            p['autor_foto'] = _abs_url(request, p.get('autor_foto'))
        return jsonify({'publicaciones': rows}), 200
    finally:
        db.close()


# ── POST /api/foro ────────────────────────────────────────────────────
@foro_bp.route('', methods=['POST'])
@jwt_requerido
def crear():
    d         = request.get_json(silent=True) or {}
    titulo    = (d.get('titulo') or '').strip()
    contenido = (d.get('contenido') or '').strip()
    categoria = (d.get('categoria') or 'General').strip()
    foto_url  = (d.get('foto_url') or '').strip() or None

    if not titulo:
        return jsonify({'error': 'El título es requerido'}), 400
    if not contenido:
        return jsonify({'error': 'El contenido es requerido'}), 400
    if categoria not in CATEGORIAS_VALIDAS:
        categoria = 'General'

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                'INSERT INTO publicacion_foro (titulo, contenido, categoria, id_autor_usuario, foto_url, activa) '
                'VALUES (%s, %s, %s, %s, %s, 1)',
                (titulo, contenido, categoria, request.user_id, foto_url),
            )
            db.commit()
            nuevo_id = cur.lastrowid
        return jsonify({'message': 'Publicación creada', 'id': nuevo_id}), 201
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── GET /api/foro/:id ─────────────────────────────────────────────────
@foro_bp.route('/<int:pub_id>', methods=['GET'])
@jwt_requerido
def detalle(pub_id):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('''
                SELECT p.id, p.titulo, p.contenido, p.categoria, p.creado_en,
                       p.id_autor_usuario, p.foto_url,
                       u.nombre AS autor_nombre,
                       u.foto_url AS autor_foto
                FROM publicacion_foro p
                LEFT JOIN usuario u ON u.id = p.id_autor_usuario
                WHERE p.id = %s AND p.activa = 1
            ''', (pub_id,))
            pub = cur.fetchone()
            if not pub:
                return jsonify({'error': 'Publicación no encontrada'}), 404
            if pub.get('creado_en'):
                pub['creado_en'] = pub['creado_en'].isoformat()
            pub['foto_url']   = _abs_url(request, pub.get('foto_url'))
            pub['autor_foto'] = _abs_url(request, pub.get('autor_foto'))

            cur.execute('''
                SELECT c.id, c.contenido, c.creado_en, c.foto_url,
                       u.nombre   AS autor_nombre,
                       u.foto_url AS autor_foto
                FROM comentario_foro c
                LEFT JOIN usuario u ON u.id = c.id_usuario
                WHERE c.id_publicacion_foro = %s
                ORDER BY c.creado_en ASC
            ''', (pub_id,))
            comentarios = cur.fetchall()
            for c in comentarios:
                if c.get('creado_en'):
                    c['creado_en'] = c['creado_en'].isoformat()
                c['foto_url']   = _abs_url(request, c.get('foto_url'))
                c['autor_foto'] = _abs_url(request, c.get('autor_foto'))

        return jsonify({'publicacion': pub, 'comentarios': comentarios}), 200
    finally:
        db.close()


# ── PUT /api/foro/:id ─────────────────────────────────────────────────
@foro_bp.route('/<int:pub_id>', methods=['PUT'])
@jwt_requerido
def editar(pub_id):
    d         = request.get_json(silent=True) or {}
    titulo    = (d.get('titulo') or '').strip()
    contenido = (d.get('contenido') or '').strip()
    categoria = (d.get('categoria') or '').strip()
    foto_url  = (d.get('foto_url') or '').strip() or None

    if not titulo:
        return jsonify({'error': 'El título es requerido'}), 400
    if not contenido:
        return jsonify({'error': 'El contenido es requerido'}), 400
    if categoria not in CATEGORIAS_VALIDAS:
        categoria = 'General'

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                'SELECT id FROM publicacion_foro WHERE id=%s AND id_autor_usuario=%s AND activa=1',
                (pub_id, request.user_id),
            )
            if not cur.fetchone():
                return jsonify({'error': 'No tienes permiso para editar esta publicación'}), 403

            cur.execute(
                'UPDATE publicacion_foro SET titulo=%s, contenido=%s, categoria=%s, foto_url=%s WHERE id=%s',
                (titulo, contenido, categoria, foto_url, pub_id),
            )
            db.commit()
        return jsonify({'message': 'Publicación actualizada'}), 200
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── DELETE /api/foro/:id ──────────────────────────────────────────────
@foro_bp.route('/<int:pub_id>', methods=['DELETE'])
@jwt_requerido
def eliminar(pub_id):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                'SELECT id FROM publicacion_foro WHERE id=%s AND id_autor_usuario=%s AND activa=1',
                (pub_id, request.user_id),
            )
            if not cur.fetchone():
                return jsonify({'error': 'No tienes permiso para eliminar esta publicación'}), 403

            cur.execute('UPDATE publicacion_foro SET activa=0 WHERE id=%s', (pub_id,))
            db.commit()
        return jsonify({'message': 'Publicación eliminada'}), 200
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── POST /api/foro/:id/comentarios ────────────────────────────────────
@foro_bp.route('/<int:pub_id>/comentarios', methods=['POST'])
@jwt_requerido
def agregar_comentario(pub_id):
    d         = request.get_json(silent=True) or {}
    contenido = (d.get('contenido') or '').strip()
    foto_url  = (d.get('foto_url') or '').strip() or None

    if not contenido and not foto_url:
        return jsonify({'error': 'El comentario no puede estar vacío'}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('SELECT id FROM publicacion_foro WHERE id=%s AND activa=1', (pub_id,))
            if not cur.fetchone():
                return jsonify({'error': 'Publicación no encontrada'}), 404

            cur.execute(
                'INSERT INTO comentario_foro (id_publicacion_foro, id_usuario, contenido, foto_url) '
                'VALUES (%s, %s, %s, %s)',
                (pub_id, request.user_id, contenido or '', foto_url),
            )
            db.commit()
            nuevo_id = cur.lastrowid

            cur.execute(
                '''SELECT c.id, c.contenido, c.creado_en, c.foto_url,
                          u.nombre   AS autor_nombre,
                          u.foto_url AS autor_foto
                   FROM comentario_foro c
                   LEFT JOIN usuario u ON u.id = c.id_usuario
                   WHERE c.id = %s''',
                (nuevo_id,),
            )
            nuevo = cur.fetchone()
            if nuevo:
                if nuevo.get('creado_en'):
                    nuevo['creado_en'] = nuevo['creado_en'].isoformat()
                nuevo['foto_url']   = _abs_url(request, nuevo.get('foto_url'))
                nuevo['autor_foto'] = _abs_url(request, nuevo.get('autor_foto'))

        return jsonify({'message': 'Comentario agregado', 'comentario': nuevo}), 201
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
