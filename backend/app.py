import os
from flask import Flask, jsonify, send_from_directory
from prometheus_flask_exporter import PrometheusMetrics
from config import Config
from extensions import cors, limiter
from routes.auth import auth_bp
from routes.reportes import reportes_bp
from routes.capacitaciones import capacitaciones_bp
from routes.foro import foro_bp
from routes.perfil import perfil_bp
from routes.alertas import alertas_bp
from routes.media import media_bp
from routes.voluntario import voluntario_bp
from routes.admin import admin_bp

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    cors.init_app(app, resources={r'/api/*': {'origins': '*'}})
    limiter.init_app(app)

    # Expone /metrics en formato Prometheus (requests por endpoint, latencia,
    # codigos de estado, mas metricas de proceso como CPU/memoria).
    PrometheusMetrics(app)

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    app.register_blueprint(auth_bp,           url_prefix='/api/auth')
    app.register_blueprint(reportes_bp,       url_prefix='/api/reportes')
    app.register_blueprint(capacitaciones_bp, url_prefix='/api/capacitaciones')
    app.register_blueprint(foro_bp,           url_prefix='/api/foro')
    app.register_blueprint(perfil_bp,         url_prefix='/api/perfil')
    app.register_blueprint(alertas_bp,        url_prefix='/api/alertas')
    app.register_blueprint(media_bp,          url_prefix='/api/media')
    app.register_blueprint(voluntario_bp,     url_prefix='/api/voluntario')
    app.register_blueprint(admin_bp,          url_prefix='/api/admin')

    @app.route('/uploads/<path:filename>')
    def serve_upload(filename):
        return send_from_directory(UPLOAD_FOLDER, filename)

    @app.errorhandler(429)
    def demasiados_intentos(e):
        return jsonify({'error': 'Demasiados intentos. Espera un minuto e intenta de nuevo.'}), 429

    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
