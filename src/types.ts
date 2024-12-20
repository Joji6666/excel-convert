// 데이터 타입 정의
export interface WorkerData {
  name: string;
  job: string;
  id: string;
  address: string;
  workDays: number[];
}

export interface PersonalInfo {
  name: string;
  unitPrice: string;
  phone: string;
  id: string;
  bankNumber: string;
  code: string;
  firstWorkingDay: string;
}

export interface WorkerInfo {
  name: string;
  job: string;
  id: string;
  address: string;
  workDays: number[];
  unitPrice: string;
  phone: string;
  bankNumber: string;
  code: string;
  firstWorkingDay: string;
}
