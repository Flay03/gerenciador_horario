

import React from 'react';
import { useData } from '../context/DataContext';
import { stringToColor } from '../utils/color';
import { auth } from '../firebaseConfig';

const UserPresence: React.FC = () => {
  const { state } = useData();
  const { onlineUsers } = state;

  if (onlineUsers.length === 0) {
    return null;
  }

  // Get the current user to display their avatar last (on top)
  const currentUser = auth.currentUser;
  
  const sortedUsers = [...onlineUsers].sort((a, b) => {
    if (a.id === currentUser?.uid) return 1;
    if (b.id === currentUser?.uid) return -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex items-center -space-x-2 pr-2">
      {sortedUsers.map(user => (
        <div 
          key={user.id}
          className="group relative"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ring-2 ring-white"
            style={{ backgroundColor: stringToColor(user.id) }}
          >
            {user.id === currentUser?.uid ? 'VC' : user.name.charAt(0).toUpperCase()}
          </div>
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            {user.id === currentUser?.uid ? `${user.name} (Você)` : user.name}
            <svg className="absolute text-gray-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
              <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UserPresence;