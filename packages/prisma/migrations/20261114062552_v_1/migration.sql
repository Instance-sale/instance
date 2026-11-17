-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER');

-- CreateEnum
CREATE TYPE "AutomationTriggerType" AS ENUM ('DM_RECEIVED', 'DM_KEYWORD', 'COMMENT_POST', 'COMMENT_REEL', 'STORY_MENTION', 'STORY_REPLY', 'NEW_FOLLOWER');

-- CreateEnum
CREATE TYPE "AutomationNodeType" AS ENUM ('TRIGGER_DM', 'TRIGGER_COMMENT', 'TRIGGER_STORY', 'TRIGGER_FOLLOWER', 'ACTION_SEND_DM', 'ACTION_REPLY_DM', 'ACTION_REPLY_COMMENT', 'ACTION_WAIT', 'ACTION_WAIT_FOR_REPLY', 'ACTION_CONDITION', 'ACTION_SET_VARIABLE', 'FLOW_SPLIT', 'FLOW_RANDOM', 'FLOW_END');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AccountHealthStatus" AS ENUM ('HEALTHY', 'WARNING', 'THROTTLED', 'RESTRICTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "QueueJobType" AS ENUM ('FETCH_PROFILE', 'SEND_DM', 'REPLY_COMMENT', 'SEND_MEDIA');

-- CreateEnum
CREATE TYPE "QueueJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'DELAYED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('MILESTONE', 'STORY_MENTION', 'QUALIFIED_LEAD', 'AUTOMATION_ALERT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ApiErrorType" AS ENUM ('RATE_LIMIT', 'PERMISSION', 'NOT_FOUND', 'VALIDATION', 'RESTRICTION', 'NETWORK', 'UNKNOWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "dashboardKey" TEXT NOT NULL,
    "instagramHandle" TEXT,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT,
    "ownerRole" TEXT,
    "numberOfEmployees" INTEGER,
    "websiteUrl" TEXT,
    "companyEmail" TEXT,
    "companyImage" TEXT,
    "companyDescription" TEXT,
    "customStatuses" JSONB,
    "customTags" JSONB,
    "setupComplete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "InstagramAccount" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "profilePictureUrl" TEXT,
    "followersCount" INTEGER,
    "webhookUserId" TEXT,
    "facebookPageId" TEXT,
    "accountType" TEXT,
    "accessToken" TEXT NOT NULL,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "icebreakers" JSONB,

    CONSTRAINT "InstagramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramAccountHealth" (
    "id" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "apiCallsThisHour" INTEGER NOT NULL DEFAULT 0,
    "apiCallsToday" INTEGER NOT NULL DEFAULT 0,
    "messagesThisHour" INTEGER NOT NULL DEFAULT 0,
    "messagesToday" INTEGER NOT NULL DEFAULT 0,
    "lastApiCallAt" TIMESTAMP(3),
    "hourlyResetAt" TIMESTAMP(3),
    "dailyResetAt" TIMESTAMP(3),
    "status" "AccountHealthStatus" NOT NULL DEFAULT 'HEALTHY',
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "pausedReason" TEXT,
    "pausedAt" TIMESTAMP(3),
    "resumeAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "consecutiveErrors" INTEGER NOT NULL DEFAULT 0,
    "lastRestrictionAt" TIMESTAMP(3),
    "restrictionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramAccountHealth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueJob" (
    "id" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "jobType" "QueueJobType" NOT NULL,
    "jobId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "status" "QueueJobStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "result" JSONB,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueueJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiErrorLog" (
    "id" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "errorCode" TEXT NOT NULL,
    "errorType" "ApiErrorType" NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestPayload" JSONB,
    "responseBody" JSONB,
    "automationId" TEXT,
    "userId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramUserProfile" (
    "id" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "username" TEXT,
    "fullName" TEXT,
    "profilePictureUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "biography" TEXT,
    "website" TEXT,
    "externalUrl" TEXT,
    "followersCount" INTEGER,
    "followingCount" INTEGER,
    "mediaCount" INTEGER,
    "isFollowingBusiness" BOOLEAN,
    "isBusinessFollowing" BOOLEAN,
    "isVerified" BOOLEAN,
    "isBusinessAccount" BOOLEAN,
    "isBrandedContentCreator" BOOLEAN,
    "accountType" TEXT,
    "category" TEXT,
    "status" TEXT,
    "tags" JSONB,
    "firstInteractionType" TEXT,
    "firstInteractionAt" TIMESTAMP(3),
    "lastProfileFetchAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramUserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactCapture" (
    "id" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "username" TEXT,
    "emails" JSONB,
    "phoneNumbers" JSONB,
    "targetAudienceListId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactCapture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceList" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AudienceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AudienceListMember" (
    "id" TEXT NOT NULL,
    "audienceListId" TEXT NOT NULL,
    "contactCaptureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AudienceListMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "instagramAccountId" TEXT,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationFolder" (
    "id" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "triggerType" "AutomationTriggerType" NOT NULL,
    "mediaId" TEXT,
    "mediaType" TEXT,
    "triggerKeywords" TEXT[],
    "triggerMatchType" TEXT,
    "flowData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationNode" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" "AutomationNodeType" NOT NULL,
    "position" JSONB NOT NULL,
    "config" JSONB NOT NULL,
    "nextNodeIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationExecution" (
    "id" TEXT NOT NULL,
    "automationId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "currentNodeId" TEXT,
    "variables" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AutomationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionStep" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryMention" (
    "id" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "instagramUserId" TEXT NOT NULL,
    "username" TEXT,
    "followerCount" INTEGER,
    "mediaUrl" TEXT,
    "storyExpiresAt" TIMESTAMP(3),
    "repostStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "dynamicPromoCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryMention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_companyId_key" ON "Company"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_dashboardKey_key" ON "Company"("dashboardKey");

-- CreateIndex
CREATE INDEX "Company_companyId_idx" ON "Company"("companyId");

-- CreateIndex
CREATE INDEX "Company_ownerId_idx" ON "Company"("ownerId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_instagramUserId_key" ON "InstagramAccount"("instagramUserId");

-- CreateIndex
CREATE INDEX "InstagramAccount_companyId_idx" ON "InstagramAccount"("companyId");

-- CreateIndex
CREATE INDEX "InstagramAccount_instagramUserId_idx" ON "InstagramAccount"("instagramUserId");

-- CreateIndex
CREATE INDEX "InstagramAccount_webhookUserId_idx" ON "InstagramAccount"("webhookUserId");

-- CreateIndex
CREATE INDEX "InstagramAccount_facebookPageId_idx" ON "InstagramAccount"("facebookPageId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccountHealth_instagramAccountId_key" ON "InstagramAccountHealth"("instagramAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "QueueJob_jobId_key" ON "QueueJob"("jobId");

-- CreateIndex
CREATE INDEX "QueueJob_instagramAccountId_idx" ON "QueueJob"("instagramAccountId");

-- CreateIndex
CREATE INDEX "QueueJob_status_idx" ON "QueueJob"("status");

-- CreateIndex
CREATE INDEX "QueueJob_jobType_idx" ON "QueueJob"("jobType");

-- CreateIndex
CREATE INDEX "ApiErrorLog_instagramAccountId_idx" ON "ApiErrorLog"("instagramAccountId");

-- CreateIndex
CREATE INDEX "ApiErrorLog_errorCode_idx" ON "ApiErrorLog"("errorCode");

-- CreateIndex
CREATE INDEX "ApiErrorLog_occurredAt_idx" ON "ApiErrorLog"("occurredAt");

-- CreateIndex
CREATE INDEX "InstagramUserProfile_instagramAccountId_idx" ON "InstagramUserProfile"("instagramAccountId");

-- CreateIndex
CREATE INDEX "InstagramUserProfile_instagramUserId_idx" ON "InstagramUserProfile"("instagramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramUserProfile_instagramAccountId_instagramUserId_key" ON "InstagramUserProfile"("instagramAccountId", "instagramUserId");

-- CreateIndex
CREATE INDEX "ContactCapture_instagramAccountId_idx" ON "ContactCapture"("instagramAccountId");

-- CreateIndex
CREATE INDEX "ContactCapture_instagramUserId_idx" ON "ContactCapture"("instagramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactCapture_instagramAccountId_instagramUserId_key" ON "ContactCapture"("instagramAccountId", "instagramUserId");

-- CreateIndex
CREATE INDEX "AudienceList_companyId_idx" ON "AudienceList"("companyId");

-- CreateIndex
CREATE INDEX "AudienceList_isPinned_pinnedOrder_idx" ON "AudienceList"("isPinned", "pinnedOrder");

-- CreateIndex
CREATE INDEX "AudienceListMember_audienceListId_idx" ON "AudienceListMember"("audienceListId");

-- CreateIndex
CREATE INDEX "AudienceListMember_contactCaptureId_idx" ON "AudienceListMember"("contactCaptureId");

-- CreateIndex
CREATE UNIQUE INDEX "AudienceListMember_audienceListId_contactCaptureId_key" ON "AudienceListMember"("audienceListId", "contactCaptureId");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_runAfter_priority_idx" ON "BackgroundJob"("status", "runAfter", "priority");

-- CreateIndex
CREATE INDEX "BackgroundJob_instagramAccountId_status_idx" ON "BackgroundJob"("instagramAccountId", "status");

-- CreateIndex
CREATE INDEX "BackgroundJob_jobType_status_idx" ON "BackgroundJob"("jobType", "status");

-- CreateIndex
CREATE INDEX "BackgroundJob_lockedAt_idx" ON "BackgroundJob"("lockedAt");

-- CreateIndex
CREATE INDEX "AutomationFolder_instagramAccountId_idx" ON "AutomationFolder"("instagramAccountId");

-- CreateIndex
CREATE INDEX "AutomationFolder_parentId_idx" ON "AutomationFolder"("parentId");

-- CreateIndex
CREATE INDEX "Automation_folderId_idx" ON "Automation"("folderId");

-- CreateIndex
CREATE INDEX "Automation_triggerType_idx" ON "Automation"("triggerType");

-- CreateIndex
CREATE INDEX "AutomationNode_automationId_idx" ON "AutomationNode"("automationId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationNode_automationId_nodeId_key" ON "AutomationNode"("automationId", "nodeId");

-- CreateIndex
CREATE INDEX "AutomationExecution_automationId_idx" ON "AutomationExecution"("automationId");

-- CreateIndex
CREATE INDEX "AutomationExecution_instagramUserId_idx" ON "AutomationExecution"("instagramUserId");

-- CreateIndex
CREATE INDEX "ExecutionStep_executionId_idx" ON "ExecutionStep"("executionId");

-- CreateIndex
CREATE INDEX "StoryMention_instagramAccountId_idx" ON "StoryMention"("instagramAccountId");

-- CreateIndex
CREATE INDEX "StoryMention_instagramUserId_idx" ON "StoryMention"("instagramUserId");

-- CreateIndex
CREATE INDEX "StoryMention_repostStatus_idx" ON "StoryMention"("repostStatus");

-- CreateIndex
CREATE INDEX "Notification_companyId_isRead_idx" ON "Notification"("companyId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_companyId_createdAt_idx" ON "Notification"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAccount" ADD CONSTRAINT "InstagramAccount_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramAccountHealth" ADD CONSTRAINT "InstagramAccountHealth_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueJob" ADD CONSTRAINT "QueueJob_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiErrorLog" ADD CONSTRAINT "ApiErrorLog_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramUserProfile" ADD CONSTRAINT "InstagramUserProfile_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceList" ADD CONSTRAINT "AudienceList_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceListMember" ADD CONSTRAINT "AudienceListMember_audienceListId_fkey" FOREIGN KEY ("audienceListId") REFERENCES "AudienceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AudienceListMember" ADD CONSTRAINT "AudienceListMember_contactCaptureId_fkey" FOREIGN KEY ("contactCaptureId") REFERENCES "ContactCapture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationFolder" ADD CONSTRAINT "AutomationFolder_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationFolder" ADD CONSTRAINT "AutomationFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AutomationFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "AutomationFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationNode" ADD CONSTRAINT "AutomationNode_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecution" ADD CONSTRAINT "AutomationExecution_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionStep" ADD CONSTRAINT "ExecutionStep_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "AutomationExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryMention" ADD CONSTRAINT "StoryMention_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
