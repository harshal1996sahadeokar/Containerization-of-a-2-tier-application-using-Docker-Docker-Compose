### Workflow Overview:
1. **Dockerize the application**: Create Docker containers for both the web tier (frontend) and database tier (backend).
2. **Docker Compose**: Use Docker Compose to manage multi-container applications.
3. **CI/CD Pipeline**: Use AWS CodePipeline, CodeCommit, and CodeBuild for continuous integration and deployment.
4. **Deployment to EC2**: Deploy the Dockerized application to an EC2 instance using Docker Compose and AWS CodeDeploy.

### Prerequisites:
1. **AWS Account**.
2. **AWS CLI** installed and configured.
3. **EC2 instance** running Linux with Docker and Docker Compose installed.
4. **AWS CodeCommit**, **CodeBuild**, **CodeDeploy**, and **CodePipeline** set up.
5. **Docker** and **Docker Compose** installed on your local machine for testing.

---

### Step 1: Create Application Files

Create a simple 2-tier application with a web frontend and a database backend.

#### Backend (Database Tier) Setup

1. **Create the `backend` folder and the Dockerfile for MySQL**:

```bash
mkdir backend
cd backend
touch Dockerfile
```

2. **Add the following to the MySQL `Dockerfile`**:

```Dockerfile
FROM mysql:5.7
ENV MYSQL_ROOT_PASSWORD=rootpassword
ENV MYSQL_DATABASE=mydb
ENV MYSQL_USER=myuser
ENV MYSQL_PASSWORD=mypassword
EXPOSE 3306
```

#### Frontend (Web Tier) Setup

1. **Create the `frontend` folder and a basic Node.js web server**:

```bash
mkdir ../frontend
cd ../frontend
npm init -y
npm install express mysql
touch app.js
```

2. **Add the following code to `app.js`**:

```javascript
const express = require('express');
const mysql = require('mysql');
const app = express();
const PORT = 3000;

const db = mysql.createConnection({
  host: 'db',  // Docker Compose will set up a network alias
  user: 'myuser',
  password: 'mypassword',
  database: 'mydb'
});

app.get('/', (req, res) => {
  db.query('SELECT "Welcome to the 2-tier Dockerized App" AS message', (err, results) => {
    if (err) throw err;
    res.send(results[0].message);
  });
});

app.listen(PORT, () => {
  console.log(`Frontend running on http://localhost:${PORT}`);
});
```

3. **Create the Dockerfile for the frontend**:

```bash
touch Dockerfile
```

```Dockerfile
FROM node:14
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]
```

---

### Step 2: Create a Docker Compose File

Define both the frontend and backend services in a `docker-compose.yml` file.

1. **Create the `docker-compose.yml` file**:

```bash
touch docker-compose.yml
```

```yaml
version: '3.8'
services:
  db:
    build: ./backend
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: mydb
      MYSQL_USER: myuser
      MYSQL_PASSWORD: mypassword
    ports:
      - "3306:3306"

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - db
```

---

### Step 3: Build and Test Locally

Before deploying on AWS, test the application locally.

1. **Build the Docker containers**:

```bash
docker-compose build
```

2. **Run the application**:

```bash
docker-compose up
```

3. **Test the application** by accessing `http://localhost:3000`.

---

### Step 4: Set Up AWS Services

#### 1. AWS CodeCommit Repository

First, push your code (Dockerfiles, application files, and `docker-compose.yml`) to **AWS CodeCommit**.

1. **Create a new CodeCommit repository**:

```bash
aws codecommit create-repository --repository-name DockerApp
```

2. **Clone the repository** and push your local code:

```bash
git clone https://git-codecommit.<region>.amazonaws.com/v1/repos/DockerApp
cd DockerApp
git add .
git commit -m "Initial commit"
git push
```

---

#### 2. AWS CodeBuild

**AWS CodeBuild** will build your Docker images on each commit.

1. **Create a `buildspec.yml`** file in the root of your project for **CodeBuild**:

```bash
touch buildspec.yml
```

```yaml
version: 0.2

phases:
  install:
    commands:
      - echo Installing Docker...
      - yum install -y docker
      - service docker start
  pre_build:
    commands:
      - echo Logging in to Amazon EC2...
  build:
    commands:
      - echo Build started on `date`
      - echo Building the Docker images...
      - docker-compose build
artifacts:
  files:
    - '**/*'
```

---

#### 3. AWS CodeDeploy

**AWS CodeDeploy** will deploy your application to EC2 instances using the Docker containers built by CodeBuild.

1. **Create a `appspec.yml`** for CodeDeploy:

```bash
touch appspec.yml
```

```yaml
version: 0.0
os: linux
files:
  - source: /
    destination: /home/ec2-user/DockerApp
hooks:
  AfterInstall:
    - location: scripts/deploy.sh
      timeout: 300
      runas: ec2-user
```

2. **Create a `scripts/deploy.sh` file** to start the Docker containers on your EC2 instance:

```bash
mkdir scripts
touch scripts/deploy.sh
```

```bash
#!/bin/bash
cd /home/ec2-user/DockerApp
docker-compose down
docker-compose up -d
```

3. **Make `deploy.sh` executable**:

```bash
chmod +x scripts/deploy.sh
```

---

#### 4. AWS EC2 (Deployment Target)

1. **Launch an EC2 instance** that will host your application. Install Docker and Docker Compose on the instance:

```bash
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
sudo usermod -a -G docker ec2-user
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

2. **Install CodeDeploy agent** on EC2:

```bash
sudo yum install -y ruby wget
cd /home/ec2-user
wget https://aws-codedeploy-<region>.s3.<region>.amazonaws.com/latest/install
chmod +x ./install
sudo ./install auto
sudo service codedeploy-agent start
```

---

### Step 5: Set Up CI/CD Pipeline

1. **Create an AWS CodePipeline** with the following steps:
   - **Source**: AWS CodeCommit.
   - **Build**: AWS CodeBuild (to build Docker images).
   - **Deploy**: AWS CodeDeploy (to deploy the Dockerized application on EC2).

2. **Test the Pipeline**:
   - Every time you push new changes to your **CodeCommit** repository, the pipeline will be triggered, and the updated Docker images will be deployed to your EC2 instance.

---

### Step 6: Testing the Deployed Application

1. **Connect to your EC2 instance** and verify that the application is running:

```bash
docker ps
```

2. **Open the application in your browser** using the EC2 instance's public IP:

```bash
http://<EC2-Public-IP>:3000
```

You should see the 2-tier application running successfully.

---

### Summary of Steps:

1. **Dockerize the 2-tier application** (web frontend and database backend).
2. **Define multi-container setup with Docker Compose**.
3. **Push the code to AWS CodeCommit**.
4. **Set up AWS CodeBuild** to build Docker containers.
5. **Set up AWS CodeDeploy** to deploy the application on EC2 instances.
6. **Create a CI/CD pipeline using AWS CodePipeline**.
7. **Deploy and test the application** on an EC2 instance using Docker Compose.

By using Docker Compose and AWS CI/CD services, this method allows you to containerize and deploy a 2-tier application without relying on ECS or ECR, using EC2 as the hosting environment instead.
