import traceback
from flask import Blueprint, request, jsonify
import bcrypt
from database import get_db
from utils.auth_utils import generar_jwt
from utils.email_utils import enviar_correo_verificacion, verificar_token_email

auth_bp = Blueprint('auth', __name__)


# ── Ping / diagnóstico rápido ─────────────────────────────────────────
@auth_bp.route('/ping', methods=['GET'])
def ping():
    try:
        db = get_db()
        with db.cursor() as cur:
            cur.execute('SELECT 1')
        db.close()
        return jsonify({'db': 'ok', 'status': 'ok'}), 200
    except Exception as e:
        return jsonify({'db': 'error', 'detail': str(e)}), 500


# ── Registro ──────────────────────────────────────────────────────────
@auth_bp.route('/registro', methods=['POST'])
def registro():
    d          = request.get_json(silent=True) or {}
    nombre     = (d.get('nombre') or '').strip()
    email      = (d.get('email') or '').strip().lower()
    contrasena = d.get('contrasena') or ''
    rol        = d.get('rol', 'Civil')
    telefono   = (d.get('telefono') or '').strip() or None

    if not nombre or not email or not contrasena:
        return jsonify({'error': 'Nombre, email y contraseña son requeridos'}), 400
    if len(contrasena) < 4:
        return jsonify({'error': 'La contraseña debe tener al menos 4 caracteres'}), 400
    if rol not in ('Civil', 'Voluntario', 'Especialista', 'Administrador'):
        rol = 'Civil'

    hashed = bcrypt.hashpw(contrasena.encode(), bcrypt.gensalt()).decode()

    # ── PASO 1: guardar en BD (bloque independiente) ───────────────────
    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute('SELECT id FROM usuario WHERE email = %s', (email,))
            if cur.fetchone():
                return jsonify({'error': 'Este correo ya está registrado'}), 409

            cur.execute(
                '''INSERT INTO usuario
                   (nombre, email, contrasena, rol, telefono, estado, email_verificado)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)''',
                (nombre, email, hashed, rol, telefono, 'Pendiente_Verificacion', 0),
            )
            db.commit()
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        return jsonify({'error': f'Error de base de datos: {str(e)}'}), 500
    finally:
        db.close()

    # ── PASO 2: enviar correo (fallo no cancela el registro) ───────────
    email_enviado = True
    try:
        enviar_correo_verificacion(email, nombre)
    except Exception as e:
        email_enviado = False
        traceback.print_exc()          # Muestra el error real en la consola Flask
        print(f'[WARN] Email no enviado a {email}: {e}')

    if email_enviado:
        msg = 'Registro exitoso. Revisa tu correo para activar tu cuenta.'
    else:
        # Usuario creado pero correo falló; el admin puede verificar manualmente
        msg = ('Registro exitoso, pero no se pudo enviar el correo de verificación. '
               'Contacta al administrador para activar tu cuenta.')

    return jsonify({'message': msg, 'email_enviado': email_enviado}), 201


# ── Login ─────────────────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    d          = request.get_json(silent=True) or {}
    email      = (d.get('email') or '').strip().lower()
    contrasena = d.get('contrasena') or ''

    if not email or not contrasena:
        return jsonify({'error': 'Email y contraseña requeridos'}), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                '''SELECT id, nombre, email, contrasena, rol, estado, email_verificado, foto_url
                   FROM usuario WHERE email = %s''',
                (email,),
            )
            user = cur.fetchone()

        if not user:
            return jsonify({'error': 'Credenciales incorrectas'}), 401
        if not bcrypt.checkpw(contrasena.encode(), user['contrasena'].encode()):
            return jsonify({'error': 'Credenciales incorrectas'}), 401
        if not user['email_verificado']:
            return jsonify({'error': 'Verifica tu correo electrónico antes de iniciar sesión'}), 403
        if user['estado'] != 'Activo':
            return jsonify({'error': f"Cuenta {user['estado'].replace('_', ' ').lower()}"}), 403

        with db.cursor() as cur:
            cur.execute('UPDATE usuario SET ultima_sesion = NOW() WHERE id = %s', (user['id'],))
            db.commit()

        token = generar_jwt(user['id'], user['rol'])
        return jsonify({
            'token': token,
            'usuario': {
                'id':       user['id'],
                'nombre':   user['nombre'],
                'email':    user['email'],
                'rol':      user['rol'],
                'foto_url': user['foto_url'],
            },
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


# ── Verificación de email ─────────────────────────────────────────────
@auth_bp.route('/verificar/<token>', methods=['GET'])
def verificar_email(token):
    email = verificar_token_email(token)
    if not email:
        return _pagina(
            '❌ Enlace inválido o expirado',
            'El enlace ya no es válido. Intenta registrarte de nuevo.',
            '#E74C3C',
        ), 400

    db = get_db()
    try:
        with db.cursor() as cur:
            cur.execute(
                "UPDATE usuario SET email_verificado = 1, estado = 'Activo' WHERE email = %s",
                (email,),
            )
            db.commit()
        return _pagina(
            '✅ ¡Cuenta verificada!',
            'Tu cuenta está activa. Ya puedes iniciar sesión en la app Guardian Zero.',
            '#1AA6A6',
        )
    except Exception as e:
        traceback.print_exc()
        return _pagina('❌ Error interno', str(e), '#E74C3C'), 500
    finally:
        db.close()


def _pagina(titulo, mensaje, color):
    return f'''<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Guardian Zero</title></head>
<body style="font-family:sans-serif;text-align:center;padding:80px 20px;background:#F5F7F8;">
  <h1 style="color:#0E3A44;font-size:20px;letter-spacing:1px;">GUARDIAN ZERO</h1>
  <h2 style="color:{color};margin-top:32px;">{titulo}</h2>
  <p style="color:#6B7C85;font-size:16px;max-width:400px;margin:16px auto;">{mensaje}</p>
</body></html>'''
