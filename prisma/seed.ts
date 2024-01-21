import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Upsert a company
  const company = await prisma.company.upsert({
    where: {
      name: 'Acme Corporation', // Unique identifier for the company
    },
    update: {},
    create: {
      name: 'Acme Corporation',
    },
  })

  // Upsert a user
  const user = await prisma.user.upsert({
    where: {
      email: 'john.doe@example.com', // Unique identifier for the user
    },
    update: {},
    create: {
      name: 'John Doe',
      email: 'john.doe@example.com',
    },
  })

  // Upsert association between user and company
  await prisma.companyUser.upsert({
    where: {
      company_id_user_id: {
        // Unique composite identifier for the companyUser
        company_id: company.id,
        user_id: user.id,
      },
    },
    update: {
      role: 'Employee', // Update if needed
    },
    create: {
      company: {
        connect: { id: company.id },
      },
      user: {
        connect: { id: user.id },
      },
      role: 'Employee',
    },
  })

  console.log('Seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
