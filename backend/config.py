import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DB_HOST     = os.getenv('DB_HOST', 'localhost')
    DB_USER     = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME     = os.getenv('DB_NAME', 'guardian_zero3')
    DB_PORT     = int(os.getenv('DB_PORT', 3306))

    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        raise RuntimeError(
            'SECRET_KEY no está configurada. Define la variable de entorno '
            'SECRET_KEY antes de iniciar la aplicación (nunca uses un valor '
            'por defecto: se usa para firmar los tokens de sesión).'
        )
    JWT_EXPIRATION_H = 24

    BREVO_API_KEY  = os.getenv('BREVO_API_KEY')
    MAIL_USERNAME  = os.getenv('MAIL_USERNAME')
    MAIL_SENDER_NOMBRE = 'Guardian Zero'

    SERVER_URL = os.getenv('SERVER_URL', 'http://localhost:5000')
