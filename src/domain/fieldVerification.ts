import type { ID, Timestamps, TenantScoped } from './shared';
export type FieldTaskStatus='assigned'|'in_progress'|'submitted'|'approved'|'rejected'|'recapture_requested';
export interface FieldTask extends Timestamps, TenantScoped { id:ID; campaignId:ID; assetId:ID; assignedToUserId:ID; status:FieldTaskStatus; dueAt?:string; }
export interface FieldCapture { id:ID; taskId:ID; proofId:ID; capturedAt:string; latitude:number; longitude:number; gpsAccuracyM:number|null; source:'camera'|'gallery'; deviceInfo?:string; }
export interface GeoVerification { distanceM:number; allowedRadiusM:number; accuracyM:number|null; state:'inside'|'outside'|'accuracy_insufficient'|'not_available'; }
export function verifyGeo(distanceM:number, allowedRadiusM:number, accuracyM:number|null):GeoVerification { const state=accuracyM!==null&&accuracyM>allowedRadiusM?'accuracy_insufficient':distanceM<=allowedRadiusM?'inside':'outside'; return {distanceM,allowedRadiusM,accuracyM,state}; }
export const FIELD_REJECTION_REASONS=['wrong_creative','damaged_billboard','missing_creative','wrong_location','gps_mismatch','obstruction','poor_visibility','lighting','other'] as const;
