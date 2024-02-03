import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query'],
})

async function createPostIfUserAndCompanyExist(
  userId: number,
  companyId: number,
  postData: { title: string; body: string },
) {
  // Start the transaction
  return await prisma.$transaction(async (transaction) => {
    // Check if the user exists and is part of the company

    // TODO: Code Example 1
    const userExists = await transaction.user.findUnique({
      where: { id: userId, company_users: { some: { company_id: companyId } } },
    })
    // Generates the following SQL:
    // SELECT "public"."User"."id", "public"."User"."name", "public"."User"."email", "public"."User"."created_at", "public"."User"."updated_at", "public"."User"."deleted_at"
    // FROM "public"."User" WHERE ("public"."User"."id" = $1
    // AND ("public"."User"."id") IN (SELECT "t1"."user_id" FROM "public"."CompanyUser" AS "t1"
    // WHERE ("t1"."company_id" = $2 AND "t1"."user_id" IS NOT NULL))) LIMIT $3 OFFSET $4

    // If both user and company exist, create a new post
    if (!userExists) {
      throw new Error('User or Company does not exist')
    }

    return await transaction.posts.create({
      data: {
        title: postData.title,
        body: postData.body,
        published: false,
        author_id: userId,
      },
    })
  })
}

async function run() {
  const user = await prisma.user.findFirst({
    include: {
      company_users: {
        include: {
          company: true,
        },
      },
    },
  })

  if (!user) {
    throw new Error('User does not exist')
  }

  const userId = user?.id
  const companyId = user?.company_users[0].id

  if (!userId || !companyId) {
    throw new Error('User or Company does not exist')
  }
  console.log(`Company Name: ${user?.company_users[0].company.name}`)
  console.log(`User ID: ${userId}, Company ID: ${companyId}`)

  try {
    // Attempt to create the post
    const post = await createPostIfUserAndCompanyExist(userId, companyId, {
      title: 'New Post',
      body: 'This is the body of the new post',
    })
    console.log('Post created:')
    console.table([post])
  } catch (error) {
    // Log any errors that occur
    console.error('Error: ', error)
  }
}

// Execute the function
run()
