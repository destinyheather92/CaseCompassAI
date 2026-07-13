# Database Schema

## Overview

The CaseCompass AI database stores user accounts, institutional access records, legal research projects, guided intake responses, personalized roadmaps, AI conversations, verified legal sources, saved research, and learning progress.

The schema must support two operating modes:

1. **Individual Mode** — a person creates and manages their own account.
2. **Institutional Mode** — an authorized institutional staff member creates or imports user access and provides each participant with institution-managed login credentials.

Institutional users should not be required to use a personal email address. Facilities may issue a username, participant code, temporary password, PIN, kiosk credential, badge credential, or another approved authentication method.

The database must be designed around these priorities:

1. User privacy and data minimization
2. Secure institution-managed access
3. Separation between user research data and institutional administration
4. Source-backed AI responses
5. Clear relationships between intake, roadmaps, research, and citations
6. Support for future correctional-facility deployments

---

## Recommended Technology

### Database

PostgreSQL

### ORM

Prisma

### Hosting

Neon PostgreSQL, Supabase, or another managed PostgreSQL provider

### Authentication

The authentication system must support both personal and institution-managed accounts.

Possible providers include:

- Clerk
- Auth.js
- Supabase Auth
- A custom institutional identity provider
- Single sign-on for participating institutions
- Facility-issued usernames and temporary passwords
- Kiosk or device-based access for controlled environments

Passwords, PINs, authentication tokens, and credential secrets must be managed by the authentication provider or a secure identity service. They must never be stored as plaintext in the application database.

---

# Core Data Relationships

```text
Institution
│
├── Institutional Staff Members
├── Access Groups
├── Institution-Managed Accounts
├── Devices or Kiosks
└── Aggregated Usage Reports

User
│
├── Authentication Identities
├── Profile
├── Preferences
├── Institution Membership
├── Legal Research Projects
│   ├── Intake Responses
│   ├── Research Roadmaps
│   │   └── Roadmap Steps
│   ├── Documents
│   ├── Notes
│   └── Saved Sources
│
├── AI Conversations
│   └── Messages
│       └── Message Citations
│
├── Saved Items
├── Research Sessions
└── Audit Events
```

---

# Entity Summary

The primary entities are:

- User
- AuthIdentity
- UserProfile
- UserPreference
- Institution
- InstitutionMembership
- InstitutionalStaffProfile
- AccessGroup
- AccessGroupMembership
- InstitutionInvite
- ManagedCredentialRecord
- FacilityDevice
- LegalCase
- IntakeSession
- IntakeResponse
- ResearchRoadmap
- RoadmapStep
- LegalSource
- RoadmapSource
- RoadmapStepSource
- Document
- DocumentAnalysis
- Conversation
- Message
- MessageCitation
- SavedItem
- ResearchNote
- ResearchSession
- AuditLog

---

# Account and Access Model

## Individual Mode

An individual user may:

- Register with an email address or another supported identity provider.
- Manage their own account.
- Create and manage their own research projects.
- Delete or export their data.
- Control their own accessibility and privacy settings.

## Institutional Mode

An authorized staff member may:

- Create an institution-managed account.
- Import multiple participant accounts.
- Assign a participant to an access group.
- Issue or reset temporary credentials.
- Activate, suspend, or deactivate institutional access.
- Assign general educational modules.
- View approved, aggregated engagement data.

Institutional staff must not automatically receive access to:

- The full text of a user's legal questions
- Private AI conversations
- Uploaded legal documents
- Personal research notes
- Saved case-specific research
- The contents of an individualized roadmap

Access to private research content should require a separate, explicit permission model, a valid organizational purpose, and user notice or consent where required.

## Institution-Managed Login Options

The schema should support:

- Facility-issued username and password
- Participant code and PIN
- Temporary password requiring reset
- Staff-generated enrollment code
- Single sign-on
- Kiosk session
- Device-bound access
- Badge or smart-card authentication in future deployments

The application database should store references and status metadata, not raw credential secrets.

---

# Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  USER
  EDUCATOR
  LEGAL_AID
  INSTITUTION_STAFF
  INSTITUTION_ADMIN
  SYSTEM_ADMIN
}

enum AccountType {
  INDIVIDUAL
  INSTITUTION_MANAGED
}

enum AccountStatus {
  PENDING
  ACTIVE
  SUSPENDED
  DEACTIVATED
}

enum AuthIdentityType {
  EMAIL
  GOOGLE
  MICROSOFT
  INSTITUTION_USERNAME
  PARTICIPANT_CODE
  SSO
  KIOSK
  BADGE
}

enum InstitutionType {
  CORRECTIONAL_FACILITY
  DEPARTMENT_OF_CORRECTIONS
  PRISON_EDUCATION_PROGRAM
  LEGAL_AID_ORGANIZATION
  LAW_SCHOOL_CLINIC
  REENTRY_ORGANIZATION
  OTHER
}

enum MembershipRole {
  PARTICIPANT
  EDUCATOR
  STAFF
  ADMIN
}

enum MembershipStatus {
  INVITED
  ACTIVE
  SUSPENDED
  REVOKED
  COMPLETED
}

enum CredentialStatus {
  PENDING_ACTIVATION
  ACTIVE
  RESET_REQUIRED
  LOCKED
  REVOKED
}

enum DeviceType {
  KIOSK
  TABLET
  DESKTOP
  SHARED_TERMINAL
  OTHER
}

enum DeviceStatus {
  ACTIVE
  MAINTENANCE
  DISABLED
}

enum CaseStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum LegalStage {
  PRETRIAL
  TRIAL
  SENTENCING
  DIRECT_APPEAL
  POST_CONVICTION
  HABEAS
  PAROLE
  REENTRY
  UNKNOWN
}

enum IntakeStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

enum RoadmapStatus {
  DRAFT
  GENERATING
  ACTIVE
  COMPLETED
  ARCHIVED
  FAILED
}

enum RoadmapStepStatus {
  LOCKED
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  SKIPPED
}

enum RoadmapStepType {
  OVERVIEW
  LEGAL_CONCEPT
  DEFINITION
  STATUTE
  CASE_LAW
  PROCEDURE
  RESEARCH_TASK
  QUESTION
  RESOURCE
  NEXT_STEP
}

enum SourceType {
  CASE
  STATUTE
  REGULATION
  COURT_RULE
  CONSTITUTION
  GOVERNMENT_GUIDE
  OFFICIAL_WEBSITE
  SECONDARY_SOURCE
}

enum SourceVerificationStatus {
  UNVERIFIED
  VERIFIED
  OUTDATED
  REJECTED
}

enum DocumentType {
  COURT_OPINION
  SENTENCING_ORDER
  MOTION
  BRIEF
  TRANSCRIPT
  DOCKET
  STATUTE
  LETTER
  OTHER
}

enum DocumentStatus {
  UPLOADED
  PROCESSING
  READY
  FAILED
  DELETED
}

enum ConversationType {
  GENERAL_RESEARCH
  ROADMAP_SUPPORT
  TERM_EXPLANATION
  DOCUMENT_EXPLANATION
  CASE_BREAKDOWN
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

enum MessageStatus {
  PENDING
  COMPLETED
  REFUSED
  FAILED
}

enum ConfidenceLevel {
  HIGH
  MEDIUM
  LOW
  UNKNOWN
}

enum SavedItemType {
  ROADMAP
  ROADMAP_STEP
  LEGAL_SOURCE
  MESSAGE
  DOCUMENT
  DEFINITION
}

enum NoteType {
  GENERAL
  CASE
  ROADMAP
  SOURCE
  DOCUMENT
}

enum AuditAction {
  CREATE
  READ
  UPDATE
  DELETE
  LOGIN
  LOGIN_FAILED
  LOGOUT
  EXPORT
  CREDENTIAL_ISSUED
  CREDENTIAL_RESET
  ACCOUNT_SUSPENDED
  ACCOUNT_REACTIVATED
  AI_REQUEST
  AI_RESPONSE
  SAFETY_REFUSAL
}

model User {
  id              String        @id @default(cuid())
  displayName     String?
  accountType     AccountType   @default(INDIVIDUAL)
  role            UserRole      @default(USER)
  accountStatus   AccountStatus @default(PENDING)

  identities      AuthIdentity[]
  profile         UserProfile?
  preferences     UserPreference?
  memberships     InstitutionMembership[]
  staffProfile    InstitutionalStaffProfile?
  cases           LegalCase[]
  conversations   Conversation[]
  savedItems      SavedItem[]
  notes           ResearchNote[]
  sessions        ResearchSession[]
  auditLogs       AuditLog[]

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  lastLoginAt     DateTime?

  @@index([accountType])
  @@index([role])
  @@index([accountStatus])
}

model AuthIdentity {
  id                 String           @id @default(cuid())
  userId             String
  user               User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  type               AuthIdentityType
  provider           String
  providerSubjectId  String
  loginIdentifier    String?
  verifiedAt         DateTime?
  lastUsedAt         DateTime?

  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  @@unique([provider, providerSubjectId])
  @@index([userId])
  @@index([loginIdentifier])
  @@index([type])
}

model UserProfile {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  preferredName       String?
  state               String?
  readingLevel        Int?
  participantAlias    String?
  institutionUserCode String?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@index([state])
  @@index([institutionUserCode])
}

model UserPreference {
  id                  String   @id @default(cuid())
  userId              String   @unique
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  plainLanguageMode   Boolean  @default(true)
  highContrastMode    Boolean  @default(false)
  reducedMotion       Boolean  @default(false)
  largeText           Boolean  @default(false)
  screenReaderMode    Boolean  @default(false)
  preferredLanguage   String   @default("en")
  defaultReadingLevel Int      @default(6)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}

model Institution {
  id                    String          @id @default(cuid())
  name                  String
  type                  InstitutionType
  state                 String?
  timezone              String?
  externalReferenceCode String?
  active                Boolean         @default(true)

  memberships           InstitutionMembership[]
  staffProfiles         InstitutionalStaffProfile[]
  accessGroups          AccessGroup[]
  invites               InstitutionInvite[]
  managedCredentials    ManagedCredentialRecord[]
  devices               FacilityDevice[]
  auditLogs             AuditLog[]

  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  @@index([type])
  @@index([state])
  @@index([active])
}

model InstitutionMembership {
  id             String           @id @default(cuid())
  institutionId  String
  institution    Institution      @relation(fields: [institutionId], references: [id], onDelete: Cascade)

  userId         String
  user           User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  role           MembershipRole   @default(PARTICIPANT)
  status         MembershipStatus @default(INVITED)
  managedById    String?
  activatedAt    DateTime?
  suspendedAt    DateTime?
  endedAt        DateTime?

  groupLinks     AccessGroupMembership[]
  managedCredential ManagedCredentialRecord?

  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@unique([institutionId, userId])
  @@index([institutionId, status])
  @@index([userId])
  @@index([role])
}

model InstitutionalStaffProfile {
  id                String      @id @default(cuid())
  userId            String      @unique
  user              User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  institutionId     String
  institution       Institution @relation(fields: [institutionId], references: [id], onDelete: Cascade)

  jobTitle          String?
  canCreateUsers    Boolean     @default(false)
  canResetAccess    Boolean     @default(false)
  canManageGroups   Boolean     @default(false)
  canViewAnalytics  Boolean     @default(false)
  canViewPrivateData Boolean    @default(false)

  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  @@index([institutionId])
}

model AccessGroup {
  id             String      @id @default(cuid())
  institutionId  String
  institution    Institution @relation(fields: [institutionId], references: [id], onDelete: Cascade)

  name           String
  description    String?
  active         Boolean     @default(true)

  memberships    AccessGroupMembership[]

  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  @@unique([institutionId, name])
  @@index([institutionId])
}

model AccessGroupMembership {
  accessGroupId       String
  accessGroup         AccessGroup           @relation(fields: [accessGroupId], references: [id], onDelete: Cascade)

  membershipId        String
  membership          InstitutionMembership @relation(fields: [membershipId], references: [id], onDelete: Cascade)

  assignedAt          DateTime              @default(now())
  assignedById        String?

  @@id([accessGroupId, membershipId])
  @@index([membershipId])
}

model InstitutionInvite {
  id                String           @id @default(cuid())
  institutionId     String
  institution       Institution      @relation(fields: [institutionId], references: [id], onDelete: Cascade)

  inviteCodeHash    String           @unique
  intendedRole      MembershipRole   @default(PARTICIPANT)
  expiresAt         DateTime
  maxUses           Int              @default(1)
  useCount          Int              @default(0)
  createdById       String
  revokedAt         DateTime?

  createdAt         DateTime         @default(now())

  @@index([institutionId])
  @@index([expiresAt])
}

model ManagedCredentialRecord {
  id                  String                 @id @default(cuid())
  institutionId       String
  institution         Institution            @relation(fields: [institutionId], references: [id], onDelete: Cascade)

  membershipId        String                 @unique
  membership          InstitutionMembership  @relation(fields: [membershipId], references: [id], onDelete: Cascade)

  provider            String
  providerSubjectId   String
  credentialStatus    CredentialStatus       @default(PENDING_ACTIVATION)
  mustResetCredential Boolean                @default(true)
  issuedById          String
  issuedAt            DateTime               @default(now())
  lastResetAt         DateTime?
  revokedAt           DateTime?

  createdAt           DateTime               @default(now())
  updatedAt           DateTime               @updatedAt

  @@unique([provider, providerSubjectId])
  @@index([institutionId])
  @@index([credentialStatus])
}

model FacilityDevice {
  id                 String       @id @default(cuid())
  institutionId      String
  institution        Institution  @relation(fields: [institutionId], references: [id], onDelete: Cascade)

  name               String
  deviceType         DeviceType
  status             DeviceStatus @default(ACTIVE)
  deviceIdentifier   String       @unique
  locationLabel      String?
  lastCheckInAt      DateTime?
  configuration      Json?

  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  @@index([institutionId])
  @@index([status])
}

model LegalCase {
  id                  String       @id @default(cuid())
  userId              String
  user                User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  title               String
  description         String?
  state               String
  county              String?
  jurisdiction        String?
  courtName           String?
  caseNumberEncrypted String?
  convictionType      String?
  legalStage          LegalStage   @default(UNKNOWN)
  status              CaseStatus   @default(DRAFT)
  incidentDate        DateTime?
  convictionDate      DateTime?
  sentencingDate      DateTime?

  intakeSessions      IntakeSession[]
  roadmaps            ResearchRoadmap[]
  documents           Document[]
  conversations       Conversation[]
  notes               ResearchNote[]
  researchSessions    ResearchSession[]

  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt
  archivedAt          DateTime?

  @@index([userId])
  @@index([state])
  @@index([legalStage])
  @@index([status])
}

model IntakeSession {
  id            String         @id @default(cuid())
  caseId        String
  legalCase     LegalCase      @relation(fields: [caseId], references: [id], onDelete: Cascade)

  status        IntakeStatus   @default(NOT_STARTED)
  currentStep   Int            @default(1)
  totalSteps    Int?
  startedAt     DateTime?
  completedAt   DateTime?

  responses     IntakeResponse[]

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([caseId])
  @@index([status])
}

model IntakeResponse {
  id              String        @id @default(cuid())
  intakeSessionId String
  intakeSession   IntakeSession @relation(fields: [intakeSessionId], references: [id], onDelete: Cascade)

  questionKey     String
  questionText    String
  answerText      String?
  answerData      Json?
  stepNumber      Int
  skipped         Boolean       @default(false)

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@unique([intakeSessionId, questionKey])
  @@index([intakeSessionId, stepNumber])
}

model ResearchRoadmap {
  id                 String          @id @default(cuid())
  caseId             String
  legalCase          LegalCase       @relation(fields: [caseId], references: [id], onDelete: Cascade)

  title              String
  primaryQuestion    String
  summary            String?
  jurisdiction       String?
  status             RoadmapStatus   @default(DRAFT)
  progressPercentage Int             @default(0)
  generatedByModel   String?
  generationVersion  String?
  safetyReviewed     Boolean         @default(false)
  disclaimerAccepted Boolean         @default(false)

  steps              RoadmapStep[]
  sources            RoadmapSource[]
  conversations      Conversation[]
  notes              ResearchNote[]
  researchSessions   ResearchSession[]

  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt
  completedAt        DateTime?
  archivedAt         DateTime?

  @@index([caseId])
  @@index([status])
}

model RoadmapStep {
  id                   String             @id @default(cuid())
  roadmapId            String
  roadmap              ResearchRoadmap    @relation(fields: [roadmapId], references: [id], onDelete: Cascade)

  position             Int
  type                 RoadmapStepType
  title                String
  shortDescription     String?
  plainLanguageBody    String?
  whyItMatters         String?
  researchInstructions String?
  estimatedMinutes     Int?
  status               RoadmapStepStatus  @default(NOT_STARTED)
  confidenceLevel      ConfidenceLevel    @default(UNKNOWN)
  isRequired           Boolean            @default(true)

  parentStepId         String?
  parentStep           RoadmapStep?       @relation("RoadmapStepChildren", fields: [parentStepId], references: [id])
  childSteps           RoadmapStep[]      @relation("RoadmapStepChildren")

  sources              RoadmapStepSource[]
  notes                ResearchNote[]

  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
  completedAt          DateTime?

  @@unique([roadmapId, position])
  @@index([roadmapId, status])
  @@index([parentStepId])
}

model LegalSource {
  id                    String                    @id @default(cuid())
  sourceType            SourceType
  title                 String
  citation              String?
  court                 String?
  jurisdiction          String?
  state                 String?
  publishedDate         DateTime?
  effectiveDate         DateTime?
  url                   String?
  sourceProvider        String?
  fullText              String?
  plainLanguageSummary  String?
  verificationStatus    SourceVerificationStatus @default(UNVERIFIED)
  lastVerifiedAt        DateTime?
  checksum              String?

  roadmapLinks          RoadmapSource[]
  roadmapStepLinks      RoadmapStepSource[]
  messageCitations      MessageCitation[]
  savedItems            SavedItem[]
  notes                 ResearchNote[]

  createdAt             DateTime                  @default(now())
  updatedAt             DateTime                  @updatedAt

  @@index([sourceType])
  @@index([jurisdiction])
  @@index([state])
  @@index([citation])
  @@index([verificationStatus])
}

model RoadmapSource {
  roadmapId       String
  roadmap         ResearchRoadmap @relation(fields: [roadmapId], references: [id], onDelete: Cascade)

  legalSourceId   String
  legalSource     LegalSource     @relation(fields: [legalSourceId], references: [id], onDelete: Cascade)

  relevanceScore  Float?
  reasonIncluded  String?
  isPrimary       Boolean         @default(false)

  createdAt       DateTime        @default(now())

  @@id([roadmapId, legalSourceId])
  @@index([legalSourceId])
}

model RoadmapStepSource {
  roadmapStepId  String
  roadmapStep    RoadmapStep @relation(fields: [roadmapStepId], references: [id], onDelete: Cascade)

  legalSourceId  String
  legalSource    LegalSource @relation(fields: [legalSourceId], references: [id], onDelete: Cascade)

  relevanceScore Float?
  explanation    String?

  createdAt      DateTime    @default(now())

  @@id([roadmapStepId, legalSourceId])
  @@index([legalSourceId])
}

model Document {
  id                String         @id @default(cuid())
  caseId            String
  legalCase         LegalCase      @relation(fields: [caseId], references: [id], onDelete: Cascade)

  uploadedById      String
  title             String
  originalFileName  String
  storageKey        String
  mimeType          String
  fileSizeBytes     Int
  documentType      DocumentType   @default(OTHER)
  status            DocumentStatus @default(UPLOADED)
  extractedText     String?
  encrypted         Boolean        @default(true)

  analyses          DocumentAnalysis[]
  savedItems        SavedItem[]
  notes             ResearchNote[]

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
  deletedAt         DateTime?

  @@index([caseId])
  @@index([documentType])
  @@index([status])
}

model DocumentAnalysis {
  id                    String          @id @default(cuid())
  documentId            String
  document              Document        @relation(fields: [documentId], references: [id], onDelete: Cascade)

  summary               String?
  plainLanguageSummary  String?
  facts                 String?
  issue                 String?
  holding               String?
  reasoning             String?
  whyItMatters          String?
  extractedTerms        Json?
  extractedCitations    Json?
  confidenceLevel       ConfidenceLevel @default(UNKNOWN)
  modelName             String?
  promptVersion         String?
  safetyFlags           Json?

  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  @@index([documentId])
}

model Conversation {
  id                String           @id @default(cuid())
  userId            String
  user              User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  caseId            String?
  legalCase         LegalCase?       @relation(fields: [caseId], references: [id], onDelete: Cascade)

  roadmapId         String?
  roadmap           ResearchRoadmap? @relation(fields: [roadmapId], references: [id], onDelete: SetNull)

  title             String?
  type              ConversationType @default(GENERAL_RESEARCH)
  archived          Boolean          @default(false)

  messages          Message[]

  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt
  lastMessageAt     DateTime?

  @@index([userId])
  @@index([caseId])
  @@index([roadmapId])
}

model Message {
  id                String          @id @default(cuid())
  conversationId    String
  conversation      Conversation    @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  role              MessageRole
  content           String
  plainLanguageBody String?
  status            MessageStatus   @default(COMPLETED)
  confidenceLevel   ConfidenceLevel @default(UNKNOWN)
  intent            String?
  modelName         String?
  promptVersion     String?
  tokenCount        Int?
  safetyFlags       Json?
  refusalReason     String?

  citations         MessageCitation[]
  savedItems        SavedItem[]

  createdAt         DateTime        @default(now())

  @@index([conversationId, createdAt])
  @@index([status])
}

model MessageCitation {
  id              String      @id @default(cuid())
  messageId       String
  message         Message     @relation(fields: [messageId], references: [id], onDelete: Cascade)

  legalSourceId   String
  legalSource     LegalSource @relation(fields: [legalSourceId], references: [id], onDelete: Cascade)

  quotedText      String?
  sourceSection   String?
  relevanceScore  Float?
  verified        Boolean     @default(false)

  createdAt       DateTime    @default(now())

  @@unique([messageId, legalSourceId])
  @@index([legalSourceId])
}

model SavedItem {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  itemType        SavedItemType
  roadmapId       String?
  roadmapStepId   String?
  legalSourceId   String?
  messageId       String?
  documentId      String?

  legalSource     LegalSource?  @relation(fields: [legalSourceId], references: [id], onDelete: Cascade)
  message         Message?      @relation(fields: [messageId], references: [id], onDelete: Cascade)
  document        Document?     @relation(fields: [documentId], references: [id], onDelete: Cascade)

  title           String?
  userLabel       String?
  createdAt       DateTime      @default(now())

  @@index([userId])
  @@index([itemType])
  @@index([legalSourceId])
  @@index([messageId])
  @@index([documentId])
}

model ResearchNote {
  id              String           @id @default(cuid())
  userId          String
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  caseId          String?
  legalCase       LegalCase?       @relation(fields: [caseId], references: [id], onDelete: Cascade)

  roadmapId       String?
  roadmap         ResearchRoadmap? @relation(fields: [roadmapId], references: [id], onDelete: Cascade)

  roadmapStepId   String?
  roadmapStep     RoadmapStep?     @relation(fields: [roadmapStepId], references: [id], onDelete: Cascade)

  legalSourceId   String?
  legalSource     LegalSource?     @relation(fields: [legalSourceId], references: [id], onDelete: Cascade)

  documentId      String?
  document        Document?        @relation(fields: [documentId], references: [id], onDelete: Cascade)

  type            NoteType         @default(GENERAL)
  title           String?
  content         String

  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  @@index([userId])
  @@index([caseId])
  @@index([roadmapId])
}

model ResearchSession {
  id                String           @id @default(cuid())
  userId            String
  user              User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  caseId            String?
  legalCase         LegalCase?       @relation(fields: [caseId], references: [id], onDelete: Cascade)

  roadmapId         String?
  roadmap           ResearchRoadmap? @relation(fields: [roadmapId], references: [id], onDelete: Cascade)

  institutionId     String?
  deviceId          String?
  startedAt         DateTime         @default(now())
  endedAt           DateTime?
  durationSeconds   Int?
  actionsCompleted  Int              @default(0)

  @@index([userId])
  @@index([caseId])
  @@index([roadmapId])
  @@index([institutionId])
  @@index([startedAt])
}

model AuditLog {
  id              String       @id @default(cuid())
  userId          String?
  user            User?        @relation(fields: [userId], references: [id], onDelete: SetNull)

  institutionId   String?
  institution     Institution? @relation(fields: [institutionId], references: [id], onDelete: SetNull)

  action          AuditAction
  entityType      String?
  entityId        String?
  metadata        Json?
  ipHash          String?
  deviceId        String?
  userAgent       String?

  createdAt       DateTime     @default(now())

  @@index([userId])
  @@index([institutionId])
  @@index([action])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```

---

# Institutional Authentication Workflow

## Staff-Created Account Flow

```text
Authorized staff member signs in

↓

Staff selects Create Participant Account

↓

Staff enters minimum required information

↓

System creates a User record

↓

System creates an InstitutionMembership

↓

Authentication provider creates a managed identity

↓

Temporary credential or participant code is issued

↓

Credential status is marked RESET_REQUIRED or PENDING_ACTIVATION

↓

Participant signs in

↓

Participant accepts the educational disclaimer and privacy notice

↓

Participant creates a private research project
```

## Bulk Account Creation

Institutional administrators may upload a CSV containing approved participant identifiers.

The import should:

- Validate all records before creation.
- Reject duplicates.
- Avoid requiring personal email addresses.
- Generate institution-managed usernames or participant codes.
- Produce a staff-facing report of successful and failed account creations.
- Never include temporary passwords in long-term export files.
- Require credential rotation or reset after initial use.

## Credential Reset

Authorized staff may trigger a reset, but should not be able to view an existing password or PIN.

The system should:

- Generate a new temporary credential through the identity provider.
- Mark the account as `RESET_REQUIRED`.
- Record the action in the audit log.
- Revoke prior active sessions when appropriate.
- Avoid exposing private research data during the reset process.

---

# Institutional Roles and Permissions

## Participant

Can access:

- Their own profile
- Their own research projects
- Their own roadmaps
- Their own AI conversations
- Their own notes and saved items
- Assigned educational modules

Cannot access:

- Other participant accounts
- Institution-wide analytics
- Staff tools
- Credential-management tools

## Educator

May:

- Assign general educational modules
- View course-level completion
- See aggregated engagement data
- Help participants navigate the platform

Should not automatically see:

- Private legal questions
- AI conversation content
- Case-specific notes
- Uploaded documents

## Institutional Staff

May:

- Create or suspend institution-managed accounts
- Reset credentials
- Assign access groups
- Manage approved devices
- View operational account status

Should not automatically see private research content.

## Institutional Administrator

May:

- Manage staff permissions
- Configure institutional authentication
- Manage groups and devices
- Review aggregated analytics
- Review security audit events
- Configure retention and access policies

## System Administrator

May manage platform-level operations but should access user content only through tightly controlled, audited support procedures.

---

# Institutional Privacy Boundaries

The institutional dashboard should distinguish between:

## Operational Data

Staff may need access to:

- Account status
- Username or participant alias
- Membership group
- Last login time
- Credential reset status
- Assigned modules
- Completion percentage
- Device or kiosk status

## Private Research Data

Staff should not automatically access:

- User-entered facts
- Primary legal questions
- AI chat content
- Roadmap details
- Document contents
- Notes
- Saved authorities
- Search history

The system should follow a least-privilege model.

A database relationship between a user and an institution does not, by itself, grant the institution permission to view that user's private legal research.

---

# Model Details

## User

Stores the core application account.

Institution-managed users may not have an email address. Their login is represented through `AuthIdentity`.

Important fields include:

- `accountType`
- `role`
- `accountStatus`
- `displayName`

---

## AuthIdentity

Allows one user to authenticate through one or more providers.

Examples:

- Personal email
- Google
- Institution-issued username
- Participant code
- Facility single sign-on
- Kiosk session

`providerSubjectId` should contain the authentication provider's external identifier, not a password or secret.

---

## Institution

Represents the organization operating Institutional Mode.

Examples include:

- Correctional facility
- Department of Corrections
- Prison education program
- Law school clinic
- Legal aid organization

---

## InstitutionMembership

Connects a user to an institution and defines the user's institutional role and access status.

A user may potentially have more than one membership over time.

---

## InstitutionalStaffProfile

Stores staff-specific permissions.

Permissions should be explicit rather than inferred from a job title.

For example, a staff member may be allowed to create users but not view analytics.

`canViewPrivateData` should default to `false` and should require a separate policy decision before being enabled.

---

## AccessGroup

Allows an institution to organize participants.

Examples:

- Housing Unit A
- Legal Education Cohort
- Reentry Class
- Pilot Program
- Facility Library Users

Groups should organize access and assignments, not expose users' research to one another.

---

## InstitutionInvite

Supports enrollment codes and controlled self-activation.

Invite codes must be stored as hashes.

---

## ManagedCredentialRecord

Tracks institution-managed credential status without storing the credential itself.

The credential secret should remain with the authentication provider.

---

## FacilityDevice

Represents a managed computer, tablet, kiosk, or shared terminal.

Future deployments may use this model to enforce:

- Device allowlists
- Session time limits
- Restricted network policies
- Automatic logout
- Facility-safe configuration

---

# Demo Day Minimum Viable Schema

The Demo Day version should prioritize the main product experience and a believable Institutional Mode.

Minimum recommended models:

```text
User
AuthIdentity
Institution
InstitutionMembership
InstitutionalStaffProfile
ManagedCredentialRecord
UserPreference
LegalCase
IntakeSession
IntakeResponse
ResearchRoadmap
RoadmapStep
LegalSource
RoadmapStepSource
Conversation
Message
MessageCitation
SavedItem
ResearchNote
AuditLog
```

A simple Demo Day Institutional Mode may include:

- One sample institution
- One staff administrator account
- Three institution-managed participant accounts
- A staff screen for creating and suspending accounts
- A participant login using a facility-issued username
- Aggregated usage totals
- No staff access to private research content

---

# Recommended Demo Flow

```text
Institutional staff member signs in

↓

Staff creates a participant account

↓

System issues a temporary username and access code

↓

Participant signs in without a personal email

↓

Participant accepts the disclaimer

↓

Participant completes guided intake

↓

AI generates a private research roadmap

↓

Verified sources are linked to roadmap steps

↓

Participant asks a follow-up question

↓

AI response and citations are saved

↓

Staff dashboard shows only account status and aggregated progress
```

---

# Data Privacy Requirements

The database must follow data-minimization principles.

## Never store in plaintext

- Passwords
- PINs
- Temporary access codes
- Authentication tokens
- API keys
- Full correctional identification numbers
- Social Security numbers
- Payment information
- Document encryption keys

## Encrypt or tokenize

- Case numbers
- Institution-issued identifiers when sensitive
- Uploaded legal documents
- Sensitive personal identifiers
- Restricted operational metadata

## Allow individual users to

- Delete AI conversations when policy permits
- Delete uploaded documents
- Archive research projects
- Clear saved research
- Request an export
- Review privacy notices

Institutional retention restrictions must be clearly disclosed before use.

---

# Authorization Rules

Every database query must verify:

1. The authenticated user's identity
2. Ownership of the requested record
3. Institutional role, when relevant
4. Explicit permission for the requested action

An institution-managed participant may access only their own private research data.

Staff permissions should be scoped separately for:

- Account management
- Credential resets
- Group management
- Device management
- Aggregated analytics
- Private content access

Private content access must never be implied by general administrative access.

---

# Audit Requirements

Audit logs should record:

- Staff account creation
- Participant account creation
- Credential issuance
- Credential reset
- Account suspension
- Role changes
- Group assignment
- Device registration
- Login attempts
- Data exports
- Private-content access, when permitted
- AI safety refusals
- Administrative policy changes

Audit metadata should avoid copying full legal questions, AI responses, or document contents.

---

# Source Integrity Rules

The AI should:

- Prefer verified official sources
- Store jurisdiction and effective dates
- Record when a source was last checked
- Reject fabricated citations
- Warn when law may be outdated
- Link each legal claim to supporting authority where possible

Institutional Mode must not weaken source-verification requirements.

---

# Retention Rules

Suggested defaults:

| Data Type | Suggested Retention |
|---|---:|
| Active individual account data | Until account deletion |
| Active institutional account data | For the authorized enrollment period |
| Suspended institutional accounts | According to institutional policy |
| Revoked credentials | Metadata only for audit purposes |
| Deleted documents | Remove within 30 days |
| Temporary upload files | Delete after processing |
| Failed uploads | Delete within 24 hours |
| AI conversations | User-controlled where policy permits |
| Security audit logs | Based on contractual and legal requirements |

Final retention rules must be reviewed before deployment with a correctional institution.

---

# Seed Data

Development and demonstration seed data should include:

- One sample correctional institution
- One institution administrator
- One education staff member
- Three institution-managed participants
- One individual-mode user
- One access group
- One managed device
- One sample research project
- One completed intake
- One generated roadmap
- Several verified legal sources
- One AI conversation
- Several saved items

Never use real incarcerated individuals' legal or identifying data in development or demonstrations.

---

# Database Success Criteria

The schema is successful when:

- Individuals can use CaseCompass without institutional involvement.
- Institutional staff can securely issue and manage access.
- Participants do not need personal email accounts.
- Staff cannot automatically read participants' private legal research.
- Every roadmap remains linked to its intake context.
- AI messages can be linked to verified sources.
- Institutional analytics can be aggregated and de-identified.
- Sensitive credentials are handled outside the application database.
- Administrative actions are auditable.
- The schema can support future facility pilots without rebuilding the product.

---

# Database Design Principle

> **CaseCompass AI should give institutions the tools to manage access without giving them unnecessary access to a participant's private legal research. Authentication may be institution-managed, but the user's learning journey must remain protected, purpose-limited, and governed by clear permissions.**