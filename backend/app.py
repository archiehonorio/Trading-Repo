from flask import Flask
from flask_socketio import SocketIO
from dotenv import load_dotenv
import os
from routes.main import main_bp
from routes.trade import trade_bp
from routes.history import history_bp

load_dotenv()

def create_app():
    app = Flask(__name__, template_folder="../templates", static_folder="../static")
    app.secret_key = os.getenv('APP_SECRET_KEY')
    socketio = SocketIO(app)

    # Register blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(trade_bp)
    app.register_blueprint(history_bp)

    return app, socketio

app, socketio = create_app()

if __name__ == "__main__":
    socketio.run(app)