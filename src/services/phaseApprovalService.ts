import { FirestoreService, COLLECTIONS, UserService } from './firestore';
import { PhaseApproval, User, Phase } from '../types';
import { PhaseService } from './dataServices';

export class PhaseApprovalService {
  /**
   * Request approval to move to the next phase
   */
  static async requestPhaseApproval(
    studentId: string,
    currentPhaseId: string,
    nextPhaseId: string
  ): Promise<string> {
    // Check if there's already a pending request for this transition
    const existingRequests = await FirestoreService.getWhereCompound<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      [
        { field: 'student_id', operator: '==', value: studentId },
        { field: 'next_phase_id', operator: '==', value: nextPhaseId },
        { field: 'status', operator: '==', value: 'pending' }
      ]
    );

    if (existingRequests.length > 0) {
      return existingRequests[0].id;
    }

    // Fetch student and phase names for denormalization
    const [student, currentPhase, nextPhase] = await Promise.all([
      UserService.getById(COLLECTIONS.USERS, studentId) as Promise<User | null>,
      PhaseService.getPhaseById(currentPhaseId),
      PhaseService.getPhaseById(nextPhaseId)
    ]);

    // Create new approval request
    const approvalData: Omit<PhaseApproval, 'id' | 'created_at' | 'updated_at'> = {
      student_id: studentId,
      student_name: student?.name || 'Unknown Student',
      current_phase_id: currentPhaseId,
      current_phase_name: currentPhase?.name || 'Unknown Phase',
      next_phase_id: nextPhaseId,
      next_phase_name: nextPhase?.name || 'Unknown Phase',
      requested_at: new Date(),
      status: 'pending'
    };

    return await FirestoreService.create<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      approvalData
    );
  }

  /**
   * Get pending approval requests for a student
   */
  static async getPendingApprovals(studentId: string): Promise<PhaseApproval[]> {
    return await FirestoreService.getWhereCompound<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      [
        { field: 'student_id', operator: '==', value: studentId },
        { field: 'status', operator: '==', value: 'pending' }
      ],
      'requested_at',
      'desc'
    );
  }

  /**
   * Get all pending approval requests (for admin/academic associate)
   */
  static async getAllPendingApprovals(): Promise<PhaseApproval[]> {
    return await FirestoreService.getWhere<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      'status',
      '==',
      'pending'
    );
  }

  /**
   * Approve a phase transition
   */
  static async approvePhaseTransition(
    approvalId: string,
    approverId: string
  ): Promise<void> {
    // Fetch approver name for denormalization
    const approver = await UserService.getById(COLLECTIONS.USERS, approverId) as User | null;
    
    await FirestoreService.update<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      approvalId,
      {
        status: 'approved',
        approved_by: approverId,
        approved_by_name: approver?.name || 'Unknown Admin',
        approved_at: new Date()
      }
    );
  }

  /**
   * Reject a phase transition
   */
  static async rejectPhaseTransition(
    approvalId: string,
    approverId: string,
    reason: string
  ): Promise<void> {
    // Fetch approver name for denormalization
    const approver = await UserService.getById(COLLECTIONS.USERS, approverId) as User | null;
    
    await FirestoreService.update<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      approvalId,
      {
        status: 'rejected',
        approved_by: approverId,
        approved_by_name: approver?.name || 'Unknown Admin',
        approved_at: new Date(),
        rejection_reason: reason
      }
    );
  }

  /**
   * Check if student can access a specific phase
   */
  static async canAccessPhase(
    studentId: string,
    phaseId: string,
    currentPhaseOrder: number,
    targetPhaseOrder: number
  ): Promise<boolean> {
    // If target phase is before or equal to current phase, allow access
    if (targetPhaseOrder <= currentPhaseOrder) {
      return true;
    }

    // Check if there's an approved request for this phase or any phase before it
    const approvedRequests = await FirestoreService.getWhereCompound<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      [
        { field: 'student_id', operator: '==', value: studentId },
        { field: 'status', operator: '==', value: 'approved' }
      ]
    );

    // Get all approved phase IDs
    const approvedPhaseIds = approvedRequests.map(req => req.next_phase_id);
    
    // Allow access if this phase is approved
    return approvedPhaseIds.includes(phaseId);
  }

  /**
   * Get approval history for a student
   */
  static async getApprovalHistory(studentId: string): Promise<PhaseApproval[]> {
    return await FirestoreService.getWhere<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      'student_id',
      '==',
      studentId
    );
  }

  /**
   * Get the highest approved phase for a student
   */
  static async getHighestApprovedPhase(studentId: string): Promise<string | null> {
    const approvals = await FirestoreService.getWhereCompound<PhaseApproval>(
      COLLECTIONS.PHASE_APPROVALS,
      [
        { field: 'student_id', operator: '==', value: studentId },
        { field: 'status', operator: '==', value: 'approved' }
      ],
      'approved_at',
      'desc'
    );

    return approvals.length > 0 ? approvals[0].next_phase_id : null;
  }
}
