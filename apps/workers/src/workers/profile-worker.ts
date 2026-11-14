import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, ProfileFetchJobData } from '@instance/types';
import { prisma } from '@instance/db';
import { createRedisConnection } from '../config/redis';
import { instagramApiService } from '../services/instagram-api.service';

/**
 * Worker Processor: Instagram Profile Fetch & Lead Enrichment (`FETCH_PROFILE`)
 *
 * Responsibilities:
 * - Asynchronously fetches public profile data (username, follower counts, bio, profile picture)
 *   from Meta Graph API whenever a new lead or follower interacts with an automation.
 * - Upserts the enriched lead into `InstagramUserProfile` for CRM contact management.
 * - Operates in Lane 2 (isolated media/background queue) so heavy profile fetches do not delay
 *   real-time DM and comment interactions.
 */
export async function processProfileFetchJob(job: Job<ProfileFetchJobData>): Promise<any> {
  const { instagramAccountId, userId, interactionType, automationId } = job.data;
  console.log(`[ProfileWorker] Processing job ${job.id} for user ${userId} on account ${instagramAccountId}`);

  // 1. Fetch Instagram account credentials
  const account = await prisma.instagramAccount.findUnique({
    where: { id: instagramAccountId },
  });

  if (!account || !account.isActive) {
    const errorMsg = `Instagram account ${instagramAccountId} not found or inactive`;
    console.warn(`[ProfileWorker] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // 2. Fetch user profile from Meta Graph API (throws on API error for retry)
  const profile = await instagramApiService.fetchUserProfile(account.accessToken, userId);
  if (!profile) {
    console.warn(`[ProfileWorker] Could not fetch profile for user ${userId} from Graph API`);
    return { success: false, reason: 'Profile fetch failed or empty response' };
  }

  // 3. Upsert user profile into database
  const profileRecord = await prisma.instagramUserProfile.upsert({
    where: {
      instagramAccountId_instagramUserId: {
        instagramAccountId,
        instagramUserId: userId,
      },
    },
    update: {
      username: profile.username || undefined,
      fullName: profile.name || undefined,
      profilePictureUrl: profile.profile_pic || undefined,
      biography: profile.biography || undefined,
      website: profile.website || undefined,
      followersCount: profile.followers_count ?? undefined,
      followingCount: profile.follows_count ?? undefined,
      mediaCount: profile.media_count ?? undefined,
      isVerified: profile.is_verified ?? undefined,
      isBusinessAccount: profile.is_business_account ?? undefined,
      lastProfileFetchAt: new Date(),
    },
    create: {
      instagramAccountId,
      instagramUserId: userId,
      username: profile.username || null,
      fullName: profile.name || null,
      profilePictureUrl: profile.profile_pic || null,
      biography: profile.biography || null,
      website: profile.website || null,
      followersCount: typeof profile.followers_count === 'number' ? profile.followers_count : null,
      followingCount: typeof profile.follows_count === 'number' ? profile.follows_count : null,
      mediaCount: typeof profile.media_count === 'number' ? profile.media_count : null,
      isVerified: profile.is_verified || false,
      isBusinessAccount: profile.is_business_account || false,
      firstInteractionType: interactionType || 'DM',
      firstInteractionAt: new Date(),
      lastProfileFetchAt: new Date(),
    },
  });


  // 5. Update Instagram Account Health counters
  await prisma.instagramAccountHealth.upsert({
    where: { instagramAccountId },
    update: {
      apiCallsThisHour: { increment: 1 },
      apiCallsToday: { increment: 1 },
      lastApiCallAt: new Date(),
    },
    create: {
      instagramAccountId,
      apiCallsThisHour: 1,
      apiCallsToday: 1,
      lastApiCallAt: new Date(),
    },
  });

  console.log(`[ProfileWorker] Successfully fetched and stored profile for user ${userId}`);
  return {
    success: true,
    profileId: profileRecord.id,
  };
}

/**
 * Instantiate and start the Profile Worker
 */
export function createProfileWorker(): Worker<ProfileFetchJobData> {
  const connection = createRedisConnection();

  const worker = new Worker<ProfileFetchJobData>(
    QUEUE_NAMES.PROFILE_FETCH,
    processProfileFetchJob,
    {
      connection,
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    console.log(`[ProfileWorker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[ProfileWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
