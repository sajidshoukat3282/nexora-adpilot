import type { ID, Timestamps, TenantScoped } from './shared';
export type ProofType='static_posting'|'field_photo'|'field_video'|'playback_log'|'cms_log';
export type ProofStatus='submitted'|'review'|'approved'|'rejected'|'recapture_requested';
export interface ProofEvidence extends Timestamps, TenantScoped { id:ID; campaignId:ID; assetId:ID; scheduleId?:ID; type:ProofType; status:ProofStatus; objectKey?:string; sourceRef?:string; capturedAt?:string; receivedAt:string; uploaderUserId:ID; latitude?:number; longitude?:number; gpsAccuracyM?:number; deviceInfo?:string; notes?:string; reviewerUserId?:ID; reviewedAt?:string; rejectionReason?:string; }
export type ProofTimelineStage='scheduled'|'delivered'|'playback_recorded'|'field_verified'|'reviewed'|'approved';
export interface ProofTimelineEvent extends Timestamps, TenantScoped { id:ID; campaignId:ID; assetId:ID; stage:ProofTimelineStage; proofId?:ID; occurredAt:string; source:'system'|'cms'|'field'; }
