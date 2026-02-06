
export interface User {
  id: string;
  name: string;
  avatar: string;
  points: number; // Elo Rating, default 1000
  rankFrame?: string; // 'none' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'ruby' | 'god'
  password?: string;
}

export interface BillItem {
  userId: string;
  durationMinutes: number;
  amount: number;
}

export interface FinalBill {
  totalCourtPrice: number;
  totalShuttlePrice: number;
  shuttlesUsed: number;
  pricePerShuttle: number;
  totalCost: number;
  splitMode?: 'EQUAL' | 'MATCHES';
  items: BillItem[];
}

export interface MatchResult {
  id: string;
  timestamp: string;
  team1Ids: string[];
  team2Ids: string[];
  winningTeamIndex: 1 | 2;
  pointsChange: number;
}

export interface Session {
  id: string;
  title?: string;
  location: string;
  startTime: string; // ISO String
  endTime: string; // ISO String
  courtCount: number;
  maxPlayers: number; // Calculated as courtCount * 6
  price?: number;
  hostId: string;
  playerIds: string[];
  // Live Session State
  started?: boolean; // Indicates if the session has been manually started by host
  checkedInPlayerIds?: string[]; // List of IDs present at venue
  checkInTimes?: Record<string, string>; // Map userId -> ISO timestamp
  courtAssignments?: Record<number, string[]>; // Map court index (0,1..) to player IDs
  matchStartTimes?: Record<number, string>; // Map court index to ISO Start Time string
  matches?: MatchResult[]; // History of matches played
  // Financials
  finalBill?: FinalBill;
}

export interface CreateSessionDTO {
  title: string;
  location: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  courtCount: number;
}
