import { ManagedPolicy } from '@aws-cdk/aws-iam'
import * as cdk from '@aws-cdk/core'
import * as datapipeline from '@aws-cdk/aws-datapipeline'
import * as iam from '@aws-cdk/aws-iam'

export enum TimeFormat {
  Second = 'Second',
  Minute = 'Minute',
  Hour = 'Hour',
  Day = 'Day',
  Week = 'Week',
  Month = 'Month',
}
export enum ScheduleType {
  cron = 'cron',
  timeseries = 'timeseries',
}
export enum FailureAndRerunMode {
  NONE = 'NONE',
  CASCADE = 'CASCADE',
}
export interface Props {
  tableName: string
  bucketName: string
  throughputRatio?: number
  resizeClusterBeforeRunning?: boolean
  emrTerminateAfter: {
    value: number
    format: TimeFormat
  }
  period: {
    value: number
    format: TimeFormat
  }
  runOccurrences: number
  scheduleType: ScheduleType
  failureAndRerunMode: FailureAndRerunMode
}

export class DataPipelineD2SCdk extends cdk.Construct {
  constructor(
    scope: cdk.Construct,
    id: string,
    {
      tableName,
      bucketName,
      throughputRatio,
      resizeClusterBeforeRunning,
      period,
      emrTerminateAfter,
      runOccurrences,
      scheduleType,
      failureAndRerunMode,
    }: Props,
  ) {
    super(scope, id)
    const dataPipelineDefaultRole = new iam.Role(this, 'dataPipelineDefaultRole', {
      assumedBy: new iam.CompositePrincipal(
        new iam.ServicePrincipal('datapipeline.amazonaws.com'),
        new iam.ServicePrincipal('elasticmapreduce.amazonaws.com'),
      ),
    })
    dataPipelineDefaultRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSDataPipelineRole'))
    const dataPipelineDefaultResourceRole = new iam.Role(this, 'dataPipelineDefaultResourceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    })
    dataPipelineDefaultResourceRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2RoleforDataPipelineRole'),
    )
    new iam.CfnInstanceProfile(this, 'dataPipelineDefaultResourceRoleInstanceProfile', {
      roles: [dataPipelineDefaultResourceRole.roleName],
      instanceProfileName: dataPipelineDefaultResourceRole.roleName,
    })
    new datapipeline.CfnPipeline(this, id, {
      name: id,
      parameterObjects: [],
      pipelineObjects: [
        {
          id: 'S3BackupLocation',
          name: 'Copy data to this S3 location',
          fields: [
            {
              key: 'type',
              stringValue: 'S3DataNode',
            },
            {
              key: 'dataFormat',
              refValue: 'DDBExportFormat',
            },
            {
              key: 'directoryPath',
              stringValue: `s3://${bucketName}/#{format(@scheduledStartTime, 'YYYY-MM-dd-HH-mm-ss')}`,
            },
          ],
        },
        {
          id: 'DDBSourceTable',
          name: 'DDBSourceTable',
          fields: [
            {
              key: 'tableName',
              stringValue: tableName,
            },
            {
              key: 'type',
              stringValue: 'DynamoDBDataNode',
            },
            {
              key: 'dataFormat',
              refValue: 'DDBExportFormat',
            },
            {
              key: 'readThroughputPercent',
              stringValue: `${throughputRatio}`,
            },
          ],
        },
        {
          id: 'DDBExportFormat',
          name: 'DDBExportFormat',
          fields: [
            {
              key: 'type',
              stringValue: 'DynamoDBExportDataFormat',
            },
          ],
        },
        {
          id: 'TableBackupActivity',
          name: 'TableBackupActivity',
          fields: [
            {
              key: 'resizeClusterBeforeRunning',
              stringValue: `${resizeClusterBeforeRunning}`,
            },
            {
              key: 'type',
              stringValue: 'HiveCopyActivity',
            },
            {
              key: 'input',
              refValue: 'DDBSourceTable',
            },
            {
              key: 'runsOn',
              refValue: 'EmrClusterForBackup',
            },
            {
              key: 'output',
              refValue: 'S3BackupLocation',
            },
          ],
        },
        {
          id: 'DefaultSchedule',
          name: 'RunOnce',
          fields: [
            {
              key: 'occurrences',
              stringValue: `${runOccurrences}`,
            },
            {
              key: 'startAt',
              stringValue: 'FIRST_ACTIVATION_DATE_TIME',
            },
            {
              key: 'type',
              stringValue: 'Schedule',
            },
            {
              key: 'period',
              stringValue: `${period.value} ${period.format}`,
            },
          ],
        },
        {
          id: 'Default',
          name: 'Default',
          fields: [
            {
              key: 'type',
              stringValue: 'Default',
            },
            {
              key: 'scheduleType',
              stringValue: scheduleType,
            },
            {
              key: 'failureAndRerunMode',
              stringValue: failureAndRerunMode,
            },
            {
              key: 'role',
              stringValue: dataPipelineDefaultRole.roleName,
            },
            {
              key: 'resourceRole',
              stringValue: dataPipelineDefaultResourceRole.roleName,
            },
            {
              key: 'schedule',
              refValue: 'DefaultSchedule',
            },
          ],
        },
        {
          id: 'EmrClusterForBackup',
          name: 'EmrClusterForBackup',
          fields: [
            {
              key: 'terminateAfter',
              stringValue: `${emrTerminateAfter.value} ${emrTerminateAfter.format}`,
            },
            {
              key: 'type',
              stringValue: 'EmrCluster',
            },
          ],
        },
      ],
    })
  }
}