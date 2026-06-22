export interface Obra {
  id: string;
  name: string;
  contractNumber: string;
  startDate: string; // Keep as required, can match physicalStartDate or fallback
  deadlineDate: string; // Keep as required, can match execution deadline or fallback
  activeContractDate: string; // Keep as required, can match activeContractDate or fallback
  progress: number;
  contractorName: string;
  biddedValue: number;
  status: "planejamento" | "em_andamento" | "paralisada" | "concluida";
  
  // New specific fields requested in form example
  biddingNumber?: string;
  adminProcess?: string;
  termDaysVigencia?: string;
  termDaysExecucao?: string;
  signingDate?: string;
  publicationDateJom?: string;
  physicalStartDate?: string;
  startOrderDate?: string;
  additives?: ContractAdditive[];
  timelineImage?: string; // Image for construction chronology
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
  coverImage?: string; // Image for page 2 cover of the week
  progressImages?: string[]; // Array of 4 images for page 5 weekly photos
}

export interface ContractAdditive {
  id: string;
  number: string;
  type: "financeiro" | "prazo" | "misto";
  value?: number;
  days?: number;
  description: string;
  signatureDate: string;
  newVigenciaDate?: string;
  newExecucaoDate?: string;
  daysVigencia?: number;
  daysExecucao?: number;
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
