pipeline {
    agent any

    environment {
        DOCKER_API_VERSION = '1.41'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([file(credentialsId: 'escuela-env', variable: 'ENV_FILE')]) {
                sh '''
                    cp "$ENV_FILE" .env
                    docker compose down --remove-orphans || true
                    docker system prune -af || true
                    docker builder prune -af || true
                    docker compose build --no-cache
                    docker compose up -d
                '''
                }
            }
        }
    }
}
