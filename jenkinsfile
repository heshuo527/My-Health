// my-app-ci-cd/Jenkinsfile
pipeline {
    agent any

    environment {
        // 替换为你的 Docker Hub 用户名
        DOCKER_HUB_USERNAME = 'heshuo77' 
        // 可以从 Jenkins 凭据中获取 Docker Hub 密码
        DOCKER_HUB_CREDENTIAL_ID = 'dockerhub-credential-id' // 如果需要私有仓库
        // 你的 GitHub 仓库地址
        GITHUB_REPO = 'https://github.com/heshuo527/My-Health.git'
        // 你在 Jenkins 中添加的 GitHub PAT 凭据 ID
        GITHUB_CREDENTIAL_ID = 'github-pat-token' 
        
        // Kubernetes 部署文件路径
        KUBERNETES_DEPLOYMENT_FILE = 'kubernetes-deployment.yaml'
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main', credentialsId: env.GITHUB_CREDENTIAL_ID, url: env.GITHUB_REPO
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    def imageTag = "${env.DOCKER_HUB_USERNAME}/my-app:${env.BUILD_NUMBER}"
                    // 登录 Docker Hub (如果需要推送私有镜像)
                    // withCredentials([usernamePassword(credentialsId: env.DOCKER_HUB_CREDENTIAL_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    //     sh "echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin"
                    // }
                    sh "docker build -t ${imageTag} ."
                    sh "docker tag ${imageTag} ${env.DOCKER_HUB_USERNAME}/my-app:latest"
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    // 推送到 Docker Hub (如果需要)
                    // withCredentials([usernamePassword(credentialsId: env.DOCKER_HUB_CREDENTIAL_ID, usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    //     sh "echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin"
                    //     sh "docker push ${env.DOCKER_HUB_USERNAME}/my-app:latest"
                    //     sh "docker push ${env.DOCKER_HUB_USERNAME}/my-app:${env.BUILD_NUMBER}"
                    // }
                    echo "Skipping Docker Hub push for local demo. Image is built locally."
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    // 替换 YAML 文件中的镜像标签
                    def deploymentContent = readFile(env.KUBERNETES_DEPLOYMENT_FILE)
                    deploymentContent = deploymentContent.replaceAll('heshuo77/my-app:latest', "${env.DOCKER_HUB_USERNAME}/my-app:latest")
                    writeFile file: env.KUBERNETES_DEPLOYMENT_FILE, text: deploymentContent
                    
                    // 应用 Kubernetes 配置
                    sh "kubectl apply -f ${env.KUBERNETES_DEPLOYMENT_FILE}"
                    echo "Application deployed to Kubernetes!"
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    sh "kubectl get pods -l app=my-app"
                    sh "kubectl get svc my-app-service"
                    echo "Deployment verification steps completed."
                }
            }
        }
    }

    post {
        always {
            cleanWs() // 清理工作区
            echo "Pipeline finished."
        }
        failure {
            echo "Pipeline failed! Check logs for details."
        }
        success {
            echo "Pipeline succeeded! Application deployed."
        }
    }
}