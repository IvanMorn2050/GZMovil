import requests
from itsdangerous import URLSafeTimedSerializer
from flask import current_app

BREVO_URL = 'https://api.brevo.com/v3/smtp/email'


def _s():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'])


def generar_token_email(email: str) -> str:
    return _s().dumps(email, salt='email-verificacion')


def verificar_token_email(token: str, max_age: int = 3600):
    try:
        return _s().loads(token, salt='email-verificacion', max_age=max_age)
    except Exception:
        return None


def enviar_correo_verificacion(email: str, nombre: str):
    token = generar_token_email(email)
    url   = f"{current_app.config['SERVER_URL']}/api/auth/verificar/{token}"
    html  = f"""
    <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:40px;background:#F5F7F8;border-radius:16px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#0E3A44;font-size:22px;letter-spacing:1px;">GUARDIAN ZERO</h1>
      </div>
      <h2 style="color:#0E3A44;">¡Hola, {nombre}!</h2>
      <p style="color:#6B7C85;line-height:1.7;">
        Gracias por registrarte en <strong>Guardian Zero</strong>.<br>
        Para activar tu cuenta y comenzar a reportar emergencias, haz clic en el botón:
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{url}"
           style="background:#1AA6A6;color:#fff;padding:15px 36px;border-radius:10px;
                  text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">
          Verificar mi cuenta
        </a>
      </div>
      <p style="color:#B0B8BC;font-size:12px;text-align:center;">
        Este enlace expira en 1 hora.<br>
        Si no creaste esta cuenta, ignora este mensaje.
      </p>
    </div>
    """
    payload = {
        'sender': {
            'name': current_app.config['MAIL_SENDER_NOMBRE'],
            'email': current_app.config['MAIL_USERNAME'],
        },
        'to': [{'email': email, 'name': nombre}],
        'subject': 'Activa tu cuenta — Guardian Zero',
        'htmlContent': html,
    }
    headers = {
        'api-key': current_app.config['BREVO_API_KEY'],
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    }
    resp = requests.post(BREVO_URL, json=payload, headers=headers, timeout=15)
    resp.raise_for_status()
