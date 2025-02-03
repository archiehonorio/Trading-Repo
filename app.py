import os
from flask import Flask
from flask_socketio import SocketIO
from backend.routes.main import main_bp
from backend.routes._trade import trade_bp
from backend.routes.history import history_bp
from backend.config import APP_SECRET_KEY

def create_app():
    base_dir = os.path.abspath(os.path.dirname(__file__))
    static_path = os.path.join(base_dir, 'static')
    templates_path = os.path.join(base_dir, 'templates') 
    
    app = Flask(__name__, 
                template_folder=templates_path, 
                static_folder=static_path)
    app.secret_key = APP_SECRET_KEY
    socketio = SocketIO(app)

    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(trade_bp)
    app.register_blueprint(history_bp)

    return app, socketio

app, socketio = create_app()

if __name__ == "__main__":
    socketio.run(app)