pipeline {
    agent any

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
                    docker rm -f apiescuela-backend || true
                    docker compose up -d --build
                '''
                }
            }
        }
    }
}
