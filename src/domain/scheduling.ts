import type { ID, Timestamps, TenantScoped } from './shared';
export type ScheduleStatus = 'draft'|'ready'|'scheduled'|'active'|'completed'|'cancelled';
export interface ScheduleWindow { startAt:string; endAt:string; timezone:string; daysOfWeek?:number[]; daypart?:string; recurrence?:string; }
export interface CampaignScheduleAssignment extends Timestamps, TenantScoped { id:ID; campaignId:ID; assetId:ID; creativeVersionId:ID; window:ScheduleWindow; status:ScheduleStatus; approvedAt?:string; scheduledByUserId?:ID; }
export interface SchedulingValidation { allowed:boolean; reasons:string[]; }
export function validateScheduleWindow(w:ScheduleWindow): string[] { const e:string[]=[]; if(!w.startAt||!w.endAt)e.push('Schedule start and end are required.'); if(w.endAt<=w.startAt)e.push('Schedule end must be after start.'); if(w.daysOfWeek?.some(d=>!Number.isInteger(d)||d<0||d>6))e.push('Days of week must be 0 through 6.'); return e; }
