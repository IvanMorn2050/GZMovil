import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    DB_HOST     = os.getenv('DB_HOST', 'localhost')
    DB_USER     = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME     = os.getenv('DB_NAME', 'guardian_zero3')
    DB_PORT     = int(os.getenv('DB_PORT', 3306))

    SECRET_KEY       = os.getenv('SECRET_KEY', 'cambia_esto_en_produccion')
    JWT_EXPIRATION_H = 24

    BREVO_API_KEY  = os.getenv('BREVO_API_KEY')
    MAIL_USERNAME  = os.getenv('MAIL_USERNAME')
    MAIL_SENDER_NOMBRE = 'Guardian Zero'

    SERVER_URL = os.getenv('SERVER_URL', 'http://localhost:5000')
