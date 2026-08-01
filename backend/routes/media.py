import os
import time
import traceback
from flask import Blueprint, request, jsonify
from utils.auth_utils import jwt_requerido

media_bp = Blueprint('media', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
ALLOWED_EXT   = {'jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'}


def _allowed(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXT


@media_bp.route('/upload', methods=['POST'])
@jwt_requerido
def upload():
    if 'archivo' not in request.files:
        return jsonify({'error': 'No se recibió ningún archivo'}), 400

    file = request.files['archivo']
    if not file or file.filename == '':
        return jsonify({'error': 'Archivo vacío'}), 400
    if not _allowed(file.filename):
        return jsonify({'error': 'Tipo de archivo no permitido (jpg/png/webp/mp4/mov)'}), 400

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    ext      = file.filename.rsplit('.', 1)[1].lower()
    filename = f"media_{request.user_id}_{int(time.time())}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    url = request.host_url.rstrip('/') + f'/uploads/{filename}'
    return jsonify({'url': url, 'filename': file.filename}), 200
