export interface UserProfile {
  userId: string;
  timezone: string;
  locale: string;
  bio: string;
  updatedAt: number;
}

export interface UserProfilePatch {
  name?: string;
  timezone?: string;
  locale?: string;
  bio?: string;
}

export interface UserProfileWithUser extends UserProfile {
  name: string;
  email: string;
}
