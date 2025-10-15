import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { FirestoreService } from '../../services/firestore';
import { COLLECTIONS } from '../../services/firestore';

interface UserSelectorProps {
  onUserSelect: (userId: string) => void;
  currentUserId?: string;
  campusFilter?: string;
}

export const UserSelector: React.FC<UserSelectorProps> = ({ onUserSelect, currentUserId, campusFilter }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        let allUsers: User[];
        
        if (campusFilter && campusFilter !== 'All') {
          allUsers = await FirestoreService.getWhere<User>(
            COLLECTIONS.USERS,
            'campus',
            '==',
            campusFilter
          );
        } else {
          allUsers = await FirestoreService.getAll<User>(COLLECTIONS.USERS);
        }
        // Sort users by name for better UX
        const sortedUsers = allUsers.sort((a, b) => 
          (a.display_name || a.name || '').localeCompare(b.display_name || b.name || '')
        );
        setUsers(sortedUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [campusFilter]);

  return (
    <div className="mb-4">
      <select
        className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        onChange={(e) => onUserSelect(e.target.value)}
        value={currentUserId}
        disabled={loading}
      >
        {loading ? (
          <option>Loading users...</option>
        ) : (
          <>
            <option value="">Select a user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.display_name || user.name || user.email || 'Unnamed User'}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
};