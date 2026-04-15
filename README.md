# SRE проект: Voting App (Cats vs Dogs)

Приложение состоит из 5 микросервисов:
- **Vote** (Python/Flask) — интерфейс для голосования
- **Result** (Node.js) — отображение результатов
- **Worker** (.NET) — асинхронная обработка голосов
- **Redis** — очередь сообщений
- **PostgreSQL** — постоянное хранилище

Требования:
- Windows 10/11
- Minikube
- VirtualBox
- kubectl
- Helm
- Git
- JMeter (для нагрузочного тестирования)

## Установка и запуск
1. Запустить Minikube:  
```minikube start --driver=virtualbox --cpus=4 --memory=12000```  
2. Создать неймспейс:  
```kubectl create namespace voting-app```
3. Применить манифесты:  
```kubectl apply -f k8s/```
4. Установить мониторинг:
```helm repo add prometheus-community https://prometheus-community.github.io/helm-charts```  
```helm repo update```  
```helm install monitoring prometheus-community/kube-prometheus-stack --namespace monitoring --create-namespace```  
5. Применить PodMonitor:
```kubectl apply -f monitoring/podmonitors.yaml```
6. Открыть Grafana:
```kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80```
7. Импортировать дашборд:
```Загрузить SRE Dashboard-1776288391816.json```
8. Открыть приложение:
```minikube service vote -n voting-app```
```minikube service result -n voting-app```

## Структура проекта  
sre-project/  
├── .github/  
│ └── workflows/  
│ └── deploy.yml # CI/CD пайплайн  
├── jmeter/  
│ └── sre-Vote_app.jmx # JMeter тест-план  
├── k8s/  
│ ├── hpa-vote.yaml  
│ ├── hpa-worker.yaml  
│ ├── postgres-deployment.yaml  
│ ├── postgres-service.yaml  
│ ├── redis-deployment.yaml  
│ ├── redis-service.yaml  
│ ├── result-deployment.yaml  
│ ├── result-service.yaml  
│ ├── vote-deployment.yaml  
│ ├── vote-service.yaml  
│ ├── worker-deployment.yaml  
│ └── worker-service.yaml  
├── monitoring/  
│ ├── podmonitors.yaml  
│ ├── postgres-podmonitor.yaml  
│ └── redis-podmonitor.yaml  
├── result-app/  
│ ├── Dockerfile  
│ ├── package.json  
│ └── server.js  
├── vote-app/  
│ ├── app.py  
│ ├── Dockerfile  
│ └── requirements.txt  
├── worker-app/  
│ ├── Dockerfile  
│ ├── Worker.cs  
│ └── Worker.csproj  
├── SRE Dashboard-1776288391816.json # Дашборд Grafana  
├── .gitignore  
├── kubeconfig_base64.txt  
├── kubeconfig.yaml  
└── README.md  

## Нагрузочное тестирование  
1. Запустить JMeter и открыть файл:  
```jmeter/vote-load-test.jmx```
2. Во время теста наблюдать:  
```kubectl get hpa -n voting-app -w```  
```kubectl get pods -n voting-app -w```

## CI/CD  
GitHub Actions настроен на автоматический деплой при пуше в ветку main  

## Остановка  
```minikube stop```  

## Очистка  
```minikube delete```  
