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
    // Check if the user exists
    const userExists = await transaction.user.findUnique({
      where: { id: userId },
    })

    // Check if the company exists
    const companyExists = await transaction.company.findUnique({
      where: { id: companyId },
    })

    // If both user and company exist, create a new post
    if (userExists && companyExists) {
      return await transaction.posts.create({
        data: {
          title: postData.title,
          body: postData.body,
          published: false,
          author_id: userId,
        },
      })
    } else {
      // If user or company doesn't exist, throw an error
      throw new Error('User or Company does not exist')
    }
  })
}

async function run() {
  const user = await prisma.user.findUnique({
    where: { email: 'john.doe@example.com' },
    include: {
      company_users: {
        include: {
          company: true,
        },
      },
    },
  })

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
