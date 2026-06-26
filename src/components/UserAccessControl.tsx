import React, { useState } from 'react';
import { Users, Plus, X } from 'lucide-react';

interface Props {
  authorizedUsers: string[];
  onUpdateAuthorizedUsers: (users: string[]) => void;
}

export default function UserAccessControl({ authorizedUsers, onUpdateAuthorizedUsers }: Props) {
  const [newEmail, setNewEmail] = useState('');

  const handleAddUser = () => {
    if (newEmail && !authorizedUsers.includes(newEmail)) {
      onUpdateAuthorizedUsers([...authorizedUsers, newEmail]);
      setNewEmail('');
    }
  };

  const handleRemoveUser = (emailToRemove: string) => {
    onUpdateAuthorizedUsers(authorizedUsers.filter(email => email !== emailToRemove));
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-3">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <Users className="w-4 h-4 text-amber-500" />
        Usuários com Acesso
      </h3>
      <div className="flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="E-mail do usuário"
          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
        />
        <button
          onClick={handleAddUser}
          className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-400"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-1">
        {authorizedUsers.map(email => (
          <div key={email} className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
            {email}
            <button onClick={() => handleRemoveUser(email)} className="text-slate-400 hover:text-red-500">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
