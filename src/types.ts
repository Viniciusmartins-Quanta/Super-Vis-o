export interface ContractAdditive {
  id: string;
  number: string;
  type: "financeiro" | "prazo" | "misto";
  value?: number;
  days?: number;
  description: string;
  signatureDate: string;
}

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
  biddingNumber?: string;
  adminProcess?: string;
  termDaysVigencia?: string;
  termDaysExecucao?: string;
  signingDate?: string;
  publicationDateJom?: string;
  physicalStartDate?: string;
  startOrderDate?: string;
  additives?: ContractAdditive[];
  timelineImage?: string;
  order?: number;
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
  coverImage?: string;
  progressImages?: string[];
}

export interface UserProfile {
  name: string;
  role: string;
}

export interface Database {
  contractName: string;
  supervisorCompany: string;
  contractValue?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  contractAdditives?: ContractAdditive[];
  works: Obra[];
  logs: UpdateLog[];
}
