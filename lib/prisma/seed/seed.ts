import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const subjects = [
  "国語",
  "理科",
  "社会",
  "算数",
  "音楽",
  "体育",
  "図工",
];

async function main() {
  console.log("Seeding...");

  // 科目のシードデータを追加
  console.log("Creating subjects...");
  for (const subjectName of subjects) {
    const existingSubject = await prisma.subject.findFirst({
      where: { name: subjectName },
    });

    if (!existingSubject) {
      await prisma.subject.create({
        data: {
          name: subjectName,
        },
      });
      console.log(`Created subject: ${subjectName}`);
    } else {
      console.log(`Subject already exists: ${subjectName}`);
    }
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
