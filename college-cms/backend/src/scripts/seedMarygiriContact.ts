import 'dotenv/config'
import { client, db } from '../db/index.js'
import { collegeContact } from '../db/schema.js'

async function main() {
  const [row] = await db
    .insert(collegeContact)
    .values({
      id: 1,
      collegeName: 'Marygiri College of Arts and Science',
      address: 'Koothattukulam, Ernakulam District, Kerala – 686662',
      phone: '+91 485 225 0079',
      email: 'marygiricollege@gmail.com',
    })
    .onConflictDoUpdate({
      target: collegeContact.id,
      set: {
        collegeName: 'Marygiri College of Arts and Science',
        address: 'Koothattukulam, Ernakulam District, Kerala – 686662',
        phone: '+91 485 225 0079',
        email: 'marygiricollege@gmail.com',
      },
    })
    .returning()
  console.log('Saved contact:', row)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await client.end()
  })
