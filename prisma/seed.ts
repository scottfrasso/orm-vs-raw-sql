import { Prisma, PrismaClient } from '@prisma/client'
import * as _ from 'lodash'
import { faker } from '@faker-js/faker'
import moment from 'moment'

const prisma = new PrismaClient()

function getRandomDateInMonth(month: number): Date {
  const currentDate = new Date()
  const year = currentDate.getFullYear()

  const randomDay =
    Math.floor(
      Math.random() * moment(`${year}-${month + 1}`, 'YYYY-M').daysInMonth(),
    ) + 1
  return moment(`${year}-${month + 1}-${randomDay}`, 'YYYY-M-D').toDate()
}

async function main() {
  // Upsert some companies
  const companyCount = await prisma.company.count()
  if (companyCount < 10) {
    console.log('Seeding some companies')
    const fakeCompanyName: string = faker.company.name()

    await prisma.company.upsert({
      where: {
        name: fakeCompanyName, // Unique identifier for the company
      },
      update: {},
      create: {
        name: fakeCompanyName,
      },
    })
  }

  const companies = await prisma.company.findMany()

  const userCount = await prisma.user.count()
  if (userCount < 100) {
    for (let i = 0; i < 20; i++) {
      const company = _.sample(companies)
      if (!company) {
        throw new Error('Company does not exist')
      }
      const fakeEmail = faker.internet.email()
      const fakeName = faker.person.fullName()

      // Upsert a user
      const user = await prisma.user.upsert({
        where: {
          email: fakeEmail, // Unique identifier for the user
        },
        update: {},
        create: {
          name: fakeName,
          email: fakeEmail,
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
    }
  }

  const postCount = await prisma.posts.count()
  if (postCount > 5000) {
    console.log('Over 1k posts, skipping seeding')
    return
  }
  const users = await prisma.user.findMany()

  for (let i = 0; i < 12; i++) {
    const user = _.sample(users)
    if (!user) {
      throw new Error('User does not exist')
    }

    const fakeCreatedAtDate = getRandomDateInMonth(i)
    const fakeCount = _.random(5, 100)

    console.log(
      `Seeding ${fakeCount} posts for user ${user.id} in month ${i + 1}`,
    )

    const fakeData: Prisma.PostsCreateManyInput[] = []
    for (let j = 0; j < fakeCount; j++) {
      const fakeTitle = faker.lorem.sentence()
      const fakeBody = faker.lorem.paragraph()
      fakeData.push({
        title: fakeTitle,
        body: fakeBody,
        published: true,
        author_id: user.id,
        created_at: fakeCreatedAtDate,
      } as Prisma.PostsCreateManyInput)
    }

    await prisma.posts.createMany({
      data: fakeData,
    })
  }

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
