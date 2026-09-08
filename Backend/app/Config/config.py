import os
from decouple import config

class Config:
    MAX_CONTENT_LENGTH = 600 * 1024 * 1024
    SECRET_KEY = config('SECRET_KEY')
    SQLALCHEMY_TRACK_MODIFICATIONS = config('SQLALCHEMY_TRACK_MODIFICATIONS', cast=bool)
    REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')
    
    broker_url = REDIS_URL
    result_backend = REDIS_URL
    task_serializer = 'json'
    accept_content = ['json']
    result_serializer = 'json'
    worker_disable_rate_limits = True
    broker_connection_retry_on_startup = True

class DevConfig(Config):
    SQLALCHEMY_DATABASE_URI = "mysql+pymysql://root@localhost/university_management"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = True
    SQLALCHEMY_ECHO = True