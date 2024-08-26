/*
  Warnings:

  - You are about to drop the column `lastMessageId` on the `Channel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "lastMessageId",
ADD COLUMN     "lastMessageDate" DATE;
