export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const users = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { username: 'asc' }],
  })

  return users.map(publicUser)
})
