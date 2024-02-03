const { Client } = require('pg') // PostgreSQL client

const client = new Client({
  connectionString: process.env.DATABASE_URL,
})

client.connect()

async function createPostIfUserAndCompanyExist(
  userId: number,
  companyId: number,
  postData: { title: string; body: string },
) {
  try {
    // Start the transaction
    await client.query('BEGIN')

    // Check that the user and company exist
    // TODO: Code Example 2
    const query = `
      SELECT cu.user_id, cu.company_id
      FROM "CompanyUser" AS cu
      WHERE cu.user_id = $1 AND cu.company_id = $2;
    `

    const result = await client.query(query, [userId, companyId])
    if (
      result.rows.length === 0 ||
      result.rows[0].user_id == null ||
      result.rows[0].company_id == null
    ) {
      throw new Error('User or Company does not exist')
    }

    const insertPostResult = await client.query(
      `
      INSERT INTO "Posts" (title, body, published, author_id, updated_at) 
      VALUES ($1, $2, $3, $4, NOW()) RETURNING *
      `,
      [postData.title, postData.body, false, userId],
    )

    // Commit the transaction
    await client.query('COMMIT')

    return insertPostResult.rows[0]
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK')
    throw error
  }
}

async function addAPost() {
  try {
    // Grab the first User with a company ID
    const query = `
      SELECT u.id AS user_id, c.id AS company_id, c.name AS company_name
      FROM "User" u
      JOIN "CompanyUser" cu ON u.id = cu.user_id
      JOIN "Company" c ON cu.company_id = c.id
      ORDER BY u.id
      LIMIT 1;
    `
    const res = await client.query(query)
    if (res.rows.length === 0) {
      throw new Error('No user found')
    }

    const userId = res.rows[0].user_id
    const companyId = res.rows[0].company_id

    if (!userId || !companyId) {
      throw new Error('User or Company does not exist')
    }

    console.log('Selecting User and Company')
    console.table(res.rows)

    // Attempt to create the post
    console.log('Attempting to create a post')
    const post = await createPostIfUserAndCompanyExist(userId, companyId, {
      title: 'New Post',
      body: 'This is the body of the new post',
    })
    if (post) {
      console.log('Post created successfully')
      console.table([post])
    }
  } catch (error) {
    // Log any errors that occur
    console.error('Error:', error)
  }
}

async function runCTEQuery() {
  console.log('Example of using a CTE to count the top poster per month')

  // TODO: Code Example 3
  // In a real-world application I'd generate the Months table on some kind of job schedule
  // Here I'm just using a temporary table to keep the example simple
  const query = `
    DO $$
    DECLARE
        i int;
    BEGIN
        CREATE TEMP TABLE Months (month_id int, month_start timestamp);

        FOR i IN 1..12 LOOP
            INSERT INTO Months (month_id, month_start) VALUES 
                (i, 
                make_date(EXTRACT(year FROM current_date)::int, i, 1));
        END LOOP;
    END $$;

    WITH MonthlyPostCounts AS (
      SELECT
        m.month_id,
        m.month_start,
        u.id AS user_id,
        COUNT(p.id) AS post_count,
        DENSE_RANK() OVER (PARTITION BY m.month_id ORDER BY COUNT(p.id) DESC) AS rank
      FROM
        Months m
      LEFT JOIN
        "Posts" p ON DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', m.month_start)
      LEFT JOIN
        "User" u ON p.author_id = u.id
      GROUP BY
        m.month_id, m.month_start, u.id
    )
    SELECT
      m.month_start,
      mp.user_id,
      u.name AS user_name,
      mp.post_count AS post_count
    FROM
      Months m
    LEFT JOIN
      MonthlyPostCounts mp ON m.month_id = mp.month_id AND mp.rank = 1
    LEFT JOIN
      "User" u ON mp.user_id = u.id
    ORDER BY
      m.month_id;
  `
  const results = await client.query(query)

  console.log(`Results: ${results[1].rowCount}`)
  console.table(results[1].rows)
}

// Execute the function
addAPost()
  .then(() => runCTEQuery())
  .catch((e) => console.error(e))
  .finally(() => client.end())
