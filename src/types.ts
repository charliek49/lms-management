export type Permission =
  | "dashboard"
  | "guests"
  | "rooms"
  | "services"
  | "staff"
  | "expenses"
  | "housekeeping"
  | "billing"
  | "accounting"
  | "inventory"
  | "analytics"
  | "safety"
  | "users";

export type UserRole = "admin" | "parent-admin";

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  permissions: Permission[];
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  idProof: string;
  roomPreference: string;
  serviceTiming: string;
  returning: boolean;
  emergencyContact: string;
  status: "checked-in" | "reserved" | "checked-out";
  roomId?: string;
}

export interface Room {
  id: string;
  number: string;
  type: string;
  price: number;
  status: "occupied" | "vacant" | "reserved" | "blocked";
  lastGuest: string;
}

export interface ServiceItem {
  day: string;
  breakfast: string;
  tea: string;
  timing: string;
  billAmount: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  shift: string;
  attendance: "Present" | "Absent" | "Late";
  task: string;
}

export interface ExpenseItem {
  id: string;
  label: string;
  category: string;
  amount: number;
  date: string;
}

export interface HousekeepingItem {
  roomNumber: string;
  status: "cleaned" | "pending" | "in-progress";
  laundry: string;
  note: string;
}

export interface Invoice {
  id: string;
  guestName: string;
  amount: number;
  tax: number;
  paymentMode: string;
  status: "Paid" | "Pending";
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  minimum: number;
  unit: string;
}

export interface SafetyItem {
  id: string;
  title: string;
  owner: string;
  status: "Done" | "Due" | "Urgent";
}

export interface AppState {
  users: User[];
  guests: Guest[];
  rooms: Room[];
  services: ServiceItem[];
  staff: StaffMember[];
  expenses: ExpenseItem[];
  housekeeping: HousekeepingItem[];
  invoices: Invoice[];
  inventory: InventoryItem[];
  safety: SafetyItem[];
}
