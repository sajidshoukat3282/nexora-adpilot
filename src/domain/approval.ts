import type { ID, Timestamps, TenantScoped } from './shared';
export type ApprovalDecision = 'approved'|'rejected'|'changes_requested';
export type ApprovalStatus = 'pending'|'approved'|'rejected'|'changes_requested';
export interface ApprovalReview extends Timestamps, TenantScoped { id: ID; creativeId: ID; versionId: ID; reviewerUserId: ID; decision: ApprovalDecision; status: ApprovalStatus; comments: string|null; rejectionReason: string|null; }
export interface ApprovalRequest extends TenantScoped { id: ID; creativeId: ID; versionId: ID; requestedByUserId: ID; reviewerUserId?: ID; status: ApprovalStatus; requestedAt: string; dueAt?: string; }
export const APPROVAL_REJECTION_REASONS = ['wrong_creative','technical_issue','brand_guideline','quality','missing_information','other'] as const;
export type ApprovalRejectionReason = typeof APPROVAL_REJECTION_REASONS[number];
export function isApprovalFinal(status: ApprovalStatus): boolean { return status==='approved'||status==='rejected'; }
