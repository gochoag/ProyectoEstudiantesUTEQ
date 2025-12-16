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
                        cp $ENV_FILE .env
                        
                        # Detener y eliminar contenedores existentes
                        docker stop apiescuela-backend frontedescuela-frontend || true
                        docker rm -f apiescuela-backend frontedescuela-frontend || true
                        
                        # Limpiar con docker compose
                        docker compose down --remove-orphans --volumes || true
                        
                        # Construir y levantar
                        docker compose up -d --build
                    '''
                }
            }
        }
    }
}
