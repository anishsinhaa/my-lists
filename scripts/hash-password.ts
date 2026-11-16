import bcrypt from 'bcryptjs'

const password = process.argv[2]
if (password === undefined || password.length === 0) {
  console.error('Usage: npm run hash -- "your-password"')
  console.error('Store the hash single-quoted in AUTH_PASSWORD_HASH because it contains $ characters.')
  process.exit(1)
}

console.log(bcrypt.hashSync(password, 12))
console.error('Store the hash single-quoted in AUTH_PASSWORD_HASH because it contains $ characters.')
