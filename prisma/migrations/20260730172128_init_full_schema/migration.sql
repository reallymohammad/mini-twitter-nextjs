/*
  Warnings:

  - A unique constraint covering the columns `[userId,order]` on the table `PinnedPost` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('POST', 'REPLY', 'RETWEET', 'QUOTE');

-- DropIndex
DROP INDEX "Post_authorId_idx";

-- DropIndex
DROP INDEX "Post_createdAt_idx";

-- DropIndex
DROP INDEX "Post_parentPostId_idx";

-- DropIndex
DROP INDEX "Post_retweetOfId_idx";

-- AlterTable
ALTER TABLE "PinnedPost" ALTER COLUMN "order" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "type" "PostType" NOT NULL DEFAULT 'POST';

-- CreateIndex
CREATE UNIQUE INDEX "PinnedPost_userId_order_key" ON "PinnedPost"("userId", "order");

-- CreateIndex
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_parentPostId_createdAt_idx" ON "Post"("parentPostId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_retweetOfId_createdAt_idx" ON "Post"("retweetOfId", "createdAt" DESC);
