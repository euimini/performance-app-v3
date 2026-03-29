export type SessionLog = {
  date: string;
  sessionTemplateId: string;
  completed: boolean;
  intensity: "정상" | "가볍게" | "회복";
};
