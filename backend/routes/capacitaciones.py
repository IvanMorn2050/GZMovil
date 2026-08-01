from flask import Blueprint, request, jsonify
from database import get_db
from utils.auth_utils import jwt_requerido

capacitaciones_bp = Blueprint('capacitaciones', __name__)


@capacitaciones_bp.route('', methods=['GET'])
def listar():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('''
                SELECT c.id, c.titulo, c.descripcion, c.nivel, c.duracion_horas,
                       c.imagen_url, c.modalidad, c.estatus, c.cupo_maximo,
                       o.nombre AS organizacion
                FROM capacitacion c
                LEFT JOIN organizacion o ON o.id = c.id_organizacion
                WHERE c.estatus IN ("Activa", "Proxima")
                ORDER BY c.estatus DESC, c.creado_en DESC
            ''')
            rows = cur.fetchall()
        return jsonify({'capacitaciones': rows}), 200
    finally:
        db.close()


@capacitaciones_bp.route('/proximas', methods=['GET'])
def proximas():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('''
                SELECT s.id, s.fecha_inicio, s.fecha_fin, s.lugar,
                       s.cupo_disponible, c.titulo, c.nivel,
                       u.nombre AS instructor
                FROM sesion_capacitacion s
                JOIN capacitacion c ON c.id = s.id_capacitacion
                LEFT JOIN usuario u ON u.id = s.id_instructor
                WHERE s.fecha_inicio >= NOW()
                ORDER BY s.fecha_inicio ASC
                LIMIT 10
            ''')
            rows = cur.fetchall()
        for r in rows:
            if r.get('fecha_inicio'): r['fecha_inicio'] = r['fecha_inicio'].isoformat()
            if r.get('fecha_fin'):    r['fecha_fin']    = r['fecha_fin'].isoformat()
        return jsonify({'sesiones': rows}), 200
    finally:
        db.close()


@capacitaciones_bp.route('/organizaciones', methods=['GET'])
def organizaciones():
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                'SELECT id, nombre, descripcion, logo_url, tipo FROM organizacion WHERE activa = 1'
            )
            rows = cur.fetchall()
        return jsonify({'organizaciones': rows}), 200
    finally:
        db.close()


@capacitaciones_bp.route('/<int:cap_id>/inscribir', methods=['POST'])
@jwt_requerido
def inscribir(cap_id):
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('SELECT id FROM capacitacion WHERE id = %s', (cap_id,))
            if not cur.fetchone():
                return jsonify({'error': 'Capacitación no encontrada'}), 404

            cur.execute(
                'SELECT id FROM inscripcion_capacitacion WHERE id_usuario=%s AND id_capacitacion=%s',
                (request.user_id, cap_id),
            )
            if cur.fetchone():
                return jsonify({'error': 'Ya estás inscrito en esta capacitación'}), 409

            cur.execute(
                'INSERT INTO inscripcion_capacitacion (id_usuario, id_capacitacion) VALUES (%s, %s)',
                (request.user_id, cap_id),
            )
            db.commit()
        return jsonify({'message': 'Inscripción exitosa'}), 201
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
