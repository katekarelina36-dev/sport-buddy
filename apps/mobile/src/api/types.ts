export type SkillLevel = "beginner" | "intermediate" | "advanced";

export interface UserProfile {
  displayName: string;
  photoUrl: string | null;
  bio: string | null;
  level: SkillLevel;
  successfulTrainingsCount: number;
  onboardingCompletedAt: string | null;
}

export interface UserActivity {
  activityId: string;
  level: SkillLevel;
  isPreferred: boolean;
  activity: Activity;
}

export interface FullProfile {
  id: string;
  email: string;
  profile: UserProfile | null;
  permissions: { locationGranted: boolean; calendarGranted: boolean; pushGranted: boolean } | null;
  activities: UserActivity[];
  availability: AvailabilitySlot[];
  communityMembers: { community: { id: string; name: string; iconUrl: string | null } }[];
}

export interface Activity {
  id: string;
  name: string;
  iconUrl: string | null;
  category: string | null;
}

export interface AvailabilitySlot {
  id?: string;
  dayOfWeek?: number;
  date?: string;
  startTime: string;
  endTime: string;
  recurring: boolean;
}

export interface ActivityPostSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isFilled: boolean;
}

export interface ActivityPost {
  id: string;
  activityId: string;
  level: SkillLevel;
  status: "active" | "inactive";
  createdAt: string;
  author: { id: string; profile: UserProfile | null };
  activity?: Activity;
  slots: ActivityPostSlot[];
}

export interface ActivityRequest {
  id: string;
  postId: string;
  slotId: string;
  status: "pending" | "approved" | "rejected";
  requester: { id: string; profile: UserProfile | null };
  slot: ActivityPostSlot;
  activity: Activity;
  post: ActivityPost;
  // Only present on entries returned by GET /activity-requests/sent, and only
  // once approved — the chat the approval created/reopened.
  chatId?: string | null;
}

export interface ChatSummary {
  id: string;
  userA: { id: string; profile: UserProfile | null };
  userB: { id: string; profile: UserProfile | null };
  activity: Activity;
  isClosed: boolean;
  messages: Message[];
  unreadCount: number;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string | null;
  body: string;
  type: "text" | "system" | "template";
  createdAt: string;
}

export interface TrainingSession {
  id: string;
  chatId: string;
  hostId: string;
  participantId: string;
  activityId: string;
  scheduledAt: string;
  locationText: string | null;
  status: "scheduled" | "completed" | "cancelled";
  calendarSyncStatus: "pending" | "synced" | "failed";
  isRecurring: boolean;
  completedByUserA: boolean;
  completedByUserB: boolean;
}
