# Simplest library for use data pipeline `Expprt DynamoDB to S3` on [AWS-CDK](https://aws.amazon.com/en/cdk/)

[![npm version](https://badge.fury.io/js/data-pipeline-d2s-cdk.svg)](https://badge.fury.io/js/data-pipeline-d2s-cdk)

## Features

This library prepare resouce on bellow.

- IAM Role for use data pipeline
- Configuration of `Expprt DynamoDB to S3` on data pipeline

## Usage

Simple stack of data-pipeline for `Expprt DynamoDB to S3` on bellow.

```typescript

const { tableName } = new dynamodb.Table(this, 'Table', {
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING }
})
const { bucketName } = new s3.Bucket(this, 'MyBucket')

new DataPipelineD2SCdk(this, 'DataPipeline', {
  tableName,
  bucketName,
  throughputRatio: 0.2,
  period: {
    value: 1,
    format: TimeFormat.Day,
  },
  emrTerminateAfter: {
    value: 1,
    format: TimeFormat.Hour
  },
})

```