import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, current_app


def generar_jwt(user_id: int, rol: str) -> str:
    payload = {
        'user_id': user_id,
        'rol':     rol,
        'exp': datetime.now(timezone.utc) + timedelta(hours=current_app.config['JWT_EXPIRATION_H']),
        'iat': datetime.now(timezone.utc),
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def jwt_requerido(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer '):
            return jsonify({'error': 'Token requerido'}), 401
        token = auth.split(' ', 1)[1]
        try:
            data = jwt.decode(
                token, current_app.config['SECRET_KEY'], algorithms=['HS256']
            )
            request.user_id  = data['user_id']
            request.user_rol = data['rol']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Sesión expirada, inicia sesión de nuevo'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token inválido'}), 401
        return f(*args, **kwargs)
    return decorated
