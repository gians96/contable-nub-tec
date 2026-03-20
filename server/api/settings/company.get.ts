
export default defineEventHandler(async () => {
  let company = await prisma.companySettings.findFirst()
  if (!company) {
    company = await prisma.companySettings.create({ data: {} })
  }
  return company
})
