export type SkillLevel = "beginner" | "intermediate" | "advanced" | "pro";

export interface UserProfile {
  displayName: string;
  city: string | null;
  dateOfBirth: string | null;
  photoUrl: string | null;
  bio: string | null;
  completedTrainingsCount: number;
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
  communityMembers: CommunityMembership[];
}

export type CommunityRoleName = "organiser" | "assistant" | "member";

export interface CommunityMembership {
  role: CommunityRoleName;
  community: { id: string; name: string; photoUrl: string | null; activity: Activity };
}

export interface Activity {
  id: string;
  name: string;
  iconUrl: string | null;
  category: string | null;
}

export interface AvailabilitySlot {
  id?: string;
  activityId?: string | null;
  dayOfWeek?: number;
  date?: string;
  startTime: string;
  endTime: string;
  recurring: boolean;
}

// F3/F4: a user discoverable via the "Explore Activities" feed for one sport.
export interface PublicUser {
  id: string;
  profile: UserProfile | null;
  activities: UserActivity[];
  availability: AvailabilitySlot[];
  communityMembers: CommunityMembership[];
  alreadyRequested?: boolean;
}

export interface DiscoverEntry {
  user: PublicUser;
  primaryActivity: UserActivity & { id: string };
  alreadyRequested: boolean;
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
  postId: string | null;
  slotId: string | null;
  targetUserId: string | null;
  status: "pending" | "approved" | "rejected";
  requester: { id: string; profile: UserProfile | null };
  slot: ActivityPostSlot | null;
  activity: Activity;
  post: ActivityPost | null;
  // Only present on entries returned by GET /activity-requests/sent — the
  // direct-flow recipient, when this request has no post (targetUserId set).
  targetUser?: { id: string; profile: UserProfile | null } | null;
  // Only present on entries returned by GET /activity-requests/sent, and only
  // once approved — the chat the approval created/reopened.
  chatId?: string | null;
}

// Bug fix batch 3, section 1: a chat can now carry multiple sports (one chat
// per user pair, no matter how many sports they've matched on).
export interface ChatSport {
  activityId: string;
  activity: Activity;
}

export interface ChatSummary {
  id: string;
  userA: { id: string; profile: UserProfile | null };
  userB: { id: string; profile: UserProfile | null };
  sports: ChatSport[];
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
  // Only set on the F13 challenge-card message — the Event it was sent for.
  trainingId?: string | null;
}

export interface TrainingSession {
  id: string;
  chatId: string;
  hostId: string;
  participantId: string;
  activityId: string;
  activity?: Activity;
  scheduledAt: string;
  locationText: string | null;
  status: "scheduled" | "completed" | "cancelled";
  calendarSyncStatus: "pending" | "synced" | "failed";
  isRecurring: boolean;
  completedByUserA: boolean;
  completedByUserB: boolean;
  wouldPlayAgainA: boolean | null;
  wouldPlayAgainB: boolean | null;
  // Bug fix batch 3, section 4: full Q1/Q2 sheet vs. simple confirm.
  isFirstBetweenUsers: boolean;
}

// ------------------------------------------------------------------
// Communities
// ------------------------------------------------------------------

export interface CommunitySummary {
  id: string;
  name: string;
  photoUrl: string | null;
  description: string | null;
  activityId: string;
  activity: Activity;
  creatorId: string;
  memberCount: number;
  myRole: CommunityRoleName | null;
  joinRequestPending: boolean;
  createdAt: string;
}

export interface CommunityMemberRow {
  communityId: string;
  userId: string;
  role: CommunityRoleName;
  joinedAt: string;
  user: { id: string; profile: UserProfile | null };
}

export interface CommunityJoinRequest {
  id: string;
  communityId: string;
  requesterId: string;
  status: "pending" | "approved" | "declined";
  createdAt: string;
  requester: { id: string; profile: UserProfile | null };
}

export interface ClubEventRsvp {
  eventId: string;
  userId: string;
  status: "going" | "not_going";
  user: { id: string; profile: UserProfile | null };
}

export interface ClubEvent {
  id: string;
  communityId: string;
  createdBy: string;
  title: string;
  scheduledAt: string;
  locationText: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  maxParticipants: number | null;
  status: "upcoming" | "completed" | "cancelled";
  rsvps: ClubEventRsvp[];
}

export interface CommunityPost {
  id: string;
  communityId: string;
  authorId: string;
  body: string;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; profile: UserProfile | null };
}

export interface CommunityMessage {
  id: string;
  communityId: string;
  senderId: string | null;
  body: string;
  type: "text" | "system";
  isPinned: boolean;
  createdAt: string;
  sender: { id: string; profile: UserProfile | null } | null;
}
