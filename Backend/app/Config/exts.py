from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from app.Config.config import DevConfig

db = SQLAlchemy()
jwt = JWTManager()