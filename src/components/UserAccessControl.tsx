import React, { useState } from 'react';
import { Users, Plus, X, Shield, Eye } from 'lucide-react';

interface Props {
  authorizedUsers: string[];
  readonlyUsers: string[];
  onUpdateAccess: (editors: string[], viewers: string[]) => Promise<void>;
}

export default function UserAccessControl({ authorizedUsers, readonlyUsers, onUpdateAccess }: Props) {
  const [newEmail, setNewEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('editor');

  const handleAddUser = () => {
    if (!newEmail) return;
    const emailTrim = newEmail.trim().toLowerCase();
    if (!emailTrim) return;

    if (role === 'editor') {
      if (!authorizedUsers.includes(emailTrim)) {
        const filteredViewers = readonlyUsers.filter(e => e !== emailTrim);
        onUpdateAccess([...authorizedUsers, emailTrim], filteredViewers);
      }
    } else {
      if (!readonlyUsers.includes(emailTrim)) {
        const filteredEditors = authorizedUsers.filter(e => e !== emailTrim);
        onUpdateAccess(filteredEditors, [...readonlyUsers, emailTrim]);
      }
    }
    setNewEmail('');
  };

  const handleRemoveEditor = (emailToRemove: string) => {
    onUpdateAccess(
      authorizedUsers.filter(email => email !== emailToRemove),
      readonlyUsers
    );
  };

  const handleRemoveViewer = (emailToRemove: string) => {
    onUpdateAccess(
      authorizedUsers,
      readonlyUsers.filter(email => email !== emailToRemove)
    );
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="flex gap-2">
        <input
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="E-mail do usuário"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          translate="no"
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-amber-500"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
          className="px-2 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-amber-500 cursor-pointer"
        >
          <option value="editor">Editor (Gravação)</option>
          <option value="viewer">Leitor (Visualização)</option>
        </select>
        <button
          onClick={handleAddUser}
          className="px-3.5 py-2 bg-amber-500 text-slate-900 rounded-lg text-xs font-bold hover:bg-amber-400 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2 shadow-2xs">
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-amber-600">
            <Shield className="w-3 h-3" />
            Editores ({authorizedUsers.length})
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {authorizedUsers.length === 0 ? (
              <p className="text-slate-400 italic py-1">Nenhum editor cadastrado.</p>
            ) : (
              authorizedUsers.map(email => (
                <div key={email} className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                  <span className="truncate max-w-[150px]">{email}</span>
                  <button onClick={() => handleRemoveEditor(email)} className="text-slate-450 hover:text-rose-500 p-0.5 transition cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2 shadow-2xs">
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-indigo-600">
            <Eye className="w-3 h-3" />
            Leitores ({readonlyUsers.length})
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {readonlyUsers.length === 0 ? (
              <p className="text-slate-400 italic py-1">Nenhum leitor cadastrado.</p>
            ) : (
              readonlyUsers.map(email => (
                <div key={email} className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-100">
                  <span className="truncate max-w-[150px]">{email}</span>
                  <button onClick={() => handleRemoveViewer(email)} className="text-slate-450 hover:text-rose-500 p-0.5 transition cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
