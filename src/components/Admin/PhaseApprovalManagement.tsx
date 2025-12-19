import React, { useState, useEffect } from 'react';
import { PhaseApprovalService } from '../../services/phaseApprovalService';
import { PhaseService } from '../../services/dataServices';
import { FirestoreService, COLLECTIONS } from '../../services/firestore';
import { PhaseApproval, Phase, User } from '../../types';
import { CheckCircle, XCircle, Clock, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const PhaseApprovalManagement: React.FC = () => {
  const { userData } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<PhaseApproval[]>([]);
  const [phases, setPhases] = useState<Map<string, Phase>>(new Map());
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [approvalsData, phasesData, usersData] = await Promise.all([
        PhaseApprovalService.getAllPendingApprovals(),
        PhaseService.getAllPhases(),
        FirestoreService.getAll<User>(COLLECTIONS.USERS)
      ]);

      setPendingApprovals(approvalsData);
      
      // Create maps for quick lookup
      const phaseMap = new Map<string, Phase>(phasesData.map((p: Phase) => [p.id, p]));
      const userMap = new Map<string, User>(usersData.map((u: User) => [u.id, u]));
      
      setPhases(phaseMap);
      setUsers(userMap);
    } catch (error) {
      console.error('Error loading approval data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string, approverId: string) => {
    try {
      setProcessingId(approvalId);
      await PhaseApprovalService.approvePhaseTransition(approvalId, approverId);
      await loadData(); // Reload data
    } catch (error) {
      console.error('Error approving phase transition:', error);
      alert('Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (approvalId: string, approverId: string) => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingId(approvalId);
      await PhaseApprovalService.rejectPhaseTransition(
        approvalId,
        approverId,
        rejectionReason
      );
      setRejectingId(null);
      setRejectionReason('');
      await loadData(); // Reload data
    } catch (error) {
      console.error('Error rejecting phase transition:', error);
      alert('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading approval requests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="h-6 w-6 text-blue-600" />
            Phase Approval Requests
          </h2>
          <p className="text-muted-foreground">
            Review and approve student requests to access next phases
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          <Clock className="h-4 w-4" />
          {pendingApprovals.length} Pending
        </div>
      </div>

      {pendingApprovals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">All caught up!</h3>
          <p className="text-muted-foreground">
            No pending phase approval requests at the moment.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {pendingApprovals.map((approval) => {
            const student = users.get(approval.student_id);
            const currentPhase = phases.get(approval.current_phase_id);
            const nextPhase = phases.get(approval.next_phase_id);
            const isProcessing = processingId === approval.id;
            const isRejecting = rejectingId === approval.id;

            return (
              <div
                key={approval.id}
                className="bg-white rounded-lg shadow-md border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {student?.name || 'Unknown Student'}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Current Phase:</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {currentPhase?.name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Requesting:</span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                          {nextPhase?.name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>
                          Requested: {new Date(approval.requested_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {!isRejecting ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(approval.id, userData?.id || '')}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-4 w-4" />
                      {isProcessing ? 'Processing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => setRejectingId(approval.id)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                      disabled={isProcessing}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reason for Rejection
                        </label>
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          rows={3}
                          placeholder="Explain why this request is being rejected..."
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setRejectionReason('');
                        }}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleReject(approval.id, userData?.id || '')}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:bg-gray-400"
                        disabled={isProcessing || !rejectionReason.trim()}
                      >
                        {isProcessing ? 'Processing...' : 'Confirm Rejection'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PhaseApprovalManagement;
