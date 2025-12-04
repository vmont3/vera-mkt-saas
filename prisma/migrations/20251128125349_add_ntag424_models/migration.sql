-- CreateTable
CREATE TABLE "NTAG424Tag" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "linkedSubjectId" TEXT,
    "partnerAssetId" TEXT,
    "masterHashVaultKey" TEXT NOT NULL,
    "hashTruncated" TEXT NOT NULL,
    "truncatedBits" INTEGER NOT NULL DEFAULT 128,
    "configId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_ENCODING',
    "lastAcceptedCtr" INTEGER NOT NULL DEFAULT 0,
    "encodedAt" TIMESTAMP(3),
    "encodedBy" TEXT,
    "encoderStationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NTAG424Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NTAG424Config" (
    "id" TEXT NOT NULL,
    "keyAppSecretArn" TEXT NOT NULL,
    "keySdmSecretArn" TEXT NOT NULL,
    "keyNdefSecretArn" TEXT,
    "keyProtSecretArn" TEXT,
    "keyAuthSecretArn" TEXT,
    "randomIdEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lrpModeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sdmUrlTemplate" TEXT NOT NULL,
    "sdmEncOffset" INTEGER NOT NULL,
    "sdmEncLength" INTEGER NOT NULL,
    "sdmReadCtrOffset" INTEGER NOT NULL,
    "sdmMacOffset" INTEGER NOT NULL,
    "sdmMacInputOffset" INTEGER NOT NULL,
    "ndefFileSize" INTEGER NOT NULL DEFAULT 256,
    "protFileSize" INTEGER NOT NULL DEFAULT 128,
    "configVersion" TEXT NOT NULL DEFAULT '1.0',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NTAG424Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncoderQueue" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "subjectId" TEXT,
    "partnerAssetId" TEXT,
    "masterHashVaultKey" TEXT NOT NULL,
    "hashTruncated" TEXT NOT NULL,
    "sdmPayload" JSONB NOT NULL,
    "stationId" TEXT,
    "operatorId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "tagId" TEXT,
    "encodedUid" TEXT,
    "errorMessage" TEXT,
    "technicalLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "EncoderQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncoderStation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'ACR122U',
    "serialNumber" TEXT,
    "location" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "lastHeartbeat" TIMESTAMP(3),
    "offlineDbPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EncoderStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagVerificationLog" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "sdmReadCtr" INTEGER NOT NULL,
    "uidFromTag" TEXT NOT NULL,
    "hashTruncated" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "macProvided" TEXT NOT NULL,
    "macCalculated" TEXT NOT NULL,
    "macValid" BOOLEAN NOT NULL,
    "deviceId" TEXT,
    "appId" TEXT,
    "ipAddress" TEXT,
    "geoLocation" JSONB,
    "userAgent" TEXT,
    "isOfflineSync" BOOLEAN NOT NULL DEFAULT false,
    "offlineTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagVerificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "tagId" TEXT,
    "subjectId" TEXT,
    "partnerAssetId" TEXT,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reportedBy" TEXT,
    "originType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "ownerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "attachments" JSONB,
    "incidentDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncidentAudit" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "authorityOrg" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "officialProtocol" TEXT,
    "externalRefs" JSONB,
    "submittedBy" TEXT,
    "notes" TEXT,
    "attachments" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "IncidentAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NTAG424Tag_uid_key" ON "NTAG424Tag"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "EncoderQueue_tagId_key" ON "EncoderQueue"("tagId");

-- CreateIndex
CREATE INDEX "EncoderQueue_status_priority_idx" ON "EncoderQueue"("status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "EncoderStation_serialNumber_key" ON "EncoderStation"("serialNumber");

-- CreateIndex
CREATE INDEX "TagVerificationLog_tagId_sdmReadCtr_idx" ON "TagVerificationLog"("tagId", "sdmReadCtr");

-- CreateIndex
CREATE INDEX "TagVerificationLog_status_idx" ON "TagVerificationLog"("status");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_type_idx" ON "Incident"("type");

-- CreateIndex
CREATE INDEX "IncidentAudit_incidentId_idx" ON "IncidentAudit"("incidentId");

-- AddForeignKey
ALTER TABLE "NTAG424Tag" ADD CONSTRAINT "NTAG424Tag_linkedSubjectId_fkey" FOREIGN KEY ("linkedSubjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NTAG424Tag" ADD CONSTRAINT "NTAG424Tag_partnerAssetId_fkey" FOREIGN KEY ("partnerAssetId") REFERENCES "PartnerAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NTAG424Tag" ADD CONSTRAINT "NTAG424Tag_configId_fkey" FOREIGN KEY ("configId") REFERENCES "NTAG424Config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NTAG424Tag" ADD CONSTRAINT "NTAG424Tag_encoderStationId_fkey" FOREIGN KEY ("encoderStationId") REFERENCES "EncoderStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncoderQueue" ADD CONSTRAINT "EncoderQueue_configId_fkey" FOREIGN KEY ("configId") REFERENCES "NTAG424Config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncoderQueue" ADD CONSTRAINT "EncoderQueue_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncoderQueue" ADD CONSTRAINT "EncoderQueue_partnerAssetId_fkey" FOREIGN KEY ("partnerAssetId") REFERENCES "PartnerAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncoderQueue" ADD CONSTRAINT "EncoderQueue_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "EncoderStation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncoderQueue" ADD CONSTRAINT "EncoderQueue_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagVerificationLog" ADD CONSTRAINT "TagVerificationLog_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "NTAG424Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "NTAG424Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_partnerAssetId_fkey" FOREIGN KEY ("partnerAssetId") REFERENCES "PartnerAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAudit" ADD CONSTRAINT "IncidentAudit_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentAudit" ADD CONSTRAINT "IncidentAudit_submittedBy_fkey" FOREIGN KEY ("submittedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
