/*
  Warnings:

  - You are about to drop the column `latMessageId` on the `Channel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Channel" DROP COLUMN "latMessageId",
ADD COLUMN     "lastMessageId" INTEGER;
