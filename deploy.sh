#!/bin/bash

# CTO SLA Dashboard Deployment Script
# Developed by Homains for SWAP

set -e

echo "🚀 Starting CTO SLA Dashboard Deployment"
echo "========================================"

# Configuration
AWS_PROFILE="swap"
AWS_REGION="eu-central-1"
AWS_ACCOUNT_ID="226293104860"
ECR_REPOSITORY="cto-sla-dashboard"
ECS_CLUSTER="prod-swap-cluster"
ECS_SERVICE="cto-sla-dashboard"
IMAGE_TAG=$(git rev-parse --short HEAD)

echo "📋 Configuration:"
echo "   AWS Profile: $AWS_PROFILE"
echo "   AWS Region: $AWS_REGION"
echo "   ECR Repository: $ECR_REPOSITORY"
echo "   Image Tag: $IMAGE_TAG"
echo ""

# Step 1: Build Docker image
echo "📦 Building Docker image..."
docker build -t $ECR_REPOSITORY:$IMAGE_TAG .
docker tag $ECR_REPOSITORY:$IMAGE_TAG $ECR_REPOSITORY:latest
echo "✅ Docker image built successfully"
echo ""

# Step 2: Login to ECR
echo "🔐 Logging in to Amazon ECR..."
aws ecr get-login-password --region $AWS_REGION --profile $AWS_PROFILE | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
echo "✅ Logged in to ECR"
echo ""

# Step 3: Tag and push image
echo "☁️  Pushing image to ECR..."
docker tag $ECR_REPOSITORY:$IMAGE_TAG \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG

docker tag $ECR_REPOSITORY:$IMAGE_TAG \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest

docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$IMAGE_TAG
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
echo "✅ Image pushed to ECR"
echo ""

# Step 4: Update ECS service
echo "🔄 Updating ECS service..."
aws ecs update-service \
  --cluster $ECS_CLUSTER \
  --service $ECS_SERVICE \
  --force-new-deployment \
  --region $AWS_REGION \
  --profile $AWS_PROFILE
echo "✅ ECS service updated"
echo ""

echo "🎉 Deployment completed successfully!"
echo "📊 Dashboard will be available at: https://a-cto.swapegypt.app"
echo ""
echo "To monitor deployment:"
echo "  aws ecs describe-services --cluster $ECS_CLUSTER --services $ECS_SERVICE --region $AWS_REGION --profile $AWS_PROFILE"
