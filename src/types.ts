export interface Obra {
  id: string;
  name: string;
  contractNumber: string;
  startDate: string;
  deadlineDate: string;
  activeContractDate: string;
  progress: number;
  contractorName: string;
  biddedValue: number;
  status: "planejamento" | "em_andamento" | "paralisada" | "concluida";
}

export interface UpdateLog {
  id: string;
  workId: string;
  workName: string;
  userName: string;
  userRole: string;
  timestamp: string;
  oldProgress: number;
  newProgress: number;
  notes: string;
}

export interface ContractAdditive {
  id: string;
  number: string;
  type: "financeiro" | "prazo" | "misto";
  value?: number;
  days?: number;
  description: string;
  signatureDate: string;
}

export interface DatabaseState {
  contractName: string;
  supervisorCompany: string;
  contractValue?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  contractAdditives?: ContractAdditive[];
  works: Obra[];
  logs: UpdateLog[];
  supabaseStatus?: {
    connected: boolean;
    tableExists: boolean;
    rlsEnabled?: boolean;
    error: string;
  };
}

export interface UserProfile {
  name: string;
  role: string;
}

export const USER_PROFILES: UserProfile[] = [
  { name: "Supervisão", role: "Supervisor" }
];
