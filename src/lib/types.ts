import type { StudyInput } from "./study-validation";

export type StudyStatus = "draft" | "open" | "closed";

export interface StudyRecord extends StudyInput {
  id: string;
  status: StudyStatus;
  createdAt: string;
  updatedAt: string;
  participantCount?: number;
  completedCount?: number;
}

export type ParticipantStatus = "issued" | "consented" | "in_progress" | "completed" | "declined";

export interface ParticipantAssignmentView {
  id: string;
  position: number;
  chatbotId: string;
  chatbot: StudyInput["chatbots"][number];
  completed: boolean;
}

export interface ParticipantSessionView {
  id: string;
  status: ParticipantStatus;
  locale: StudyInput["locale"];
  title: string;
  description: string;
  consentTitle: string;
  consentBody: string;
  demographicFields: StudyInput["demographicFields"];
  assignments: ParticipantAssignmentView[];
}
