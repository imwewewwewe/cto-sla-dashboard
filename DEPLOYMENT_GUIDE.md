# CTO SLA Dashboard - Production Deployment Guide

**Developed by Homains for SWAP**

This guide provides step-by-step instructions for deploying the CTO SLA Dashboard to production on AWS ECS with the domain `a-cto.swapegypt.app`.

## Prerequisites

- AWS CLI configured with `swap` profile
- Docker installed
- Git repository initialized
- Domain `a-cto.swapegypt.app` configured in Route53

## Step 1: AWS Resources Setup

### 1.1 Create ECR Repository

```bash
aws ecr create-repository \
  --repository-name cto-sla-dashboard \
  --region eu-central-1 \
  --profile swap
```

### 1.2 Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /aws/ecs/cto-sla-dashboard \
  --region eu-central-1 \
  --profile swap
```

### 1.3 Create Secrets in AWS Secrets Manager

```bash
# AWS Access Key ID
aws secretsmanager create-secret \
  --name cto-sla/aws-access-key-id \
  --secret-string "YOUR_AWS_ACCESS_KEY_ID" \
  --region eu-central-1 \
  --profile swap

# AWS Secret Access Key
aws secretsmanager create-secret \
  --name cto-sla/aws-secret-access-key \
  --secret-string "YOUR_AWS_SECRET_ACCESS_KEY" \
  --region eu-central-1 \
  --profile swap

# MongoDB URI
aws secretsmanager create-secret \
  --name cto-sla/mongo-uri \
  --secret-string "mongodb://username:password@host:27017/sla-monitoring" \
  --region eu-central-1 \
  --profile swap
```

### 1.4 Create/Update ECS Task Execution Role

Ensure the `ecsTaskExecutionRole` has permissions to read secrets:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:eu-central-1:226293104860:secret:cto-sla/*"
      ]
    }
  ]
}
```

### 1.5 Create/Update ECS Task Role

Ensure the `ecsTaskRole` has permissions for CloudWatch and ECS:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics",
        "ecs:DescribeServices",
        "ecs:DescribeTasks",
        "ecs:ListTasks"
      ],
      "Resource": "*"
    }
  ]
}
```

## Step 2: Register ECS Task Definition

```bash
aws ecs register-task-definition \
  --cli-input-json file://aws/task-definition.json \
  --region eu-central-1 \
  --profile swap
```

## Step 3: Create ECS Service

### 3.1 Get VPC and Subnet Information

```bash
# Get VPC ID
aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=false" \
  --query "Vpcs[0].VpcId" \
  --output text \
  --region eu-central-1 \
  --profile swap

# Get Subnet IDs
aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=YOUR_VPC_ID" \
  --query "Subnets[*].SubnetId" \
  --output text \
  --region eu-central-1 \
  --profile swap

# Get Security Group ID
aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=YOUR_VPC_ID" "Name=group-name,Values=default" \
  --query "SecurityGroups[0].GroupId" \
  --output text \
  --region eu-central-1 \
  --profile swap
```

### 3.2 Create Security Group for Dashboard

```bash
# Create security group
aws ec2 create-security-group \
  --group-name cto-sla-dashboard-sg \
  --description "Security group for CTO SLA Dashboard" \
  --vpc-id YOUR_VPC_ID \
  --region eu-central-1 \
  --profile swap

# Allow inbound traffic on port 3001 from ALB
aws ec2 authorize-security-group-ingress \
  --group-id YOUR_SG_ID \
  --protocol tcp \
  --port 3001 \
  --source-group YOUR_ALB_SG_ID \
  --region eu-central-1 \
  --profile swap
```

### 3.3 Create Target Group

```bash
aws elbv2 create-target-group \
  --name cto-sla-dashboard-tg \
  --protocol HTTP \
  --port 3001 \
  --vpc-id YOUR_VPC_ID \
  --target-type ip \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region eu-central-1 \
  --profile swap
```

### 3.4 Create ECS Service

```bash
aws ecs create-service \
  --cluster prod-swap-cluster \
  --service-name cto-sla-dashboard \
  --task-definition cto-sla-dashboard \
  --desired-count 1 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-xxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=arn:aws:elasticloadbalancing:eu-central-1:226293104860:targetgroup/cto-sla-dashboard-tg/xxx,containerName=cto-sla-dashboard,containerPort=3001" \
  --health-check-grace-period-seconds 60 \
  --region eu-central-1 \
  --profile swap
```

## Step 4: Configure Application Load Balancer

### 4.1 Get Existing ALB ARN

```bash
aws elbv2 describe-load-balancers \
  --names swap-prod-alb \
  --query "LoadBalancers[0].LoadBalancerArn" \
  --output text \
  --region eu-central-1 \
  --profile swap
```

### 4.2 Create Listener Rule for a-cto.swapegypt.app

```bash
# Get HTTPS listener ARN (assuming port 443)
aws elbv2 describe-listeners \
  --load-balancer-arn YOUR_ALB_ARN \
  --query "Listeners[?Port==\`443\`].ListenerArn" \
  --output text \
  --region eu-central-1 \
  --profile swap

# Create listener rule
aws elbv2 create-rule \
  --listener-arn YOUR_LISTENER_ARN \
  --priority 20 \
  --conditions Field=host-header,Values=a-cto.swapegypt.app \
  --actions Type=forward,TargetGroupArn=YOUR_TARGET_GROUP_ARN \
  --region eu-central-1 \
  --profile swap
```

## Step 5: Configure DNS (Route53)

### 5.1 Get ALB DNS Name

```bash
aws elbv2 describe-load-balancers \
  --names swap-prod-alb \
  --query "LoadBalancers[0].DNSName" \
  --output text \
  --region eu-central-1 \
  --profile swap
```

### 5.2 Create Route53 Record

```bash
# Get hosted zone ID
aws route53 list-hosted-zones-by-name \
  --dns-name swapegypt.app \
  --query "HostedZones[0].Id" \
  --output text \
  --profile swap

# Create A record (alias to ALB)
cat > change-batch.json <<EOF
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "a-cto.swapegypt.app",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "YOUR_ALB_HOSTED_ZONE_ID",
          "DNSName": "YOUR_ALB_DNS_NAME",
          "EvaluateTargetHealth": true
        }
      }
    }
  ]
}
EOF

aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_HOSTED_ZONE_ID \
  --change-batch file://change-batch.json \
  --profile swap
```

## Step 6: Deploy Application

### Option 1: Using Deployment Script

```bash
./deploy.sh
```

### Option 2: Manual Deployment

```bash
# Build image
docker build -t cto-sla-dashboard .

# Login to ECR
aws ecr get-login-password --region eu-central-1 --profile swap | \
  docker login --username AWS --password-stdin 226293104860.dkr.ecr.eu-central-1.amazonaws.com

# Tag and push
docker tag cto-sla-dashboard:latest \
  226293104860.dkr.ecr.eu-central-1.amazonaws.com/cto-sla-dashboard:latest

docker push 226293104860.dkr.ecr.eu-central-1.amazonaws.com/cto-sla-dashboard:latest

# Update service
aws ecs update-service \
  --cluster prod-swap-cluster \
  --service cto-sla-dashboard \
  --force-new-deployment \
  --region eu-central-1 \
  --profile swap
```

## Step 7: Configure MongoDB

### Option 1: MongoDB Atlas (Recommended)

1. Create MongoDB Atlas cluster
2. Whitelist ECS task IPs or use VPC peering
3. Update secret `cto-sla/mongo-uri` with Atlas connection string

### Option 2: Self-hosted MongoDB on EC2

1. Launch EC2 instance in same VPC
2. Install MongoDB
3. Configure security groups
4. Update secret with connection string

## Step 8: Verify Deployment

### 8.1 Check Service Status

```bash
aws ecs describe-services \
  --cluster prod-swap-cluster \
  --services cto-sla-dashboard \
  --region eu-central-1 \
  --profile swap
```

### 8.2 Check Task Status

```bash
aws ecs list-tasks \
  --cluster prod-swap-cluster \
  --service-name cto-sla-dashboard \
  --region eu-central-1 \
  --profile swap

aws ecs describe-tasks \
  --cluster prod-swap-cluster \
  --tasks YOUR_TASK_ARN \
  --region eu-central-1 \
  --profile swap
```

### 8.3 Check Logs

```bash
aws logs tail /aws/ecs/cto-sla-dashboard \
  --follow \
  --region eu-central-1 \
  --profile swap
```

### 8.4 Test Application

```bash
# Health check
curl https://a-cto.swapegypt.app/api/health

# Dashboard metrics
curl https://a-cto.swapegypt.app/api/metrics/dashboard?env=production
```

## Step 9: Configure CI/CD (GitHub Actions)

### 9.1 Add GitHub Secrets

Go to repository settings → Secrets and variables → Actions:

- `AWS_ACCESS_KEY_ID`: Your AWS access key
- `AWS_SECRET_ACCESS_KEY`: Your AWS secret key

### 9.2 Test CI/CD Pipeline

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

The GitHub Actions workflow will automatically:
1. Build Docker image
2. Push to ECR
3. Update ECS service

## Monitoring and Maintenance

### View Application Logs

```bash
aws logs tail /aws/ecs/cto-sla-dashboard --follow \
  --region eu-central-1 --profile swap
```

### Update Application

```bash
# Make changes, then:
./deploy.sh
```

### Scale Service

```bash
aws ecs update-service \
  --cluster prod-swap-cluster \
  --service cto-sla-dashboard \
  --desired-count 2 \
  --region eu-central-1 \
  --profile swap
```

### Rollback to Previous Version

```bash
# List task definition revisions
aws ecs list-task-definitions \
  --family-prefix cto-sla-dashboard \
  --region eu-central-1 \
  --profile swap

# Update service to previous revision
aws ecs update-service \
  --cluster prod-swap-cluster \
  --service cto-sla-dashboard \
  --task-definition cto-sla-dashboard:PREVIOUS_REVISION \
  --region eu-central-1 \
  --profile swap
```

## Troubleshooting

### Service Not Starting

1. Check task definition is registered
2. Verify secrets are accessible
3. Check security group rules
4. Review CloudWatch logs

### 502 Bad Gateway

1. Verify target group health checks
2. Check service is running and healthy
3. Verify ALB listener rules
4. Check security group allows ALB → ECS traffic

### Cannot Connect to MongoDB

1. Verify MongoDB URI in secrets
2. Check network connectivity (VPC peering, security groups)
3. Verify MongoDB authentication credentials

## Security Checklist

- [ ] AWS secrets configured in Secrets Manager
- [ ] Security groups properly configured
- [ ] HTTPS enforced via ALB
- [ ] MongoDB access restricted
- [ ] IAM roles follow least privilege principle
- [ ] CloudWatch logs enabled
- [ ] Health checks configured

## Cost Optimization

- Use Fargate Spot for non-critical environments
- Configure auto-scaling based on CPU/memory
- Use reserved capacity for predictable workloads
- Monitor CloudWatch metrics and set billing alarms

## Support

For deployment issues contact:
- **Email**: mahmoud.e@homains.eu
- **Company**: Homains (https://homains.eu)

---

© 2026 Homains. All rights reserved.
