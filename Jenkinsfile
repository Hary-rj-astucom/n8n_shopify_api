pipeline {
    agent any

    environment {
        PROJECT_DIR = "/var/www/n8n_shopify_api"
        APP_NAME = "n8n_shopify_api"
        BRANCH = "main" // à adapter selon ta branche
    }

    stages {
        stage('Set Permissions') {
            steps {
                echo "Donne tous les droits sur le projet au user Jenkins..."
                sh "sudo chown -R jenkins:jenkins ${PROJECT_DIR}"
                sh "sudo chmod -R 775 ${PROJECT_DIR}"
            }
        }

        stage('Set Git Safe Directory') {
            steps {
                echo "Définir le dépôt comme safe directory pour Git..."
                sh "git config --global --add safe.directory ${PROJECT_DIR}"
            }
        }

        stage('Pull Latest Changes') {
            steps {
                echo " Pull des dernières modifications depuis GitHub..."
                dir("${PROJECT_DIR}") {
                    // Récupère les changements
                    sh "git fetch origin"
                    // Vérifie si des commits nouveaux existent
                    script {
                        def changes = sh(script: "git rev-list HEAD...origin/${BRANCH} --count", returnStdout: true).trim()
                        env.CHANGE_DETECTED = changes != "0" ? "true" : "false"
                        echo "Changements détectés : ${env.CHANGE_DETECTED}"
                        if (env.CHANGE_DETECTED == "true") {
                            sh "git reset --hard origin/${BRANCH}"
                        }
                    }
                }
            }
        }

        stage('Install Dependencies') {
            when {
                expression { env.CHANGE_DETECTED == "true" }
            }
            steps {
                echo " Installation des dépendances Node.js..."
                dir("${PROJECT_DIR}") {
                    sh "npm install"
                }
            }
        }

        stage('Restart App') {
            when {
                expression { env.CHANGE_DETECTED == "true" }
            }
            steps {
                echo " Redémarrage de l’application avec PM2..."
                sh "pm2 restart ${APP_NAME} || pm2 start ${PROJECT_DIR}/app.js --name ${APP_NAME}"
            }
        }
    }

    post {
        success {
            echo "Mise à jour et redémarrage terminés avec succès !"
        }
        failure {
            echo "La mise à jour a échoué."
        }
    }
}
